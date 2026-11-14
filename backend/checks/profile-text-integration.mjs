import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { assertDocumentedResponse, assertSharedErrorResponse } from "./api-contract.mjs";
import { rawGet } from "./raw-get.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { DevelopmentIdentityService } = require("../dist/identity/development-identity.service.js");
const migration = require("../migrations/1794682800000_profile_text.cjs");
const previous = process.env.GROUPIFY_DEV_WS_ENABLED;
const path = "/v1/me/profile";
const first = "Bearer fixture-first-actor";
const second = "Bearer fixture-second-actor";
const base = { displayName: "Fixture rider", riderType: "motorcycle" };
let app;
let admin;
let url;
let actors;
let accountIds;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  // Only upstream identity is stubbed. HTTP, validation, current account checks,
  // profile ownership, SQL constraints/transactions and version races are real.
  app.get(DevelopmentIdentityService).verifyBearer = async (authorization) => {
    const actor = actors.get(authorization);
    if (!actor) throw new UnauthorizedException("private-fixture-marker");
    return actor;
  };
  await app.listen(0, "127.0.0.1");
  url = await app.getUrl();
});
after(async () => {
  await app?.close(); await admin?.end();
  if (previous === undefined) delete process.env.GROUPIFY_DEV_WS_ENABLED; else process.env.GROUPIFY_DEV_WS_ENABLED = previous;
});
beforeEach(async () => {
  actors = new Map(); accountIds = [];
  for (const header of [first, second]) {
    const id = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
    accountIds.push(id);
    const identity = { provider: "clerk", issuer: "https://profile-fixture.example.test", subject: `user_fixture_${id}`, sessionId: "sess_fixture" };
    actors.set(header, identity);
    await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)", [id, identity.provider, identity.issuer, identity.subject]);
  }
});
afterEach(async () => {
  await admin.query("DELETE FROM rider_profiles WHERE account_id = ANY($1::uuid[])", [accountIds]);
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [accountIds]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [accountIds]);
});
function request(method, { actor = first, body, tag, query = "", headers = {} } = {}) {
  return fetch(`${url}${path}${query}`, { method, headers: { Authorization: actor, "Content-Type": "application/json", ...(tag === undefined ? {} : { "If-Match": tag }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function check(response, status, method = "get") {
  assert.equal(response.status, status);
  const body = await assertDocumentedResponse(response, path, method);
  if (status < 400) assert.equal(response.headers.get("etag"), `"profile-${body.profileId}-${body.version}"`);
  else assert.doesNotMatch(response.headers.get("etag") ?? "", /profile-/);
  assert.equal(response.headers.get("set-cookie"), null);
  return body;
}
function profileTag(profile, version = profile.version) { return `"profile-${profile.profileId}-${version}"`; }
async function create(body = base, actor = first) { return check(await request("POST", { body, actor }), 201, "post"); }
async function get(actor = first) { return check(await request("GET", { actor }), 200); }

test("absent profile reads and updates do not implicitly create a profile", async () => {
  const initial = { profileId: "11111111-1111-4111-8111-111111111111", version: "1" };
  await check(await request("GET"), 404);
  await check(await request("PATCH", { body: { displayName: "Fixture" }, tag: profileTag(initial) }), 404, "patch");
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM rider_profiles")).rows[0].count, 0);
});

test("profile creation/read normalizes text and leaves optional vehicle information null", async () => {
  const value = await create({ displayName: "  Cafe\u0301 rider  ", riderType: "bicycle" });
  assert.deepEqual(value, { profileId: value.profileId, displayName: "Café rider", riderType: "bicycle", vehicleDescription: null, version: "1" });
  assert.deepEqual(await get(), value);
});

test("two actors can read/edit only their own profile; identity selectors cannot redirect ownership", async () => {
  const own = await create();
  const initial = own;
  const other = await create({ displayName: "Second fixture", riderType: "bicycle" }, second);
  assert.deepEqual(await get(first), own);
  assert.deepEqual(await get(second), other);
  assert.notEqual(profileTag(own), profileTag(other));
  await check(await request("PATCH", { actor: second, body: { displayName: "Rejected cross-profile tag" }, tag: profileTag(own) }), 412, "patch");
  await check(await request("PATCH", { body: { accountId: accountIds[1], displayName: "Hijack fixture" }, tag: profileTag(initial) }), 400, "patch");
  await check(await request("GET", { query: `?accountId=${accountIds[1]}` }), 400);
  const foreign = await fetch(`${url}/v1/users/${accountIds[1]}/profile`, { headers: { Authorization: first } });
  assert.equal(foreign.status, 404); await assertSharedErrorResponse(foreign);
  assert.deepEqual(await get(second), other);
});

test("conditional self reads use the current owned profile generation and version", async () => {
  const initial = await create();
  const conditional = (actor, tag) => rawGet(`${url}${path}`, { Authorization: actor, "If-None-Match": tag });
  const matching = await conditional(first, profileTag(initial));
  assert.equal(matching.status, 304);
  assert.equal(await assertDocumentedResponse(matching, path), null);
  assert.equal(matching.headers.get("etag"), profileTag(initial));
  await check(await conditional(second, "*"), 404);
  const other = await create({ displayName: "Second fixture", riderType: "bicycle" }, second);
  assert.deepEqual(await check(await conditional(second, profileTag(initial)), 200), other);
  const changed = await check(await request("PATCH", { body: { displayName: "Changed fixture" }, tag: profileTag(initial) }), 200, "patch");
  assert.deepEqual(await check(await conditional(first, profileTag(initial)), 200), changed);
  // Test-only replacement is not an implemented public deletion/recreation policy.
  await admin.query("DELETE FROM rider_profiles WHERE account_id = $1", [accountIds[0]]);
  const replacement = await create();
  assert.equal(replacement.version, initial.version);
  assert.notEqual(replacement.profileId, initial.profileId);
  assert.deepEqual(await check(await conditional(first, profileTag(initial)), 200), replacement);
});

test("conditional reads recheck actual account/link state and upstream identity before returning 304", async () => {
  const initial = await create();
  const conditional = (tag) => rawGet(`${url}${path}`, { Authorization: first, "If-None-Match": tag });
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountIds[0]]);
  for (const condition of [profileTag(initial), "*"]) await check(await conditional(condition), 403);
  await admin.query("UPDATE accounts SET state = 'active' WHERE id = $1", [accountIds[0]]);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accountIds[0]]);
  for (const condition of [profileTag(initial), "*"]) await check(await conditional(condition), 403);
  actors.delete(first);
  for (const condition of [profileTag(initial), "*"]) await check(await conditional(condition), 401);
});

test("ETags bind the profile generation as well as its version", async () => {
  const old = await create();
  // Test-only deletion simulates a replaced representation, not a public deletion policy.
  await admin.query("DELETE FROM rider_profiles WHERE account_id = $1", [accountIds[0]]);
  const current = await create({ displayName: "Replacement fixture", riderType: "bicycle" });
  assert.notEqual(current.profileId, old.profileId);
  assert.equal(current.version, old.version);
  await check(await request("PATCH", { body: { displayName: "Rejected old generation" }, tag: profileTag(old) }), 412, "patch");
  assert.deepEqual(await get(), current);
});

test("PATCH preserves omitted fields, changes rider type and explicitly clears optional vehicle text", async () => {
  const initial = await create({ ...base, vehicleDescription: "  Fixture vehicle  " });
  const changed = await check(await request("PATCH", { body: { riderType: "bicycle" }, tag: profileTag(initial) }), 200, "patch");
  assert.equal(changed.vehicleDescription, "Fixture vehicle"); assert.equal(changed.version, "2");
  const cleared = await check(await request("PATCH", { body: { vehicleDescription: null }, tag: profileTag(changed) }), 200, "patch");
  assert.equal(cleared.vehicleDescription, null); assert.equal(cleared.displayName, base.displayName); assert.equal(cleared.version, "3");
});

test("competing same-version PATCH requests cannot lose an update", async () => {
  const initial = await create();
  const responses = await Promise.all(["First edit", "Second edit"].map((displayName) => request("PATCH", { body: { displayName }, tag: profileTag(initial) })));
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert.equal(responses.filter((response) => response.status === 412).length, 1);
  for (const response of responses) await check(response, response.status, "patch");
  const current = await get(); assert.equal(current.version, "2"); assert.ok(["First edit", "Second edit"].includes(current.displayName));
});

test("duplicate/concurrent profile creation never replaces the initial profile", async () => {
  const responses = await Promise.all(["First fixture", "Second fixture"].map((displayName) => request("POST", { body: { displayName, riderType: "bicycle" } })));
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 409).length, 1);
  for (const response of responses) await check(response, response.status, "post");
  const before = await get();
  await check(await request("POST", { body: base }), 409, "post");
  assert.deepEqual(await get(), before);
});

