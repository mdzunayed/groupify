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
const { RideLifecycleService } = require("../dist/rides/ride-lifecycle.service.js");
const migration = require("../migrations/1794693600000_ride_lifecycle.cjs");
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
let lifecycle;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL }); await admin.connect();
});
after(async () => { await admin?.end(); });
async function fixtureAccount(token) {
  const id = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
  accounts.add(id);
  const identity = { provider: "clerk", issuer: "https://lifecycle-fixture.example.test", subject: `user_fixture_${id}`, sessionId: "sess_fixture" };
  identities.set(token, identity);
  await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)", [id, identity.provider, identity.issuer, identity.subject]);
  return id;
}
async function fixtureCommunity(token) {
  const value = await creation.create(token, "Lifecycle fixture"); communities.add(value.id); return value.id;
}
async function draft(token = "leader", communityId = community, intent = { mode: "immediate" }) {
  return rides.create(token, communityId, intent);
}
async function row(id) { return (await admin.query("SELECT * FROM rides WHERE id = $1", [id])).rows[0]; }
beforeEach(async () => {
  accounts = new Set(); communities = new Set(); identities = new Map();
  leader = await fixtureAccount("leader"); coLeader = await fixtureAccount("co-leader"); member = await fixtureAccount("member");
  const authorization = new AccountAuthorizationService({ verifyBearer: async (token) => {
    const identity = identities.get(token); if (!identity) throw new UnauthorizedException(); return identity;
  } });
  creation = new CommunityCreationService(authorization); management = new CommunityAuthorizationService(authorization);
  rides = new RideCreationService(management); lifecycle = new RideLifecycleService(management);
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

test("community Leaders/Co-leaders explicitly start and end both ride modes with actor/history metadata", async () => {
  const future = (await admin.query("SELECT clock_timestamp() + interval '1 day' AS instant")).rows[0].instant;
  for (const intent of [{ mode: "immediate" }, { mode: "scheduled", scheduledFor: future }]) {
    const ride = await draft("leader", community, intent);
    assert.equal((await row(ride.id)).state, "draft");
    const active = await lifecycle.start("co-leader", community.toUpperCase(), ride.id.toUpperCase());
    assert.ok(Object.isFrozen(active)); assert.equal(active.state, "active"); assert.equal(active.endedAt, null);
    const completed = await lifecycle.end("leader", community, ride.id);
    assert.ok(Object.isFrozen(completed));
    assert.deepEqual(completed, { id: ride.id, communityId: community, state: "completed", startedAt: active.startedAt, endedAt: completed.endedAt });
    const stored = await row(ride.id);
    assert.equal(stored.started_by, coLeader); assert.equal(stored.ended_by, leader);
    assert.equal(stored.started_at.toISOString(), active.startedAt); assert.equal(stored.ended_at.toISOString(), completed.endedAt);
    assert.ok(stored.started_at >= stored.created_at); assert.ok(stored.ended_at >= stored.started_at);
  }
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE community_id = $1", [community])).rows[0].count, 3);
});

test("safe retries preserve timestamps/actors while draft end and completed restart conflict", async () => {
  const ride = await draft();
  await assert.rejects(lifecycle.end("leader", community, ride.id), (error) => error.getStatus() === 409);
  const active = await lifecycle.start("leader", community, ride.id);
  assert.deepEqual(await lifecycle.start("co-leader", community, ride.id), active);
  assert.equal((await row(ride.id)).started_by, leader);
  const completed = await lifecycle.end("co-leader", community, ride.id);
  assert.deepEqual(await lifecycle.end("leader", community, ride.id), completed);
  assert.equal((await row(ride.id)).ended_by, coLeader);
  await assert.rejects(lifecycle.start("leader", community, ride.id), (error) => error.getStatus() === 409);
  await admin.query("UPDATE community_memberships SET role = 'Member' WHERE community_id = $1 AND account_id = $2", [community, coLeader]);
  await assert.rejects(lifecycle.end("co-leader", community, ride.id), (error) => error.getStatus() === 403);
});

test("member, inactive, unmapped and provider-rejected identities cannot change lifecycle", async () => {
  const ride = await draft();
  await assert.rejects(lifecycle.start("member", community, ride.id), (error) => error.getStatus() === 403);
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [coLeader]);
  await assert.rejects(lifecycle.start("co-leader", community, ride.id), (error) => error.getStatus() === 403);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [leader]);
  await assert.rejects(lifecycle.start("leader", community, ride.id), (error) => error.getStatus() === 403);
  await assert.rejects(lifecycle.start("rejected", community, ride.id), (error) => error.getStatus() === 401);
  assert.equal((await row(ride.id)).state, "draft");
});

test("ride selection is scoped to the authorized community and validates UUIDs without exposing another ride", async () => {
  await fixtureAccount("other"); const other = await fixtureCommunity("other"); const ride = await draft("other", other);
  for (const id of [ride.id, "00000000-0000-4000-8000-000000000001"]) {
    await assert.rejects(lifecycle.start("leader", community, id), (error) => error.getStatus() === 404);
  }
  await assert.rejects(lifecycle.start("leader", other, ride.id), (error) => error.getStatus() === 403);
  for (const id of [undefined, "private-fixture-marker", `${ride.id}' OR TRUE --`]) {
    await assert.rejects(lifecycle.start("leader", community, id), (error) => error.getStatus() === 400);
  }
  assert.equal((await row(ride.id)).state, "draft");
});

