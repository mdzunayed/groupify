import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { createRequire } from "node:module";

import { Controller, Inject, Module, Post, Req } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { assertSharedErrorResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { DevelopmentIdentityService } = require("../dist/identity/development-identity.service.js");
const issuer = "https://identity-fixture.clerk.accounts.dev";
const party = "https://client.example.test";
// Ephemeral signing material only: never written, logged, or sent to a provider.
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const environment = {
  NODE_ENV: "test", GROUPIFY_DEV_AUTH_ENABLED: "true", CLERK_ISSUER: issuer,
  CLERK_AUDIENCE: "groupify-development", CLERK_AUTHORIZED_PARTIES: party,
  CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("identity-fixture.clerk.accounts.dev$").toString("base64")}`,
  CLERK_SECRET_KEY: "sk_test_fixture_only_not_a_real_key",
  CLERK_JWT_KEY: keys.publicKey.export({ type: "spki", format: "pem" }),
};
const { AppModule } = require("../dist/app.module.js");
const { IdentityModule } = require("../dist/identity/identity.module.js");
const loopbackFetch = globalThis.fetch;
let app;
let baseUrl;
// Test-only controller: no corresponding product endpoint is registered.
class IdentityProbe {
  constructor(identity) { this.identity = identity; }
  async verify(request) {
    await this.identity.verifyBearer(request.headers.authorization);
    return { verified: true };
  }
}
Inject(DevelopmentIdentityService)(IdentityProbe, undefined, 0);
Controller("identity-probe")(IdentityProbe);
Post()(IdentityProbe.prototype, "verify", Object.getOwnPropertyDescriptor(IdentityProbe.prototype, "verify"));
Req()(IdentityProbe.prototype, "verify", 0);
class IdentityProbeModule {}
Module({ imports: [AppModule, IdentityModule], controllers: [IdentityProbe] })(IdentityProbeModule);
before(async () => {
  app = await NestFactory.create(IdentityProbeModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});
after(async () => { if (app) await app.close(); });
let previous;
let fetchMock;
let output;

function providerSession(overrides = {}) {
  return { object: "session", id: "sess_fixture", user_id: "user_fixture", status: "active", actor: null,
    expire_at: Date.now() + 60000, abandon_at: Date.now() + 60000, ...overrides };
}

beforeEach(() => {
  previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  fetchMock = mock.method(globalThis, "fetch", async () => Response.json(providerSession()));
  output = [];
  for (const method of ["log", "warn", "error"]) mock.method(console, method, (...args) => { output.push(args); });
});
afterEach(() => {
  const fetchCalls = fetchMock.mock.calls;
  const outputCount = output.length;
  mock.restoreAll();
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  for (const { arguments: [url, options] } of fetchCalls) {
    assert.equal(url, "https://api.clerk.com/v1/sessions/sess_fixture", "Only the verified session may be looked up");
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, `Bearer ${environment.CLERK_SECRET_KEY}`);
    assert.equal(options.headers["Clerk-API-Version"], "2026-05-12");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.body, undefined);
    assert.equal(options.headers.Cookie, undefined);
  }
  assert.equal(outputCount, 0, "No SDK or application output may expose rejected-token details");
});

function bearer(overrides = {}, headerOverrides = {}, privateKey = keys.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { v: 2, sts: "active", iss: issuer, sub: "user_fixture", sid: "sess_fixture",
    aud: environment.CLERK_AUDIENCE, azp: party, iat: now - 10, nbf: now - 10, exp: now + 120,
    ...overrides };
  // Session-token category required by the pinned Clerk backend SDK 3.28.0.
  const header = { typ: "JWT", alg: "RS256", kid: "fixture-key", cat: "cl_B7d4PD111AAA", ...headerOverrides };
  const data = [header, payload].map((value) => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
  return `Bearer ${data}.${sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url")}`;
}
async function rejected(value, status = 401, lookup = false) {
  const before = fetchMock.mock.callCount();
  await assert.rejects(new DevelopmentIdentityService().verifyBearer(value), (error) => {
    assert.equal(error.getStatus(), status);
    assert.equal(error.message, status === 401 ? "Authentication is required" : "Development identity verification is unavailable");
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(fetchMock.mock.callCount() - before, lookup ? 1 : 0, "Invalid local credentials must not reach the provider");
}

test("a signed token with active provider status returns only external identity, not account permissions", async () => {
  const identity = await new DevelopmentIdentityService().verifyBearer(bearer());
  assert.deepEqual(identity, { provider: "clerk", issuer, subject: "user_fixture", sessionId: "sess_fixture" });
  assert.ok(Object.isFrozen(identity));
  assert.equal((await new DevelopmentIdentityService().verifyBearer(bearer().replace("Bearer ", "bearer "))).subject, identity.subject);
  assert.equal(fetchMock.mock.callCount(), 2, "Each verification checks current provider status");
});

test("configured audience can match one entry in a verified audience list", async () => {
  const identity = await new DevelopmentIdentityService().verifyBearer(bearer({ aud: ["another-api", environment.CLERK_AUDIENCE] }));
  assert.equal(identity.subject, "user_fixture");
});

test("missing configuration, disabled mode and production use fail closed", async () => {
  for (const key of Object.keys(environment)) {
    const original = process.env[key];
    delete process.env[key];
    await rejected(bearer(), 503);
    process.env[key] = original;
  }
  process.env.GROUPIFY_DEV_AUTH_ENABLED = "false";
  await rejected(bearer(), 503);
  process.env.GROUPIFY_DEV_AUTH_ENABLED = "true";
  process.env.NODE_ENV = "production";
  await rejected(bearer(), 503);
});

test("invalid issuer, parties, key configuration and production publishable keys fail closed", async () => {
  const invalid = [
    ["CLERK_ISSUER", "http://issuer.example.test"],
    ["CLERK_ISSUER", "https://user:password@example.test"],
    ["CLERK_ISSUER", "https://example.test/path"],
    ["CLERK_AUTHORIZED_PARTIES", "https://client.example.test/path"],
    ["CLERK_AUTHORIZED_PARTIES", "http://client.example.test"],
    ["CLERK_AUTHORIZED_PARTIES", `${party},`],
    ["CLERK_JWT_KEY", "invalid-public-key"],
    ["CLERK_JWT_KEY", keys.privateKey.export({ type: "pkcs8", format: "pem" })],
    ["CLERK_PUBLISHABLE_KEY", "pk_live_fixture"],
    ["CLERK_SECRET_KEY", "sk_live_fixture"],
  ];
  for (const [key, value] of invalid) {
    process.env[key] = value;
    await rejected(bearer(), 503);
    process.env[key] = environment[key];
  }
});

test("absent/malformed bearer, cookie-only values and machine tokens are rejected", async () => {
  for (const value of [undefined, null, [], {}, "", "Basic fixture", "__session=fixture", "Bearer fixture", `${bearer()},extra`, bearer().replace("Bearer ", "Bearer  ")]) {
    await rejected(value);
  }
  await rejected(bearer({}, { cat: "cl_B7d4PD222AAA" }));
  await rejected(bearer({}, { cat: "machine_token" }));
  await rejected(bearer({}, { alg: "HS256" }));
});

test("wrong signatures and tampered payloads are rejected by the actual SDK", async () => {
  await rejected(bearer({}, {}, otherKeys.privateKey));
  const parts = bearer().split(".");
  parts[1] = Buffer.from(JSON.stringify({ sub: "tampered", sid: "sess_fixture" })).toString("base64url");
  await rejected(parts.join("."));
});

test("wrong or missing issuer, audience and authorized party are rejected", async () => {
  for (const claims of [
    { iss: "https://wrong.example.test" }, { iss: undefined },
    { aud: "wrong-api" }, { aud: undefined }, { aud: [] }, { aud: [42, environment.CLERK_AUDIENCE] },
    { azp: "https://wrong.example.test" }, { azp: undefined },
  ]) await rejected(bearer(claims));
});

test("expired, future or missing time claims are rejected without refresh", async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [
    { exp: now - 1 }, { nbf: now + 60 }, { iat: now + 60 },
    { iat: undefined }, { nbf: undefined }, { exp: undefined },
    { exp: now - 20, iat: now - 10 }, { exp: now + 10.5 },
  ]) await rejected(bearer(claims));
});

test("pending/unknown session states, missing identity and actor tokens are rejected", async () => {
  for (const claims of [
    { sts: "pending" }, { sts: "revoked" }, { sts: undefined },
    { sub: "" }, { sub: " " }, { sid: "" }, { sid: " " }, { sid: 42 }, { sid: {} }, { sid: undefined },
    { sid: ".." }, { sid: "sess_fixture/../users" }, { sid: "sess_fixture?private=marker" },
    { v: 1 }, { v: undefined }, { act: { sub: "actor_fixture" } },
  ]) await rejected(bearer(claims));
});

test("provider revocation is checked again even while the same signed JWT remains valid", async () => {
  const token = bearer();
  const service = new DevelopmentIdentityService();
  await service.verifyBearer(token);
  fetchMock.mock.mockImplementation(async () => Response.json(providerSession({ status: "revoked" })));
  await rejected(token, 401, true);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("non-active, missing and mismatched provider sessions do not authenticate", async () => {
  for (const status of ["revoked", "ended", "expired", "removed", "abandoned", "replaced", "pending", "unknown", undefined]) {
    fetchMock.mock.mockImplementation(async () => Response.json(providerSession({ status })));
    await rejected(bearer(), 401, true);
  }
  for (const overrides of [
    { id: "sess_other" }, { user_id: "user_other" }, { object: "user" },
    { actor: { sub: "user_actor" } }, { id: undefined }, { user_id: undefined },
    { expire_at: Date.now() - 1 }, { abandon_at: Date.now() - 1 },
    { expire_at: undefined }, { abandon_at: undefined }, { expire_at: "future" }, { abandon_at: 1.5 },
  ]) {
    fetchMock.mock.mockImplementation(async () => Response.json(providerSession(overrides)));
    await rejected(bearer(), 401, true);
  }
  for (const response of [null, [], {}, "private-fixture-marker"]) {
    fetchMock.mock.mockImplementation(async () => Response.json(response));
    await rejected(bearer(), 401, true);
  }
  fetchMock.mock.mockImplementation(async () => Response.json({ private: "private-fixture-marker" }, { status: 404 }));
  await rejected(bearer(), 401, true);
});

test("provider credential errors, limits, server errors and malformed JSON fail unavailable without fallback", async () => {
  for (const status of [301, 400, 401, 403, 429, 500, 503]) {
    let response;
    fetchMock.mock.mockImplementation(async () => {
      response = Response.json({ private: "private-fixture-marker" }, { status });
      return response;
    });
    await rejected(bearer(), 503, true);
    assert.equal(response.bodyUsed, true, "Error response bodies are cancelled without parsing details");
  }
  fetchMock.mock.mockImplementation(async () => new Response("private-fixture-marker", { status: 200 }));
  await rejected(bearer(), 503, true);
  fetchMock.mock.mockImplementation(async () => { throw new Error("private-fixture-marker"); });
  await rejected(bearer(), 503, true);
});

test("provider requests use a cancellable 2500ms deadline and abort fails unavailable", async () => {
  mock.method(AbortSignal, "timeout", (milliseconds) => {
    assert.equal(milliseconds, 2500);
    return AbortSignal.abort(new DOMException("private-fixture-marker", "TimeoutError"));
  });
  fetchMock.mock.mockImplementation(async (_url, { signal }) => { signal.throwIfAborted(); });
  await rejected(bearer(), 503, true);
});

test("a token expiring during the provider lookup cannot authenticate", async () => {
  const now = Date.now();
  fetchMock.mock.mockImplementation(async () => {
    mock.method(Date, "now", () => now + 200000);
    return Response.json(providerSession());
  });
  await rejected(bearer(), 401, true);
});


test("HTTP consumers receive safe 401/503 errors without token or SDK details", async () => {
  process.env.GROUPIFY_DEV_AUTH_ENABLED = "false";
  const unavailable = await loopbackFetch(`${baseUrl}/identity-probe`, { method: "POST" });
  assert.equal(unavailable.status, 503);
  await assertSharedErrorResponse(unavailable);
  process.env.GROUPIFY_DEV_AUTH_ENABLED = "true";
  const invalid = await loopbackFetch(`${baseUrl}/identity-probe`, {
    method: "POST", headers: { Authorization: bearer({ iss: "https://private-fixture-marker.example.test" }) },
  });
  assert.equal(invalid.status, 401);
  const body = await assertSharedErrorResponse(invalid);
  assert.equal(body.message, "Authentication is required.");
  assert.ok(!JSON.stringify(body).includes("private-fixture-marker"));
  assert.equal(invalid.headers.get("set-cookie"), null);
  const valid = await loopbackFetch(`${baseUrl}/identity-probe`, { method: "POST", headers: { Authorization: bearer() } });
  assert.equal(valid.status, 201);
  assert.deepEqual(await valid.json(), { verified: true });
  assert.equal(valid.headers.get("set-cookie"), null);
  fetchMock.mock.mockImplementation(async () => Response.json(providerSession({ status: "revoked" })));
  const revoked = await loopbackFetch(`${baseUrl}/identity-probe`, { method: "POST", headers: { Authorization: bearer() } });
  assert.equal(revoked.status, 401);
  await assertSharedErrorResponse(revoked);
  fetchMock.mock.mockImplementation(async () => { throw new Error("private-provider-marker"); });
  const down = await loopbackFetch(`${baseUrl}/identity-probe`, { method: "POST", headers: { Authorization: bearer() } });
  assert.equal(down.status, 503);
  const downBody = await assertSharedErrorResponse(down);
  assert.ok(!JSON.stringify(downBody).includes("private-provider-marker"));
});

test("public liveness is available even when development identity is disabled", async () => {
  delete process.env.GROUPIFY_DEV_AUTH_ENABLED;
  const response = await loopbackFetch(`${baseUrl}/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("changing the pinned public key rejects prior signatures and accepts the replacement key", async () => {
  const service = new DevelopmentIdentityService();
  const oldToken = bearer();
  await service.verifyBearer(oldToken);
  process.env.CLERK_JWT_KEY = otherKeys.publicKey.export({ type: "spki", format: "pem" });
  await rejected(oldToken);
  assert.equal((await service.verifyBearer(bearer({}, {}, otherKeys.privateKey))).subject, "user_fixture");
});
