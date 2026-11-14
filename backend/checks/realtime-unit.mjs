import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { assertSharedErrorResponse } from "./api-contract.mjs";
import { connect, nextFrame, terminate, within } from "./realtime-client.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { AccountAuthorizationService } = require("../dist/accounts/account-authorization.service.js");
let app;
let baseUrl;
let previous;
let clients;
let checks;
let failure;
let gate;
let started;
let output;
beforeEach(() => {
  previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED };
  clients = new Set(); checks = 0; failure = undefined; gate = undefined; started = undefined; output = [];
  for (const method of ["log", "warn", "error"]) mock.method(console, method, (...args) => { output.push(args); });
});
afterEach(async () => {
  await terminate(clients);
  if (app) await app.close();
  app = undefined;
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  const count = output.length;
  mock.restoreAll();
  assert.equal(count, 0, "No raw SDK/socket/request data may reach console output");
});
async function start({ enabled = "true", mode = "test" } = {}) {
  if (mode === null) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode;
  if (enabled === null) delete process.env.GROUPIFY_DEV_WS_ENABLED; else process.env.GROUPIFY_DEV_WS_ENABLED = enabled;
  app = await NestFactory.create(AppModule, { logger: false });
  // Protocol/transport suite only. Actual provider/SQL boundaries have separate suites.
  app.get(AccountAuthorizationService).withActiveAccount = async (authorization, operation) => {
    checks += 1;
    started?.();
    if (authorization !== "Bearer fixture-only-marker") throw new UnauthorizedException();
    if (failure) throw failure;
    if (gate) await gate;
    return operation(undefined, { id: "fixture-account" });
  };
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
}
function client(options) {
  const value = connect(baseUrl, options);
  clients.add(value);
  return value;
}
async function accepted(options) {
  const value = client(options);
  await within(value.opened);
  const initial = await within(value.initial);
  const [upgrade] = await within(value.upgraded);
  assert.equal(initial.requestId, upgrade.headers["x-request-id"]);
  assert.equal(upgrade.headers["cache-control"], "no-store");
  assert.equal(initial.event, "connected");
  assert.deepEqual(initial.data, { status: "ok" });
  assert.match(initial.requestId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(Object.keys(initial).sort(), ["data", "event", "requestId"]);
  return value;
}

test("development WebSockets are disabled by default and unavailable in production", async () => {
  for (const settings of [{ enabled: null }, { enabled: "false" }, { enabled: "true", mode: null }, { enabled: "true", mode: "production" }]) {
    await start(settings);
    const value = client();
    await within(value.closed);
    assert.equal(checks, 0);
    assert.equal((await fetch(`${baseUrl}/health/live`)).status, 200);
    await app.close(); app = undefined;
  }
});

test("authorization completes before HTTP upgrade and only a fixed diagnostic frame is emitted", async () => {
  await start();
  let release;
  gate = new Promise((resolve) => { release = resolve; });
  const checking = new Promise((resolve) => { started = resolve; });
  const value = client({ headers: { "X-Request-Id": "private-fixture-marker" } });
  try {
    await within(checking);
    await delay(50);
    assert.equal(value.peer.readyState, 0);
    release();
    await within(value.opened);
    const frame = await within(value.initial);
    assert.equal(frame.event, "connected");
    assert.ok(!JSON.stringify(frame).includes("private-fixture-marker"));
    assert.deepEqual(Object.keys(frame).sort(), ["data", "event", "requestId"]);
  } finally { release(); }
});

test("upgrade authentication failures use safe correlated HTTP errors and accept no URL/cookie/protocol credentials", async () => {
  await start();
  for (const [error, status] of [[new UnauthorizedException("private-fixture-marker"), 401], [new ForbiddenException("private-fixture-marker"), 403], [new ServiceUnavailableException("private-fixture-marker"), 503]]) {
    failure = error;
    const response = await within(client().rejected);
    assert.equal(response.status, status);
    assert.ok(!JSON.stringify(await assertSharedErrorResponse(response)).includes("private-fixture-marker"));
  }
  failure = undefined;
  for (const options of [
    { authorization: undefined, headers: { Cookie: "__session=private-fixture-marker" } },
    { path: "/v1/development/events?token=private-fixture-marker" },
    { headers: { "Sec-WebSocket-Protocol": "private-fixture-marker" } },
  ]) {
    const response = await within(client(options).rejected);
    assert.ok([400, 401, 404].includes(response.status));
    assert.ok(!JSON.stringify(await assertSharedErrorResponse(response)).includes("private-fixture-marker"));
  }
});

test("each supported message checks current authorization and returns no account/provider/role data", async () => {
  await start();
  const value = await accepted();
  for (let index = 0; index < 2; index += 1) {
    const received = nextFrame(value.peer);
    value.peer.send(JSON.stringify({ event: "check_account" }));
    const frame = await within(received);
    assert.equal(frame.event, "account_checked");
    assert.deepEqual(frame.data, { status: "ok" });
    assert.deepEqual(Object.keys(frame).sort(), ["data", "event", "requestId"]);
    assert.equal(checks, index + 2);
  }
});

test("later authorization failure closes the connection with safe policy/unavailable codes", async () => {
  await start();
  for (const [error, code] of [[new UnauthorizedException("private-fixture-marker"), 1008], [new ForbiddenException("private-fixture-marker"), 1008], [new Error("private-fixture-marker"), 1013]]) {
    failure = undefined;
    const value = await accepted();
    failure = error;
    value.peer.send(JSON.stringify({ event: "check_account" }));
    const close = await within(value.closed);
    assert.equal(close.code, code);
    assert.ok(!close.reason.includes("private-fixture-marker"));
  }
});

test("malformed, binary, unknown and oversized messages close safely before another authorization check", async () => {
  await start();
  for (const [payload, code] of [["{private-fixture-marker", 1007], [JSON.stringify({ event: "chat", body: "private-fixture-marker" }), 1008], [Buffer.from("private-fixture-marker"), 1003], ["x".repeat(8193), 1009]]) {
    const value = await accepted();
    const before = checks;
    value.peer.send(payload);
    const close = await within(value.closed);
    assert.equal(close.code, code);
    assert.equal(checks, before);
    assert.ok(!close.reason.includes("private-fixture-marker"));
  }
});

test("a second diagnostic request cannot create an unbounded concurrent authorization queue", async () => {
  await start();
  const value = await accepted();
  let release;
  gate = new Promise((resolve) => { release = resolve; });
  const checking = new Promise((resolve) => { started = resolve; });
  try {
    value.peer.send(JSON.stringify({ event: "check_account" }));
    await within(checking);
    value.peer.send(JSON.stringify({ event: "check_account" }));
    assert.equal((await within(value.closed)).code, 1008);
  } finally { release(); }
});

test("application shutdown terminates owned connections and pending upgrade sockets", async () => {
  await start();
  const established = await accepted();
  let release;
  gate = new Promise((resolve) => { release = resolve; });
  const checking = new Promise((resolve) => { started = resolve; });
  const pending = client();
  try {
    await within(checking);
    const closingApp = app; app = undefined;
    await within(closingApp.close());
    await within(Promise.all([established.closed, pending.closed]));
  } finally { release(); }
});
