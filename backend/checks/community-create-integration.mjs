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
const path = "/v1/communities";
const first = "Bearer fixture-first-actor";
const second = "Bearer fixture-second-actor";
const previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED, GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED: process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED };
let app;
let url;
let admin;
let actors;
let accounts;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  process.env.NODE_ENV = "test";
  process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED = "true";
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  // Upstream identity alone is mocked; actual HTTP, account status, creation,
  // role assignment, SQL commit/rollback and constraints remain real.
  app.get(DevelopmentIdentityService).verifyBearer = async (authorization) => {
    const identity = actors.get(authorization);
    if (!identity) throw new UnauthorizedException("private-fixture-marker");
    return identity;
  };
  await app.listen(0, "127.0.0.1");
  url = await app.getUrl();
});
after(async () => {
  await app?.close(); await admin?.end();
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
beforeEach(async () => {
  actors = new Map(); accounts = [];
  for (const header of [first, second]) {
    const id = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
    accounts.push(id);
    const identity = { provider: "clerk", issuer: "https://community-http-fixture.example.test", subject: `user_fixture_${id}`, sessionId: "sess_fixture" };
    actors.set(header, identity);
    await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)", [id, identity.provider, identity.issuer, identity.subject]);
  }
});
afterEach(async () => {
  await admin.query("DELETE FROM community_memberships WHERE community_id IN (SELECT id FROM communities WHERE created_by = ANY($1::uuid[]))", [accounts]);
  await admin.query("DELETE FROM communities WHERE created_by = ANY($1::uuid[])", [accounts]);
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [accounts]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [accounts]);
});
function request(body = { name: "Fixture riders" }, { actor = first, query = "", headers = {} } = {}) {
  return fetch(`${url}${path}${query}`, { method: "POST", headers: { Authorization: actor, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
async function check(result, status) {
  assert.equal(result.status, status);
  const body = await assertDocumentedResponse(result, path, "post");
  assert.equal(result.headers.get("set-cookie"), null);
  return body;
}
async function count() { return (await admin.query("SELECT count(*)::int AS count FROM communities")).rows[0].count; }

test("HTTP creation commits the identity-derived initial Leader and returns only its new community", async () => {
  const value = await check(await request({ name: "  Cafe\u0301 riders  " }, { actor: second }), 201);
  assert.deepEqual(value, { id: value.id, name: "Café riders", role: "Leader" });
  const rows = (await admin.query(`SELECT c.name, c.created_by, m.account_id, m.role FROM communities c
    JOIN community_memberships m ON m.community_id = c.id WHERE c.id = $1`, [value.id])).rows;
  assert.deepEqual(rows, [{ name: value.name, created_by: accounts[1], account_id: accounts[1], role: "Leader" }]);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE community_id = $1", [value.id])).rows[0].count, 1);
});

test("HTTP invalid names and identity/role/media selectors perform no community writes", async () => {
  for (const body of [{ name: "" }, { name: "  " }, { name: 1 }, { name: "A\ud800B" }, { name: "A\nB" }, { name: "🚲".repeat(101) },
    { name: "Fixture", createdBy: accounts[1] }, { name: "Fixture", accountId: accounts[1] }, { name: "Fixture", role: "Member" }, { name: "Fixture", photoUrl: "private-fixture-marker" }]) {
    await check(await request(body), 400);
  }
  await check(await request(undefined, { query: `?accountId=${accounts[1]}` }), 400);
  await check(await request(undefined, { headers: { "Content-Type": "text/plain" } }), 415);
  assert.equal(await count(), 0);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships")).rows[0].count, 0);
});

test("HTTP creation refuses invalid/unmapped/inactive identities without implicit provisioning", async () => {
  await check(await request(undefined, { actor: "Bearer private-fixture-marker" }), 401);
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accounts[0]]);
  await check(await request(), 403);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accounts[1]]);
  await check(await request(undefined, { actor: second }), 403);
  assert.equal(await count(), 0);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count, 2);
});

test("HTTP cannot report a created community when the initial membership transaction rolls back", async () => {
  await admin.query("ALTER TABLE community_memberships ADD CONSTRAINT fixture_http_reject_leader CHECK (role <> 'Leader') NOT VALID");
  try {
    const body = await check(await request(), 503);
    assert.equal(body.id, undefined); assert.equal(body.role, undefined);
  } finally { await admin.query("ALTER TABLE community_memberships DROP CONSTRAINT fixture_http_reject_leader"); }
  assert.equal(await count(), 0);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships")).rows[0].count, 0);
});

test("separate POST intentions create independent communities without a name uniqueness or population cap", async () => {
  const results = await Promise.all([request(), request()]);
  const values = await Promise.all(results.map((result) => check(result, 201)));
  assert.notEqual(values[0].id, values[1].id);
  assert.equal(await count(), 2);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM community_memberships WHERE account_id = $1 AND role = 'Leader'", [accounts[0]])).rows[0].count, 2);
});
