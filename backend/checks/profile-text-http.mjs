import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createRequire } from "node:module";
import { HttpException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { assertDocumentedResponse, assertSharedErrorResponse } from "./api-contract.mjs";
import { rawGet } from "./raw-get.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { ProfileTextService } = require("../dist/profiles/profile-text.service.js");
const path = "/v1/me/profile";
const profile = { profileId: "11111111-1111-4111-8111-111111111111", displayName: "Fixture rider", riderType: "bicycle", vehicleDescription: null, version: "7" };
const tag = `"profile-${profile.profileId}-${profile.version}"`;
let app;
const previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_AUTH_ENABLED: process.env.GROUPIFY_DEV_AUTH_ENABLED, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED };
afterEach(async () => {
  await app?.close(); app = undefined;
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function validator() {
  let queries = 0;
  const service = new ProfileTextService({ withActiveAccount: async (_authorization, operation) => operation({ query: async () => { queries += 1; throw new Error("Unexpected SQL before validation"); } }, { id: "fixture-account" }) });
  return { service, noQueries: () => assert.equal(queries, 0) };
}

test("invalid profile inputs and immutable/photo fields fail before SQL writes", async () => {
  const { service, noQueries } = validator();
  const base = { displayName: "Fixture", riderType: "motorcycle" };
  for (const body of [undefined, null, [], {}, { displayName: "Fixture" }, { riderType: "bicycle" },
    { ...base, displayName: " " }, { ...base, displayName: "🚲".repeat(81) }, { ...base, displayName: "A\ud800B" },
    { ...base, riderType: ["motorcycle", "bicycle"] }, { ...base, riderType: "Leader" },
    { ...base, vehicleDescription: 1 }, { ...base, vehicleDescription: "x".repeat(161) }, { ...base, vehicleDescription: "A\nB" },
    { ...base, accountId: "private-fixture-marker" }, { ...base, profileId: "private-fixture-marker" }, { ...base, role: "Leader" }, { ...base, photoAssetId: "private-fixture-marker" },
  ]) await assert.rejects(service.create("fixture", body), (error) => error.getStatus() === 400);
  for (const body of [{}, { version: "7" }, { photoUrl: "https://private-fixture-marker.invalid" }, { displayName: null }, { vehicleDescription: undefined }]) {
    await assert.rejects(service.update("fixture", tag, body), (error) => error.getStatus() === 400);
  }
  noQueries();
});

test("PATCH requires a strong bounded bigint ETag before any update", async () => {
  const { service, noQueries } = validator();
  await assert.rejects(service.update("fixture", undefined, { displayName: "Fixture" }), (error) => error.getStatus() === 428);
  for (const value of [null, [], "*", `W/${tag}`, `"profile-${profile.profileId}-0"`, `${tag}, ${tag}`, `"profile-${profile.profileId}-9223372036854775808"`, `${tag}\n`, '"profile-7"']) {
    await assert.rejects(service.update("fixture", value, { displayName: "Fixture" }), (error) => error.getStatus() === 400);
  }
  noQueries();
});

async function start(stub = true) {
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  app = await NestFactory.create(AppModule, { logger: false });
  const calls = [];
  if (stub) for (const method of ["get", "create", "update"]) app.get(ProfileTextService)[method] = async (...args) => { calls.push({ method, args }); return profile; };
  await app.listen(0, "127.0.0.1");
  return { url: await app.getUrl(), calls };
}
function request(url, method, options = {}) {
  return fetch(`${url}${path}${options.query ?? ""}`, { method, headers: { Authorization: "Bearer fixture-only-marker", "Content-Type": "application/json", ...options.headers },
    ...(method === "GET" ? {} : { body: JSON.stringify(options.body ?? { displayName: "Fixture", riderType: "bicycle" }) }) });
}

test("profile controller returns strict text shape, no-store and matching strong ETags", async () => {
  const { url, calls } = await start();
  for (const method of ["GET", "POST", "PATCH"]) {
    const response = await request(url, method, { headers: { "If-Match": tag } });
    assert.equal(response.status, method === "POST" ? 201 : 200);
    assert.deepEqual(await assertDocumentedResponse(response, path, method.toLowerCase()), profile);
    assert.equal(response.headers.get("etag"), tag);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.deepEqual(calls.map((call) => call.method), ["get", "create", "update"]);
  assert.ok(calls.every((call) => call.args[0] === "Bearer fixture-only-marker"));
  assert.equal(calls[2].args[1], tag);
});

test("conditional profile reads keep no-store metadata and call the service before a bodyless 304", async () => {
  const { url, calls } = await start();
  const headers = { Authorization: "Bearer fixture-only-marker", "X-Request-Id": "private-fixture-marker" };
  for (const condition of [tag, `W/${tag}`, `"unrelated", ${tag}`, "*"]) {
    const result = await rawGet(`${url}${path}`, { ...headers, "If-None-Match": condition });
    assert.equal(result.status, 304);
    assert.equal(await assertDocumentedResponse(result, path), null);
    assert.equal(result.headers.get("etag"), tag);
    assert.notEqual(result.headers.get("x-request-id"), headers["X-Request-Id"]);
    assert.equal(result.headers.get("set-cookie"), null);
    assert.equal(result.headers.get("content-type"), null);
  }
  const unmatched = await rawGet(`${url}${path}`, { ...headers, "If-None-Match": '"unrelated"' });
  assert.equal(unmatched.status, 200);
  assert.deepEqual(await assertDocumentedResponse(unmatched, path), profile);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((call) => call.method === "get" && call.args[0] === headers.Authorization));
});

test("conditional profile headers never replace authentication, active-account or not-found failures", async () => {
  const { url } = await start();
  let checks = 0;
  for (const status of [401, 403, 404, 503]) {
    app.get(ProfileTextService).get = async () => { checks += 1; throw new HttpException("private-fixture-marker", status); };
    for (const condition of [tag, "*"]) {
      const result = await rawGet(`${url}${path}`, { Authorization: "Bearer fixture-only-marker", "If-None-Match": condition });
      assert.equal(result.status, status);
      assert.ok(!JSON.stringify(await assertDocumentedResponse(result, path)).includes("private-fixture-marker"));
      assert.doesNotMatch(result.headers.get("etag") ?? "", /profile-/);
    }
  }
  assert.equal(checks, 8);
});

test("profile errors keep safe status codes and omit version/identity details", async () => {
  const { url } = await start();
  for (const status of [400, 401, 403, 404, 409, 412, 428, 503]) {
    app.get(ProfileTextService).update = async () => { throw new HttpException("private-fixture-marker", status); };
    const response = await request(url, "PATCH");
    assert.equal(response.status, status);
    assert.ok(!JSON.stringify(await assertDocumentedResponse(response, path, "patch")).includes("private-fixture-marker"));
    assert.doesNotMatch(response.headers.get("etag") ?? "", /profile-/);
  }
});

test("profile query selectors and other-account routes cannot reach the service", async () => {
  const { url, calls } = await start();
  const query = await request(url, "GET", { query: "?accountId=private-fixture-marker" });
  assert.equal(query.status, 400);
  await assertDocumentedResponse(query, path);
  const other = await fetch(`${url}/v1/users/11111111-1111-4111-8111-111111111111/profile`);
  assert.equal(other.status, 404);
  await assertSharedErrorResponse(other);
  for (const method of ["POST", "PATCH"]) {
    const response = await fetch(`${url}${path}`, { method, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "displayName=private-fixture-marker" });
    assert.equal(response.status, 415);
    await assertDocumentedResponse(response, path, method.toLowerCase());
  }
  assert.equal(calls.length, 0);
});

test("real self-profile verification stays unavailable when disabled and in production", async () => {
  for (const [mode, flag] of [["test", "false"], ["production", "true"]]) {
    process.env.NODE_ENV = mode; process.env.GROUPIFY_DEV_AUTH_ENABLED = flag;
    const { url } = await start(false);
    const response = await request(url, "GET");
    assert.equal(response.status, 503);
    await assertDocumentedResponse(response, path);
    await app.close(); app = undefined;
  }
});