test("missing, weak, malformed, overflow and stale preconditions cannot modify the profile", async () => {
  const before = await create();
  for (const [tag, status] of [[undefined, 428], ["*", 400], [`W/${profileTag(before)}`, 400], [profileTag(before, "0"), 400], [profileTag(before, "9223372036854775808"), 400], [profileTag(before, "999"), 412]]) {
    await check(await request("PATCH", { body: { displayName: "Rejected fixture" }, tag }), status, "patch");
  }
  assert.deepEqual(await get(), before);
});

test("invalid/immutable/media fields and unsupported body formats cause no profile writes", async () => {
  for (const body of [{ ...base, role: "Leader" }, { ...base, photoAssetId: accountIds[1] }, { ...base, displayName: "A\ud800B" }, { ...base, riderType: "both" }]) {
    await check(await request("POST", { body }), 400, "post");
  }
  const before = await create();
  const initial = before;
  for (const body of [{}, { version: "2" }, { displayName: "🚲".repeat(81) }, { vehicleDescription: "x".repeat(161) }, { vehicleDescription: "A\udc00B" }, { vehicleDescription: "A\nB" }]) {
    await check(await request("PATCH", { body, tag: profileTag(initial) }), 400, "patch");
  }
  const form = await fetch(`${url}${path}`, { method: "PATCH", headers: { Authorization: first, "Content-Type": "application/x-www-form-urlencoded", "If-Match": profileTag(initial) }, body: "displayName=Rejected" });
  await check(form, 415, "patch");
  assert.deepEqual(await get(), before);
});

