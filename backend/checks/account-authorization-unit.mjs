import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { UnauthorizedException } from "@nestjs/common";

const require = createRequire(import.meta.url);
const { AccountAuthorizationService } = require("../dist/accounts/account-authorization.service.js");
const identity = Object.freeze({ provider: "clerk", issuer: "https://identity.example.test", subject: "user_fixture", sessionId: "sess_fixture" });
let previous;
beforeEach(() => { previous = process.env.DATABASE_URL; });
afterEach(() => {
  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;
});

test("provider authentication fails before account database access", async () => {
  process.env.DATABASE_URL = "private-fixture-marker";
  const service = new AccountAuthorizationService({ verifyBearer: async () => { throw new UnauthorizedException(); } });
  let called = false;
  await assert.rejects(service.withActiveAccount(undefined, async () => { called = true; }), (error) => error.getStatus() === 401);
  assert.equal(called, false);
});

test("absent account database configuration fails unavailable without running an operation", async () => {
  delete process.env.DATABASE_URL;
  const service = new AccountAuthorizationService({ verifyBearer: async () => identity });
  let called = false;
  await assert.rejects(service.withActiveAccount("fixture", async () => { called = true; }), (error) => {
    assert.equal(error.getStatus(), 503);
    assert.equal(error.message, "Account authorization is unavailable");
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(called, false);
});

test("malformed account database configuration is sanitized and fails closed", async () => {
  process.env.DATABASE_URL = "postgresql://private-fixture-marker@127.0.0.1:invalid/database";
  const service = new AccountAuthorizationService({ verifyBearer: async () => identity });
  let called = false;
  await assert.rejects(service.withActiveAccount("fixture", async () => { called = true; }), (error) => {
    assert.equal(error.getStatus(), 503);
    assert.equal(error.message, "Account authorization is unavailable");
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(called, false);
});
