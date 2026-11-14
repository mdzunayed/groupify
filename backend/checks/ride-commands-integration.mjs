import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { assertDocumentedResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { DevelopmentIdentityService } = require("../dist/identity/development-identity.service.js");
const { CommunityCreationService } = require("../dist/communities/community-creation.service.js");
const first = "Bearer fixture-leader"; const second = "Bearer fixture-co-leader"; const third = "Bearer fixture-member";
const path = "/v1/communities/{communityId}/rides";
const previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED };
let app; let url; let admin; let actors; let accounts; let communities; let community;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  process.env.NODE_ENV = "test"; process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL }); await admin.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  // Only upstream identity is stubbed; HTTP, account/community authorization,
  // database clocks/locks, transaction commit and lifecycle remain real.
  app.get(DevelopmentIdentityService).verifyBearer = async (header) => {
    const identity = actors.get(header); if (!identity) throw new UnauthorizedException("private-fixture-marker"); return identity;
  };
  await app.listen(0, "127.0.0.1"); url = await app.getUrl();
});
after(async () => {
  await app?.close(); await admin?.end();
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
async function fixtureCommunity(actor) {
  const result = await app.get(CommunityCreationService).create(actor, "Ride HTTP fixture"); communities.push(result.id); return result.id;
}
beforeEach(async () => {
  actors = new Map(); accounts = []; communities = [];
  for (const header of [first, second, third]) {
    const id = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id; accounts.push(id);
    const identity = { provider: "clerk", issuer: "https://ride-http-fixture.example.test", subject: `user_fixture_${id}`, sessionId: "sess_fixture" };
    actors.set(header, identity);
    await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)", [id, identity.provider, identity.issuer, identity.subject]);
  }
  community = await fixtureCommunity(first);
  await admin.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, 'Co-leader'), ($1, $3, 'Member')", [community, accounts[1], accounts[2]]);
});
afterEach(async () => {
  await admin.query("DELETE FROM rides WHERE community_id = ANY($1::uuid[])", [communities]);
  await admin.query("DELETE FROM community_memberships WHERE community_id = ANY($1::uuid[])", [communities]);
  await admin.query("DELETE FROM communities WHERE id = ANY($1::uuid[])", [communities]);
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [accounts]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [accounts]);
});
function request(action = "create", body = action === "create" ? { mode: "immediate" } : {}, extra = {}) {
  return fetch(`${url}/v1/communities/${extra.community ?? community}/rides${action === "create" ? "" : `/${extra.id}/${action}`}${extra.query ?? ""}`, {
    method: "POST", headers: { Authorization: extra.actor ?? first, "Content-Type": "application/json", ...extra.headers },
    ...(extra.empty ? {} : { body: JSON.stringify(body) }),
  });
}
async function check(response, status, action = "create") {
  assert.equal(response.status, status);
  const body = await assertDocumentedResponse(response, path + (action === "create" ? "" : `/{rideId}/${action}`), "post");
  assert.equal(response.headers.get("set-cookie"), null); assert.equal(response.headers.get("location"), null);
  assert.ok(!JSON.stringify(body).includes("private-fixture-marker")); return body;
}
async function create(body, extra) { return check(await request("create", body, extra), 201); }
async function row(id) { return (await admin.query("SELECT * FROM rides WHERE id = $1", [id])).rows[0]; }
async function count() { return (await admin.query("SELECT count(*)::int AS count FROM rides WHERE community_id = ANY($1::uuid[])", [communities])).rows[0].count; }

test("real ride HTTP commits both modes and explicit start/end under current community authority", async () => {
  const future = (await admin.query("SELECT clock_timestamp() + interval '1 day' AS instant")).rows[0].instant.toISOString();
  for (const body of [{ mode: "immediate" }, { mode: "scheduled", scheduledFor: future }]) {
    const ride = await create(body, { actor: second, community: community.toUpperCase() });
    assert.deepEqual(ride, { id: ride.id, communityId: community, mode: body.mode, scheduledFor: body.scheduledFor ?? null, state: "draft" });
    assert.equal((await row(ride.id)).created_by, accounts[1]);
    const active = await check(await request("start", {}, { id: ride.id.toUpperCase(), empty: true }), 200, "start");
    const completed = await check(await request("end", {}, { id: ride.id, actor: second }), 200, "end");
    assert.equal(completed.startedAt, active.startedAt);
    const stored = await row(ride.id);
    assert.equal(stored.state, "completed"); assert.equal(stored.started_by, accounts[0]); assert.equal(stored.ended_by, accounts[1]);
  }
  assert.equal(await count(), 2);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE community_id = $1", [community])).rows[0].count, 3);
});