test("concurrent starts and ends serialize into one transition each and never reopen history", async () => {
  const ride = await draft();
  const starts = await Promise.all(Array.from({ length: 6 }, (_, i) => lifecycle.start(i % 2 ? "leader" : "co-leader", community, ride.id)));
  assert.ok(starts.every((value) => JSON.stringify(value) === JSON.stringify(starts[0])));
  const ends = await Promise.all(Array.from({ length: 6 }, (_, i) => lifecycle.end(i % 2 ? "leader" : "co-leader", community, ride.id)));
  assert.ok(ends.every((value) => JSON.stringify(value) === JSON.stringify(ends[0])));
  await assert.rejects(lifecycle.start("leader", community, ride.id), (error) => error.getStatus() === 409);
  assert.equal((await row(ride.id)).state, "completed");
});

test("membership demotion waits for lifecycle commit and prevents the next transition", async () => {
  const ride = await draft(); const writer = new pg.Client({ connectionString: process.env.DATABASE_URL }); await writer.connect();
  const pid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
  let enter; let release;
  const entered = new Promise((resolve) => { enter = resolve; }); const barrier = new Promise((resolve) => { release = resolve; });
  const gated = new RideLifecycleService({ withManagementCapability: (...args) => management.withManagementCapability(...args.slice(0, 3), async (client, context) => {
    enter(); await barrier; return args[3](client, context);
  }) });
  const operation = gated.start("co-leader", community, ride.id); operation.catch(() => undefined);
  let change;
  try {
    await Promise.race([entered, operation]); let settled = false;
    change = writer.query("UPDATE community_memberships SET role = 'Member' WHERE community_id = $1 AND account_id = $2", [community, coLeader]).finally(() => { settled = true; }); change.catch(() => undefined);
    let waiting = false; const deadline = Date.now() + 1800;
    while (!settled && Date.now() < deadline) {
      if ((await admin.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1", [pid])).rows[0]?.wait_event_type === "Lock") { waiting = true; break; }
      await delay(10);
    }
    assert.ok(waiting, "PostgreSQL must observe demotion waiting on the lifecycle transaction");
    release(); assert.equal((await operation).state, "active"); await change;
    await assert.rejects(lifecycle.end("co-leader", community, ride.id), (error) => error.getStatus() === 403);
    assert.equal((await row(ride.id)).state, "active");
  } finally { release(); await operation.catch(() => undefined); await change?.catch(() => undefined); await writer.end(); }
});

test("lifecycle constraints and guarded downgrade preserve active/completed audit history", async () => {
  const ride = await draft();
  const snapshot = await row(ride.id);
  let down; let up;
  migration.down({ sql: (value) => { down = value; } }); migration.up({ sql: (value) => { up = value; } });
  await admin.query("BEGIN");
  try {
    await admin.query(down);
    assert.equal((await row(ride.id)).state, "draft");
    await admin.query(up);
    assert.deepEqual(await row(ride.id), snapshot);
    await admin.query("COMMIT");
  } catch (error) { await admin.query("ROLLBACK"); throw error; }
  for (const sql of ["UPDATE rides SET state = 'active' WHERE id = $1", "UPDATE rides SET state = 'completed' WHERE id = $1",
    "UPDATE rides SET started_by = created_by WHERE id = $1", "UPDATE rides SET started_at = created_at WHERE id = $1"]) {
    await assert.rejects(admin.query(sql, [ride.id]), (error) => error.code === "23514");
  }
  await lifecycle.start("leader", community, ride.id);
  for (const sql of ["UPDATE rides SET ended_at = started_at WHERE id = $1", "UPDATE rides SET started_at = created_at - interval '1 second' WHERE id = $1"]) {
    await assert.rejects(admin.query(sql, [ride.id]), (error) => error.code === "23514");
  }
  await lifecycle.end("co-leader", community, ride.id);
  await assert.rejects(admin.query("UPDATE rides SET ended_at = started_at - interval '1 second' WHERE id = $1", [ride.id]), (error) => error.code === "23514");
  await admin.query("BEGIN");
  try { await assert.rejects(admin.query(down), (error) => error.code === "P0001" && error.message === "Lifecycle rollback requires only draft rides"); }
  finally { await admin.query("ROLLBACK"); }
  assert.equal((await row(ride.id)).state, "completed");
  await admin.query("DELETE FROM community_memberships WHERE account_id = $1", [coLeader]);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [coLeader]);
  await assert.rejects(admin.query("DELETE FROM accounts WHERE id = $1", [coLeader]), (error) => error.code === "23503");
});

test("deferred commit rejection rolls back start/end and returns no successful lifecycle result", async () => {
  const ride = await draft();
  await admin.query(`CREATE FUNCTION fixture_reject_lifecycle_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture commit rejection'; END $$;
    CREATE CONSTRAINT TRIGGER fixture_lifecycle_commit AFTER UPDATE ON rides DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fixture_reject_lifecycle_commit()`);
  try {
    await assert.rejects(lifecycle.start("leader", community, ride.id), (error) => error.getStatus() === 503 && error.cause === undefined);
    assert.equal((await row(ride.id)).state, "draft");
    await admin.query("ALTER TABLE rides DISABLE TRIGGER fixture_lifecycle_commit");
    await lifecycle.start("leader", community, ride.id);
    await admin.query("ALTER TABLE rides ENABLE TRIGGER fixture_lifecycle_commit");
    await assert.rejects(lifecycle.end("leader", community, ride.id), (error) => error.getStatus() === 503);
    assert.equal((await row(ride.id)).state, "active");
  } finally { await admin.query("DROP TRIGGER fixture_lifecycle_commit ON rides; DROP FUNCTION fixture_reject_lifecycle_commit()"); }
});
