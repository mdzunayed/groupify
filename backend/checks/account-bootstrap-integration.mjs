import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { assertDocumentedResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { DevelopmentIdentityService } = require("../dist/identity/development-identity.service.js");
const previous = process.env.GROUPIFY_DEV_WS_ENABLED;
const path = "/v1/accounts/bootstrap";
let app;
let admin;
let url;
let identity;
let verified;
before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  // Upstream identity only is stubbed; controller/body parsing/HTTP, provisioning,
  // transactions, mapping constraints and concurrency use the real implementation.
  app.get(DevelopmentIdentityService).verifyBearer = async (authorization) => {
    verified += 1;
    if (authorization !== "Bearer fixture-only-marker") throw new UnauthorizedException("private-fixture-marker");
    return identity;
  };
  await app.listen(0, "127.0.0.1");
  url = await app.getUrl();
});
after(async () => {
  await app?.close(); await admin?.end();
  if (previous === undefined) delete process.env.GROUPIFY_DEV_WS_ENABLED; else process.env.GROUPIFY_DEV_WS_ENABLED = previous;
});
beforeEach(() => {
  identity = { provider: "clerk", issuer: "https://bootstrap-fixture.example.test", subject: `user_fixture_${randomUUID()}`, sessionId: "sess_fixture" };
  verified = 0;
});
afterEach(async () => {
  const ids = (await admin.query("SELECT account_id FROM external_identities WHERE provider = $1 AND issuer = $2 AND subject = $3", [identity.provider, identity.issuer, identity.subject])).rows.map((row) => row.account_id);
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [ids]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [ids]);
});
function post(options = {}) {
  return fetch(`${url}${path}${options.query ?? ""}`, { method: "POST", headers: {
    Authorization: "Bearer fixture-only-marker", ...options.headers,
  }, ...(options.body === undefined ? {} : { body: options.body }) });
}
async function count() { return (await admin.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count; }

test("explicit bootstrap commits a new ID and repeated HTTP calls resolve the existing active mapping", async () => {
  const created = await post();
  assert.equal(created.status, 201);
  const value = await assertDocumentedResponse(created, path, "post");
  const existing = await post({ body: "{}", headers: { "Content-Type": "application/json" } });
  assert.equal(existing.status, 200);
  assert.deepEqual(await assertDocumentedResponse(existing, path, "post"), value);
  assert.equal((await admin.query("SELECT account_id FROM external_identities WHERE subject = $1", [identity.subject])).rows[0].account_id, value.accountId);
});

test("simultaneous bootstrap HTTP requests create exactly one mapping/account", async () => {
  const before = await count();
  const responses = await Promise.all(Array.from({ length: 8 }, () => post()));
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 200).length, 7);
  const bodies = await Promise.all(responses.map((response) => assertDocumentedResponse(response, path, "post")));
  assert.equal(new Set(bodies.map((body) => body.accountId)).size, 1);
  assert.equal(await count(), before + 1);
});

test("bootstrap cannot reactivate an inactive mapping or create a replacement", async () => {
  const initial = await assertDocumentedResponse(await post(), path, "post");
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [initial.accountId]);
  const before = await count();
  const response = await post();
  assert.equal(response.status, 403);
  await assertDocumentedResponse(response, path, "post");
  assert.equal(await count(), before);
  assert.equal((await admin.query("SELECT state FROM accounts WHERE id = $1", [initial.accountId])).rows[0].state, "deactivated");
});

test("invalid provider authentication creates no account", async () => {
  const before = await count();
  const response = await post({ headers: { Authorization: "Bearer private-fixture-marker" } });
  assert.equal(response.status, 401);
  await assertDocumentedResponse(response, path, "post");
  assert.equal(await count(), before);
});

test("caller identity/role fields and query inputs cannot reach provisioning or persist records", async () => {
  const before = await count();
  for (const options of [
    { body: JSON.stringify({ accountId: randomUUID(), subject: "private-fixture-marker", role: "Leader" }), headers: { "Content-Type": "application/json" } },
    { query: "?subject=private-fixture-marker" },
  ]) {
    const response = await post(options);
    assert.equal(response.status, 400);
    await assertDocumentedResponse(response, path, "post");
  }
  assert.equal(verified, 0);
  assert.equal(await count(), before);
});
