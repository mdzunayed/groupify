import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createRequire } from "node:module";
import { HttpException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { assertDocumentedResponse, assertSharedErrorResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { CommunityCreationService } = require("../dist/communities/community-creation.service.js");
const path = "/v1/communities";
const fixture = { id: "11111111-1111-4111-8111-111111111111", name: "Fixture riders", role: "Leader" };
const previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_AUTH_ENABLED: process.env.GROUPIFY_DEV_AUTH_ENABLED, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED, GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED: process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED };
let app;
afterEach(async () => {
  await app?.close(); app = undefined;
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
async function start(stub = true, enablePreview = true) {
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  if (enablePreview) {
    process.env.NODE_ENV = "test";
    process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED = "true";
  }
  app = await NestFactory.create(AppModule, { logger: false });
  const calls = [];
  if (stub) app.get(CommunityCreationService).create = async (...args) => { calls.push(args); return { ...fixture, privateFixtureMarker: "hidden" }; };
  await app.listen(0, "127.0.0.1");
  return { url: await app.getUrl(), calls };
}
function request(url, body = { name: fixture.name }, extra = {}) {
  return fetch(`${url}${path}${extra.query ?? ""}`, { method: "POST", headers: { Authorization: "Bearer fixture-only-marker", "Content-Type": "application/json", ...extra.headers }, body: JSON.stringify(body) });
}

test("community POST returns only committed creation metadata and initial Leader", async () => {
  const { url, calls } = await start();
  const result = await request(url);
  assert.equal(result.status, 201);
  assert.deepEqual(await assertDocumentedResponse(result, path, "post"), fixture);
  assert.equal(result.headers.get("set-cookie"), null);
  assert.equal(result.headers.get("location"), null);
  assert.deepEqual(calls, [["Bearer fixture-only-marker", fixture.name]]);
});

test("community POST rejects selectors, extra/role/media inputs and unsupported body formats", async () => {
  const { url, calls } = await start();
  for (const body of [{}, null, [], { title: "Fixture" }, { name: fixture.name, role: "Leader" }, { name: fixture.name, accountId: "private-fixture-marker" }, { name: fixture.name, photoUrl: "private-fixture-marker" }]) {
    const result = await request(url, body);
    assert.equal(result.status, 400); await assertDocumentedResponse(result, path, "post");
  }
  const query = await request(url, undefined, { query: "?accountId=private-fixture-marker" });
  assert.equal(query.status, 400); await assertDocumentedResponse(query, path, "post");
  const form = await fetch(`${url}${path}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "private-fixture-marker" });
  assert.equal(form.status, 415); await assertDocumentedResponse(form, path, "post");
  assert.equal(calls.length, 0);
});

test("community errors remain safe and carry no role or created-resource assertion", async () => {
  const { url } = await start();
  for (const status of [400, 401, 403, 503]) {
    app.get(CommunityCreationService).create = async () => { throw new HttpException("private-fixture-marker", status); };
    const result = await request(url);
    assert.equal(result.status, status);
    const body = await assertDocumentedResponse(result, path, "post");
    assert.ok(!JSON.stringify(body).includes("private-fixture-marker"));
    assert.equal(body.role, undefined); assert.equal(result.headers.get("set-cookie"), null);
  }
});

test("real community verification fails closed when disabled or in production", async () => {
  for (const [mode, flag] of [["test", "false"], ["production", "true"]]) {
    process.env.NODE_ENV = mode; process.env.GROUPIFY_DEV_AUTH_ENABLED = flag;
    process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED = "true";
    const { url } = await start(false, false);
    const result = await request(url);
    assert.equal(result.status, 503); await assertDocumentedResponse(result, path, "post");
    await app.close(); app = undefined;
  }
});

test("community preview is unavailable by default and requires exact opt-in plus non-production mode", async () => {
  for (const [mode, flag] of [["test", undefined], ["test", "false"], ["test", "TRUE"], [undefined, "true"], ["production", "true"]]) {
    if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode;
    if (flag === undefined) delete process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED; else process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED = flag;
    const { url, calls } = await start(true, false);
    const result = await request(url);
    assert.equal(result.status, 503); await assertDocumentedResponse(result, path, "post");
    assert.equal(calls.length, 0);
    await app.close(); app = undefined;
  }
});

test("community creation adds no listing, membership, role or ride route", async () => {
  const { url, calls } = await start();
  for (const [method, suffix] of [["GET", ""], ["GET", `/${fixture.id}`], ["PATCH", `/${fixture.id}`], ["POST", `/${fixture.id}/invitations`], ["PATCH", `/${fixture.id}/members/fixture/role`], ["POST", `/${fixture.id}/rides`]]) {
    const result = await fetch(`${url}${path}${suffix}`, { method });
    assert.equal(result.status, 404); await assertSharedErrorResponse(result);
  }
  assert.equal(calls.length, 0);
});
