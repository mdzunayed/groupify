import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

const require = createRequire(import.meta.url);
const { AccountAuthorizationService } = require("../dist/accounts/account-authorization.service.js");
const { CommunityCreationService } = require("../dist/communities/community-creation.service.js");
const { CommunityAuthorizationService } = require("../dist/communities/community-authorization.service.js");
const migration = require("../migrations/1794675600000_community_creation.cjs");
let admin;
let accountId;
let service;
let management;
let accounts;
let communities;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
});
after(async () => { await admin?.end(); });
async function fixtureAccount() {
  const id = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
  accounts.add(id);
  return id;
}
beforeEach(async () => {
  accounts = new Set();
  communities = new Set();
  accountId = await fixtureAccount();
  const identity = { provider: "clerk", issuer: "https://community-fixture.example.test", subject: `user_fixture_${accountId}`, sessionId: "sess_fixture" };
  await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)",
    [accountId, identity.provider, identity.issuer, identity.subject]);
  const authorization = new AccountAuthorizationService({ verifyBearer: async () => identity });
  service = new CommunityCreationService(authorization);
  management = new CommunityAuthorizationService(authorization);
});
afterEach(async () => {
  await admin.query("DELETE FROM community_memberships WHERE community_id = ANY($1::uuid[])", [[...communities]]);
  await admin.query("DELETE FROM communities WHERE id = ANY($1::uuid[])", [[...communities]]);
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [[...accounts]]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [[...accounts]]);
});
async function create(name = "Weekend riders") {
  const result = await service.create("fixture", name);
  communities.add(result.id);
  return result;
}
async function communityCount() {
  return (await admin.query("SELECT count(*)::int AS count FROM communities")).rows[0].count;
}

test("community creation commits the verified account as its initial Leader", async () => {
  const community = await create();
  assert.ok(Object.isFrozen(community));
  assert.equal(community.role, "Leader");
  const row = (await admin.query(`SELECT c.name, c.created_by, m.account_id, m.role FROM communities c
    JOIN community_memberships m ON m.community_id = c.id WHERE c.id = $1`, [community.id])).rows;
  assert.deepEqual(row, [{ name: community.name, created_by: accountId, account_id: accountId, role: "Leader" }]);
});

test("community names normalize Unicode and count code points consistently with PostgreSQL", async () => {
  assert.equal((await create("  Cafe\u0301 riders  ")).name, "Café riders");
  const emoji = await create("🚲".repeat(100));
  assert.equal((await admin.query("SELECT char_length(name) AS length FROM communities WHERE id = $1", [emoji.id])).rows[0].length, 100);
  const literal = "Group'); DROP TABLE communities; --";
  assert.equal((await create(literal)).name, literal);
});

test("invalid names produce no community or membership writes", async () => {
  const before = await communityCount();
  for (const name of [undefined, null, {}, "", "   ", "🚲".repeat(101), "Group\nname", "Group\u0085name"]) {
    await assert.rejects(service.create("fixture", name), (error) => error.getStatus() === 400);
  }
  assert.equal(await communityCount(), before);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE account_id = $1", [accountId])).rows[0].count, 0);
});

test("an externally verified but deactivated account cannot create communities", async () => {
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountId]);
  await assert.rejects(create(), (error) => error.getStatus() === 403);
  assert.equal(await communityCount(), 0);
});

test("one account may create multiple independent communities", async () => {
  const first = await create();
  const second = await create();
  assert.notEqual(first.id, second.id);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE account_id = $1 AND role = 'Leader'", [accountId])).rows[0].count, 2);
});

test("membership constraints admit exactly the three approved role names", async () => {
  const community = await create();
  for (const role of ["Co-leader", "Member"]) {
    await admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, $3)", [community.id, await fixtureAccount(), role]);
  }
  const extra = await fixtureAccount();
  for (const role of ["Owner", "Admin", "leader", ""]) {
    await assert.rejects(admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, $3)", [community.id, extra, role]), (error) => error.code === "23514");
  }
});

test("failure to insert the Leader membership rolls back community creation", async () => {
  const before = await communityCount();
  await admin.query("ALTER TABLE community_memberships ADD CONSTRAINT fixture_reject_leader CHECK (role <> 'Leader') NOT VALID");
  try {
    await assert.rejects(create(), (error) => error.getStatus() === 503 && error.cause === undefined);
  } finally {
    await admin.query("ALTER TABLE community_memberships DROP CONSTRAINT fixture_reject_leader");
  }
  assert.equal(await communityCount(), before);
});

test("populated community rollback refuses to discard community and membership data", async () => {
  const community = await create();
  let sql;
  migration.down({ sql: (value) => { sql = value; } });
  await admin.query("BEGIN");
  try {
    await assert.rejects(admin.query(sql), (error) => error.code === "P0001" && error.message === "Community rollback requires empty tables");
  } finally {
    await admin.query("ROLLBACK");
  }
  assert.equal((await admin.query("SELECT role FROM community_memberships WHERE community_id = $1", [community.id])).rows[0].role, "Leader");
});

