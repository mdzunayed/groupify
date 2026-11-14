import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { UnauthorizedException } from "@nestjs/common";
import pg from "pg";

const require = createRequire(import.meta.url);
const { AccountAuthorizationService } = require("../dist/accounts/account-authorization.service.js");
const { CommunityCreationService } = require("../dist/communities/community-creation.service.js");
const { CommunityAuthorizationService } = require("../dist/communities/community-authorization.service.js");
const { RideCreationService } = require("../dist/rides/ride-creation.service.js");
const migration = require("../migrations/1794690000000_ride_drafts.cjs");
let admin;
let accounts;
let communities;
let identities;
let community;
let leader;
let coLeader;
let member;
let creation;
let management;
let rides;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
});
after(async () => { await admin?.end(); });
async function fixtureAccount(token) {
  const id = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
  accounts.add(id);
  const identity = { provider: "clerk", issuer: "https://ride-fixture.example.test", subject: `user_fixture_${id}`, sessionId: "sess_fixture" };
  identities.set(token, identity);
  await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)",
    [id, identity.provider, identity.issuer, identity.subject]);
  return id;
}
async function fixtureCommunity(token) {
  const value = await creation.create(token, "Ride fixture");
  communities.add(value.id);
  return value.id;
}
async function rideCount() {
  return (await admin.query("SELECT count(*)::int AS count FROM rides WHERE community_id = ANY($1::uuid[])", [[...communities]])).rows[0].count;
}
async function schedule(offset) {
  return (await admin.query("SELECT clock_timestamp() + $1::interval AS instant", [offset])).rows[0].instant;
}
beforeEach(async () => {
  accounts = new Set(); communities = new Set(); identities = new Map();
  leader = await fixtureAccount("leader"); coLeader = await fixtureAccount("co-leader"); member = await fixtureAccount("member");
  const authorization = new AccountAuthorizationService({ verifyBearer: async (token) => {
    const identity = identities.get(token);
    if (!identity) throw new UnauthorizedException("Identity is not allowed");
    return identity;
  } });
  creation = new CommunityCreationService(authorization);
  management = new CommunityAuthorizationService(authorization);
  rides = new RideCreationService(management);
  community = await fixtureCommunity("leader");
  await admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, 'Co-leader'), ($1, $3, 'Member')", [community, coLeader, member]);
});
afterEach(async () => {
  await admin.query("DELETE FROM rides WHERE community_id = ANY($1::uuid[])", [[...communities]]);
  await admin.query("DELETE FROM community_memberships WHERE community_id = ANY($1::uuid[])", [[...communities]]);
  await admin.query("DELETE FROM communities WHERE id = ANY($1::uuid[])", [[...communities]]);
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [[...accounts]]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [[...accounts]]);
});

test("immediate and scheduled creation persist committed drafts under canonical actor/community IDs", async () => {
  const future = await schedule("1 day");
  const immediate = await rides.create("leader", community.toUpperCase(), { mode: "immediate" });
  const scheduled = await rides.create("co-leader", community, { mode: "scheduled", scheduledFor: future });
  assert.ok(Object.isFrozen(immediate)); assert.ok(Object.isFrozen(scheduled));
  assert.deepEqual(immediate, { id: immediate.id, communityId: community, mode: "immediate", scheduledFor: null, state: "draft" });
  assert.deepEqual(scheduled, { id: scheduled.id, communityId: community, mode: "scheduled", scheduledFor: future.toISOString(), state: "draft" });
  const rows = (await admin.query("SELECT id, community_id, created_by, mode, scheduled_for, state FROM rides ORDER BY mode")).rows;
  assert.deepEqual(rows, [
    { id: immediate.id, community_id: community, created_by: leader, mode: "immediate", scheduled_for: null, state: "draft" },
    { id: scheduled.id, community_id: community, created_by: coLeader, mode: "scheduled", scheduled_for: future, state: "draft" },
  ]);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE community_id = $1", [community])).rows[0].count, 3);
});

test("the database clock refuses elapsed schedules and malformed intents without writes", async () => {
  for (const scheduledFor of [await schedule("-1 day"), await schedule("0 seconds")]) {
    await assert.rejects(rides.create("leader", community, { mode: "scheduled", scheduledFor }), (error) => error.getStatus() === 400);
  }
  for (const input of [{ mode: "immediate", state: "active" }, { mode: "immediate", accountId: member }, { mode: "immediate", participants: [member] }]) {
    await assert.rejects(rides.create("leader", community, input), (error) => error.getStatus() === 400);
  }
  assert.equal(await rideCount(), 0);
});

test("ride creation requires current Leader/Co-leader membership in the requested community", async () => {
  await rides.create("leader", community, { mode: "immediate" });
  await rides.create("co-leader", community, { mode: "immediate" });
  await assert.rejects(rides.create("member", community, { mode: "immediate" }), (error) => error.getStatus() === 403);
  await fixtureAccount("outsider");
  const other = await fixtureCommunity("outsider");
  await assert.rejects(rides.create("leader", other, { mode: "immediate" }), (error) => error.getStatus() === 403);
  await assert.rejects(rides.create("outsider", community, { mode: "immediate" }), (error) => error.getStatus() === 403);
  assert.equal(await rideCount(), 2);
});

