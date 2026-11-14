import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { assertSharedErrorResponse } from "./api-contract.mjs";
import { connect, nextFrame, terminate, within } from "./realtime-client.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { DevelopmentIdentityService } = require("../dist/identity/development-identity.service.js");
const previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED };
let app;
let admin;
let baseUrl;
let accountId;
let identity;
let clients;

before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  process.env.NODE_ENV = "test";
  process.env.GROUPIFY_DEV_WS_ENABLED = "true";
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  // Only upstream identity is stubbed. The WebSocket server, HTTP upgrade,
  // account mapping/status SQL, transactions and subsequent frames are real.
  app.get(DevelopmentIdentityService).verifyBearer = async (authorization) => {
    if (authorization !== "Bearer fixture-only-marker") throw new UnauthorizedException();
    return identity;
  };
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});
after(async () => {
  await app?.close();
  await admin?.end();
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
beforeEach(async () => {
  clients = new Set();
  accountId = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
  identity = { provider: "clerk", issuer: "https://realtime-fixture.example.test", subject: `user_fixture_${accountId}`, sessionId: "sess_fixture" };
  await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)",
    [accountId, identity.provider, identity.issuer, identity.subject]);
});
afterEach(async () => {
  await terminate(clients);
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accountId]);
  await admin.query("DELETE FROM accounts WHERE id = $1", [accountId]);
});
function client() {
  const value = connect(baseUrl);
  clients.add(value);
  return value;
}
async function accepted() {
  const value = client();
  await within(value.opened);
  assert.equal((await within(value.initial)).event, "connected");
  return value;
}

test("a mapped active account establishes transport and rechecks through a real SQL transaction", async () => {
  const value = await accepted();
  const reply = nextFrame(value.peer);
  value.peer.send(JSON.stringify({ event: "check_account" }));
  const frame = await within(reply);
  assert.equal(frame.event, "account_checked");
  assert.deepEqual(frame.data, { status: "ok" });
  assert.ok(!JSON.stringify(frame).includes(accountId));
  assert.ok(!JSON.stringify(frame).includes(identity.subject));
});

test("a verified identity without an account mapping cannot upgrade or bootstrap implicitly", async () => {
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accountId]);
  const before = (await admin.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count;
  const response = await within(client().rejected);
  assert.equal(response.status, 403);
  await assertSharedErrorResponse(response);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count, before);
});

test("deactivation after connection blocks the next message and every subsequent upgrade", async () => {
  const value = await accepted();
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountId]);
  value.peer.send(JSON.stringify({ event: "check_account" }));
  assert.equal((await within(value.closed)).code, 1008);
  const response = await within(client().rejected);
  assert.equal(response.status, 403);
  await assertSharedErrorResponse(response);
});

test("removing the identity mapping blocks an already connected client's next action", async () => {
  const value = await accepted();
  await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accountId]);
  value.peer.send(JSON.stringify({ event: "check_account" }));
  assert.equal((await within(value.closed)).code, 1008);
  assert.equal((await admin.query("SELECT state FROM accounts WHERE id = $1", [accountId])).rows[0].state, "active");
});