test("invalid ride HTTP intents, elapsed schedules and selectors perform no writes", async () => {
  const past = (await admin.query("SELECT clock_timestamp() - interval '1 day' AS instant")).rows[0].instant.toISOString();
  for (const body of [{ mode: "scheduled", scheduledFor: past }, { mode: "scheduled", scheduledFor: "2099-02-30T00:00:00.000Z" },
    { mode: "immediate", createdBy: accounts[1] }, { mode: "immediate", leaderId: accounts[1] }, { mode: "immediate", participants: [accounts[1]] }, { mode: "immediate", tracking: true }]) {
    await check(await request("create", body), 400);
  }
  await check(await request("create", undefined, { query: "?accountId=private-fixture-marker" }), 400);
  await check(await request("create", undefined, { headers: { "Content-Type": "text/plain" } }), 415);
  await check(await request("create", undefined, { community: "private-fixture-marker" }), 400);
  assert.equal(await count(), 0);
});

test("HTTP management and ride resource scopes prevent Member and cross-community mutation", async () => {
  const ride = await create(); const other = await fixtureCommunity(third);
  await check(await request("create", undefined, { actor: third }), 403);
  for (const action of ["start", "end"]) {
    await check(await request(action, {}, { actor: third, id: ride.id }), 403, action);
    await check(await request(action, {}, { community: other, id: ride.id }), 403, action);
    await check(await request(action, {}, { actor: third, community: other, id: ride.id }), 404, action);
    await check(await request(action, {}, { id: "00000000-0000-4000-8000-000000000001" }), 404, action);
    await check(await request(action, {}, { id: "private-fixture-marker" }), 400, action);
  }
  assert.equal((await row(ride.id)).state, "draft"); assert.equal(await count(), 1);
});

test("HTTP inactive/unmapped/rejected sessions cannot create or transition and never provision implicitly", async () => {
  const ride = await create();
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accounts[0]]);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accounts[1]]);
  for (const action of ["create", "start", "end"]) {
    for (const [actor, status] of [[first, 403], [second, 403], ["Bearer private-fixture-marker", 401]]) {
      await check(await request(action, undefined, { actor, id: ride.id }), status, action);
    }
  }
  assert.equal((await row(ride.id)).state, "draft"); assert.equal(await count(), 1);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM accounts WHERE id = ANY($1::uuid[])", [accounts])).rows[0].count, 3);
});

test("HTTP lifecycle retries preserve metadata, invalid transitions conflict and revoked roles cannot replay", async () => {
  const ride = await create();
  await check(await request("end", {}, { id: ride.id }), 409, "end");
  const active = await check(await request("start", {}, { id: ride.id }), 200, "start");
  assert.deepEqual(await check(await request("start", {}, { id: ride.id, actor: second }), 200, "start"), active);
  await check(await request("end", { tracking: true }, { id: ride.id }), 400, "end");
  await check(await request("end", {}, { id: ride.id, query: "?role=Leader" }), 400, "end");
  const completed = await check(await request("end", {}, { id: ride.id }), 200, "end");
  assert.deepEqual(await check(await request("end", {}, { id: ride.id, actor: second }), 200, "end"), completed);
  await check(await request("start", {}, { id: ride.id }), 409, "start");
  await admin.query("UPDATE community_memberships SET role = 'Member' WHERE community_id = $1 AND account_id = $2", [community, accounts[1]]);
  await check(await request("end", {}, { id: ride.id, actor: second }), 403, "end");
});

test("HTTP cannot report successful creation/start/end after a deferred SQL commit rejection", async () => {
  await admin.query(`CREATE FUNCTION fixture_reject_ride_http_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private-fixture-marker'; END $$;
    CREATE CONSTRAINT TRIGGER fixture_ride_http_commit AFTER INSERT OR UPDATE ON rides DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fixture_reject_ride_http_commit()`);
  try {
    await check(await request(), 503); assert.equal(await count(), 0);
    await admin.query("ALTER TABLE rides DISABLE TRIGGER fixture_ride_http_commit"); const ride = await create();
    await admin.query("ALTER TABLE rides ENABLE TRIGGER fixture_ride_http_commit");
    await check(await request("start", {}, { id: ride.id }), 503, "start"); assert.equal((await row(ride.id)).state, "draft");
    await admin.query("ALTER TABLE rides DISABLE TRIGGER fixture_ride_http_commit"); await check(await request("start", {}, { id: ride.id }), 200, "start");
    await admin.query("ALTER TABLE rides ENABLE TRIGGER fixture_ride_http_commit");
    await check(await request("end", {}, { id: ride.id }), 503, "end"); assert.equal((await row(ride.id)).state, "active");
  } finally { await admin.query("DROP TRIGGER fixture_ride_http_commit ON rides; DROP FUNCTION fixture_reject_ride_http_commit()"); }
});

test("concurrent HTTP commands keep one transition while requests receive independent correlation IDs", async () => {
  const ride = await create(); const requestIds = new Set();
  for (const action of ["start", "end"]) {
    const responses = await Promise.all(Array.from({ length: 4 }, () => request(action, {}, { id: ride.id })));
    const values = [];
    for (const response of responses) { requestIds.add(response.headers.get("x-request-id")); values.push(await check(response, 200, action)); }
    assert.ok(values.every((value) => JSON.stringify(value) === JSON.stringify(values[0])));
  }
  assert.equal(requestIds.size, 8); assert.equal((await row(ride.id)).state, "completed");
});