test("creator metadata, inactive accounts, missing links and rejected identity cannot authorize a ride", async () => {
  await admin.query("DELETE FROM community_memberships WHERE community_id = $1 AND account_id = $2", [community, leader]);
  await assert.rejects(rides.create("leader", community, { mode: "immediate" }), (error) => error.getStatus() === 403);
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [coLeader]);
  await assert.rejects(rides.create("co-leader", community, { mode: "immediate" }), (error) => error.getStatus() === 403);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [member]);
  await assert.rejects(rides.create("member", community, { mode: "immediate" }), (error) => error.getStatus() === 403);
  await assert.rejects(rides.create("rejected", community, { mode: "immediate" }), (error) => error.getStatus() === 401);
  assert.equal(await rideCount(), 0);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM accounts WHERE id = ANY($1::uuid[])", [[...accounts]])).rows[0].count, 3);
});

test("multiple ride drafts share a permanent community without replacing its membership", async () => {
  const first = await rides.create("leader", community, { mode: "immediate" });
  const second = await rides.create("leader", community, { mode: "immediate" });
  assert.notEqual(first.id, second.id);
  // Fixture cleanup is not a product deletion endpoint or retention policy.
  await admin.query("DELETE FROM rides WHERE id = $1", [first.id]);
  assert.equal((await admin.query("SELECT state FROM rides WHERE id = $1", [second.id])).rows[0].state, "draft");
  assert.equal((await admin.query("SELECT role FROM community_memberships WHERE community_id = $1 AND account_id = $2", [community, leader])).rows[0].role, "Leader");
});

test("SQL constraints and populated downgrade protect draft state, schedules and community data", async () => {
  const ride = await rides.create("leader", community, { mode: "immediate" });
  for (const sql of ["UPDATE rides SET state = 'active' WHERE id = $1", "UPDATE rides SET mode = 'unknown' WHERE id = $1",
    "UPDATE rides SET scheduled_for = clock_timestamp() + interval '1 day' WHERE id = $1", "UPDATE rides SET mode = 'scheduled' WHERE id = $1",
    "UPDATE rides SET mode = 'scheduled', scheduled_for = created_at WHERE id = $1"]) {
    await assert.rejects(admin.query(sql, [ride.id]), (error) => error.code === "23514");
  }
  let down;
  migration.down({ sql: (value) => { down = value; } });
  await admin.query("BEGIN");
  try {
    await assert.rejects(admin.query(down), (error) => error.code === "P0001" && error.message === "Ride rollback requires an empty table");
  } finally { await admin.query("ROLLBACK"); }
  await admin.query("DELETE FROM community_memberships WHERE community_id = $1", [community]);
  await assert.rejects(admin.query("DELETE FROM communities WHERE id = $1", [community]), (error) => error.code === "23503");
  assert.equal(await rideCount(), 1);
});

test("a deferred commit failure never returns an uncommitted ride", async () => {
  await admin.query(`CREATE FUNCTION fixture_reject_ride_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture commit rejection'; END $$;
    CREATE CONSTRAINT TRIGGER fixture_ride_commit AFTER INSERT ON rides DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fixture_reject_ride_commit()`);
  try {
    await assert.rejects(rides.create("leader", community, { mode: "immediate" }), (error) => error.getStatus() === 503 && error.cause === undefined);
    assert.equal(await rideCount(), 0);
  } finally {
    await admin.query("DROP TRIGGER fixture_ride_commit ON rides; DROP FUNCTION fixture_reject_ride_commit()");
  }
});

test("membership demotion waits for ride commit and denies the following creation", async () => {
  const writer = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await writer.connect();
  const pid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
  let enter; let release;
  const entered = new Promise((resolve) => { enter = resolve; });
  const barrier = new Promise((resolve) => { release = resolve; });
  const gated = new RideCreationService({ withManagementCapability: (...args) => management.withManagementCapability(...args.slice(0, 3), async (client, context) => {
    enter(); await barrier; return args[3](client, context);
  }) });
  const operation = gated.create("co-leader", community, { mode: "immediate" });
  operation.catch(() => undefined);
  let change;
  try {
    await Promise.race([entered, operation]);
    let settled = false;
    change = writer.query("UPDATE community_memberships SET role = 'Member' WHERE community_id = $1 AND account_id = $2", [community, coLeader]).finally(() => { settled = true; });
    change.catch(() => undefined);
    let waiting = false;
    const deadline = Date.now() + 1800;
    while (!settled && Date.now() < deadline) {
      if ((await admin.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1", [pid])).rows[0]?.wait_event_type === "Lock") { waiting = true; break; }
      await delay(10);
    }
    assert.ok(waiting, "PostgreSQL must observe the role change waiting on the creation transaction");
    release();
    assert.equal((await operation).state, "draft"); await change;
    await assert.rejects(rides.create("co-leader", community, { mode: "immediate" }), (error) => error.getStatus() === 403);
    assert.equal(await rideCount(), 1);
  } finally {
    release(); await operation.catch(() => undefined); await change?.catch(() => undefined); await writer.end();
  }
});