test("valid supplementary characters obey code-point bounds and SQL punctuation stays literal", async () => {
  const displayName = "🚲".repeat(80);
  const value = await create({ displayName, riderType: "bicycle", vehicleDescription: "x".repeat(160) });
  const initial = value;
  assert.equal(value.displayName, displayName);
  const literal = "Rider'); DROP TABLE rider_profiles; --";
  const changed = await check(await request("PATCH", { body: { displayName: literal, vehicleDescription: "   " }, tag: profileTag(initial) }), 200, "patch");
  assert.equal(changed.displayName, literal); assert.equal(changed.vehicleDescription, null);
});

test("inactive, unmapped and invalid external identities cannot read or mutate profile text", async () => {
  const initial = await create();
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountIds[0]]);
  for (const [method, body] of [["GET", undefined], ["POST", base], ["PATCH", { displayName: "Rejected" }]]) {
    await check(await request(method, { body, tag: profileTag(initial) }), 403, method.toLowerCase());
  }
  await check(await request("GET", { actor: "Bearer private-fixture-marker" }), 401);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accountIds[1]]);
  await check(await request("POST", { actor: second, body: base }), 403, "post");
  assert.equal((await admin.query("SELECT display_name FROM rider_profiles WHERE account_id = $1", [accountIds[0]])).rows[0].display_name, base.displayName);
});

test("database constraints and populated downgrade protect owned profile records", async () => {
  await create();
  for (const sql of ["UPDATE rider_profiles SET rider_type = 'Leader' WHERE account_id = $1", "UPDATE rider_profiles SET version = 0 WHERE account_id = $1", "UPDATE rider_profiles SET display_name = '' WHERE account_id = $1"]) {
    await assert.rejects(admin.query(sql, [accountIds[0]]), (error) => error.code === "23514");
  }
  await assert.rejects(admin.query("DELETE FROM accounts WHERE id = $1", [accountIds[0]]), (error) => error.code === "23503");
  let sql; migration.down({ sql: (value) => { sql = value; } });
  await admin.query("BEGIN");
  try { await assert.rejects(admin.query(sql), (error) => error.code === "P0001" && error.message === "Profile rollback requires an empty table"); }
  finally { await admin.query("ROLLBACK"); }
  assert.equal((await get()).version, "1");
});

test("bigint versions round-trip beyond JavaScript Number precision without losing precondition identity", async () => {
  await create();
  await admin.query("UPDATE rider_profiles SET version = 9007199254740993 WHERE account_id = $1", [accountIds[0]]);
  const large = await get();
  assert.equal(large.version, "9007199254740993");
  const changed = await check(await request("PATCH", { body: { displayName: "Exact version fixture" }, tag: profileTag(large) }), 200, "patch");
  assert.equal(changed.version, "9007199254740994");
});
