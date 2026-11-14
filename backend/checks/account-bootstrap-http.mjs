import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { assertDocumentedResponse, assertSharedErrorResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { AccountProvisioningService } = require("../dist/accounts/account-provisioning.service.js");
const path = "/v1/accounts/bootstrap";
const accountId = "11111111-1111-4111-8111-111111111111";
let app;
let url;
let previous;
let calls;
let created;
let failure;
beforeEach(() => {
  previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_AUTH_ENABLED: process.env.GROUPIFY_DEV_AUTH_ENABLED, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED };
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  calls = []; created = true; failure = undefined;
});
afterEach(async () => {
  await app?.close(); app = undefined;
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
async function start(stub = true) {
  app = await NestFactory.create(AppModule, { logger: false });
  if (stub) app.get(AccountProvisioningService).provision = async (authorization) => {
    calls.push(authorization);
    if (authorization !== "Bearer fixture-only-marker") throw new UnauthorizedException("private-fixture-marker");
    if (failure) throw failure;
    return Object.freeze({ id: accountId, created });
  };
  await app.listen(0, "127.0.0.1");
  url = await app.getUrl();
}
function post(options = {}) {
  return fetch(`${url}${path}${options.query ?? ""}`, { method: "POST", headers: {
    Authorization: "Bearer fixture-only-marker", "X-Request-Id": "private-fixture-marker", ...options.headers,
  }, ...(options.body === undefined ? {} : { body: options.body }) });
}

test("bootstrap returns committed new/existing IDs with 201/200, correlation and no-store", async () => {
  await start();
  for (const isNew of [true, false]) {
    created = isNew;
    const response = await post(isNew ? {} : { body: "{}", headers: { "Content-Type": "application/json" } });
    assert.equal(response.status, isNew ? 201 : 200);
    assert.deepEqual(await assertDocumentedResponse(response, path, "post"), { accountId });
    assert.notEqual(response.headers.get("x-request-id"), "private-fixture-marker");
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.deepEqual(calls, ["Bearer fixture-only-marker", "Bearer fixture-only-marker"]);
});

test("bootstrap rejects caller fields, query inputs and unsupported bodies before provisioning", async () => {
  await start();
  for (const [body, type, status] of [
    ['{"accountId":"private-fixture-marker"}', "application/json", 400],
    ['{"role":"Leader"}', "application/json", 400],
    ["[]", "application/json", 400], ["null", "application/json", 400],
    ["private-fixture-marker", "text/plain", 415],
    ["subject=private-fixture-marker", "application/x-www-form-urlencoded", 415],
  ]) {
    const response = await post({ body, headers: { "Content-Type": type } });
    assert.equal(response.status, status);
    assert.ok(!JSON.stringify(await assertDocumentedResponse(response, path, "post")).includes("private-fixture-marker"));
  }
  const query = await post({ query: "?subject=private-fixture-marker" });
  assert.equal(query.status, 400);
  await assertDocumentedResponse(query, path, "post");
  assert.equal(calls.length, 0);
});

test("bootstrap authentication and inactive/unavailable errors remain generic and do not set cookies", async () => {
  await start();
  for (const [error, status] of [[new UnauthorizedException("private-fixture-marker"), 401], [new ForbiddenException("private-fixture-marker"), 403], [new ServiceUnavailableException("private-fixture-marker"), 503]]) {
    failure = error;
    const response = await post();
    assert.equal(response.status, status);
    assert.ok(!JSON.stringify(await assertDocumentedResponse(response, path, "post")).includes("private-fixture-marker"));
    assert.equal(response.headers.get("set-cookie"), null);
  }
  failure = undefined;
  assert.equal((await post({ headers: { Authorization: "", Cookie: "__session=private-fixture-marker" } })).status, 401);
});

test("the real bootstrap verifier remains unavailable when disabled or used in production", async () => {
  for (const [mode, enabled] of [["test", "false"], ["production", "true"]]) {
    process.env.NODE_ENV = mode;
    process.env.GROUPIFY_DEV_AUTH_ENABLED = enabled;
    await start(false);
    const response = await post();
    assert.equal(response.status, 503);
    await assertDocumentedResponse(response, path, "post");
    await app.close(); app = undefined;
  }
});

test("bootstrap exposes no GET account listing or profile/lifecycle route", async () => {
  await start();
  for (const resource of [path, "/v1/accounts", "/v1/me/profile", "/v1/me/deletion"]) {
    const response = await fetch(`${url}${resource}`);
    assert.equal(response.status, 404);
    await assertSharedErrorResponse(response);
  }
});