async function deniedManagement(communityId, capability, status = 403) {
  let called = false;
  await assert.rejects(management.withManagementCapability("fixture", communityId, capability, async () => { called = true; }), (error) => error.getStatus() === status);
  assert.equal(called, false);
}

test("the approved management capability matrix uses the current community role", async () => {
  const community = await create();
  const all = ["manage_roles", "manage_membership", "manage_rides", "manage_invitations"];
  for (const [role, grants] of [["Leader", all], ["Co-leader", ["manage_rides", "manage_invitations"]], ["Member", []]]) {
    await admin.query("UPDATE community_memberships SET role = $1 WHERE community_id = $2 AND account_id = $3", [role, community.id, accountId]);
    for (const capability of all) {
      if (!grants.includes(capability)) { await deniedManagement(community.id, capability); continue; }
      const value = await management.withManagementCapability("fixture", community.id, capability, async (client, context) => {
        assert.deepEqual(context, { accountId, communityId: community.id, role });
        assert.ok(Object.isFrozen(context));
        assert.equal((await client.query("SELECT id FROM communities WHERE id = $1", [context.communityId])).rows[0].id, community.id);
        return "authorized";
      });
      assert.equal(value, "authorized");
    }
  }
});

test("a Leader in one community cannot borrow that role in another community", async () => {
  const own = await create();
  const otherCreator = await fixtureAccount();
  const other = (await admin.query("INSERT INTO communities (name, created_by) VALUES ('Other fixture', $1) RETURNING id", [otherCreator])).rows[0].id;
  communities.add(other);
  await admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, 'Leader'), ($1, $3, 'Member')", [other, otherCreator, accountId]);
  await management.withManagementCapability("fixture", own.id, "manage_invitations", async () => undefined);
  await deniedManagement(other, "manage_invitations");
  await deniedManagement("00000000-0000-4000-8000-000000000001", "manage_invitations");
});

test("unknown capabilities and ride/location actions never inherit community management permissions", async () => {
  const community = await create();
  for (const capability of [undefined, null, {}, "unknown", "speak", "chat", "trigger_sos", "view_live_location"]) {
    await deniedManagement(community.id, capability);
  }
});

test("creator metadata cannot replace current membership or active-account checks", async () => {
  const community = await create();
  await admin.query("DELETE FROM community_memberships WHERE community_id = $1 AND account_id = $2", [community.id, accountId]);
  await deniedManagement(community.id, "manage_roles");
  await admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, 'Leader')", [community.id, accountId]);
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountId]);
  await deniedManagement(community.id, "manage_roles");
});

test("invalid resource IDs fail safely and UUID spelling does not change the canonical context", async () => {
  const community = await create();
  for (const id of [undefined, {}, "", "private-fixture-marker", `${community.id}' OR TRUE --`, `${community.id}\n`]) {
    await deniedManagement(id, "manage_roles", 400);
  }
  const id = await management.withManagementCapability("fixture", community.id.toUpperCase(), "manage_roles", async (_client, context) => context.communityId);
  assert.equal(id, community.id);
});

test("management operations hold the membership lock through role revocation or removal", async () => {
  const community = await create();
  for (const sql of [
    "UPDATE community_memberships SET role = 'Member' WHERE community_id = $1 AND account_id = $2",
    "DELETE FROM community_memberships WHERE community_id = $1 AND account_id = $2",
  ]) {
    const writer = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await writer.connect();
    const pid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    let enter;
    let release;
    const entered = new Promise((resolve) => { enter = resolve; });
    const barrier = new Promise((resolve) => { release = resolve; });
    const operation = management.withManagementCapability("fixture", community.id, "manage_roles", async () => { enter(); await barrier; return "finished"; });
    operation.catch(() => undefined);
    let change;
    try {
      await Promise.race([entered, operation]);
      let settled = false;
      change = writer.query(sql, [community.id, accountId]).finally(() => { settled = true; });
      change.catch(() => undefined);
      let waiting = false;
      const deadline = Date.now() + 1800;
      while (!settled && Date.now() < deadline) {
        const state = (await admin.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1", [pid])).rows[0];
        if (state?.wait_event_type === "Lock") { waiting = true; break; }
        await delay(10);
      }
      assert.ok(waiting, "PostgreSQL must confirm membership changes wait for the authorized transaction");
      release();
      assert.equal(await operation, "finished");
      await change;
      await deniedManagement(community.id, "manage_roles");
    } finally {
      release();
      await operation.catch(() => undefined);
      await change?.catch(() => undefined);
      await writer.end();
      await admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, 'Leader') ON CONFLICT (community_id, account_id) DO UPDATE SET role = 'Leader'", [community.id, accountId]);
    }
  }
});
