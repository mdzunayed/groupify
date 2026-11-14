import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createRequire } from "node:module";
import { HttpException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { assertDocumentedResponse, assertSharedErrorResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { RideCreationService } = require("../dist/rides/ride-creation.service.js");
const { RideLifecycleService } = require("../dist/rides/ride-lifecycle.service.js");
const communityId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const path = "/v1/communities/{communityId}/rides";
const base = `/v1/communities/${communityId}/rides`;
const instant = "2099-01-01T00:00:00.000Z";
const previous = { NODE_ENV: process.env.NODE_ENV, GROUPIFY_DEV_AUTH_ENABLED: process.env.GROUPIFY_DEV_AUTH_ENABLED, GROUPIFY_DEV_WS_ENABLED: process.env.GROUPIFY_DEV_WS_ENABLED };
let app;
afterEach(async () => {
  await app?.close(); app = undefined;
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
async function start(stub = true) {
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  app = await NestFactory.create(AppModule, { logger: false });
  const calls = [];
  if (stub) {
    app.get(RideCreationService).create = async (...args) => {
      calls.push(["create", ...args]); const input = args[2];
      return { id, communityId, mode: input.mode, scheduledFor: input.scheduledFor?.toISOString() ?? null, state: "draft", privateFixtureMarker: "hidden" };
    };
    for (const action of ["start", "end"]) app.get(RideLifecycleService)[action] = async (...args) => {
      calls.push([action, ...args]);
      return { id, communityId, state: action === "start" ? "active" : "completed", startedAt: instant, endedAt: action === "start" ? null : instant, privateFixtureMarker: "hidden" };
    };
  }
  await app.listen(0, "127.0.0.1"); return { url: await app.getUrl(), calls };
}
function request(url, action = "create", body = action === "create" ? { mode: "immediate" } : {}, extra = {}) {
  return fetch(`${url}${base}${action === "create" ? "" : `/${id}/${action}`}${extra.query ?? ""}`, {
    method: "POST", headers: { Authorization: "Bearer fixture-only-marker", "Content-Type": "application/json", ...extra.headers },
    ...(extra.empty ? {} : { body: extra.raw ?? JSON.stringify(body) }),
  });
}
function contract(action) { return path + (action === "create" ? "" : `/{rideId}/${action}`); }

test("ride HTTP commands serialize only committed metadata and convert canonical schedules to internal Dates", async () => {
  const { url, calls } = await start();
  for (const mode of ["immediate", "scheduled"]) {
    const response = await request(url, "create", mode === "immediate" ? { mode } : { mode, scheduledFor: instant });
    assert.equal(response.status, 201);
    assert.deepEqual(await assertDocumentedResponse(response, path, "post"), { id, communityId, mode, scheduledFor: mode === "immediate" ? null : instant, state: "draft" });
    assert.equal(response.headers.get("location"), null); assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.deepEqual(calls[0], ["create", "Bearer fixture-only-marker", communityId, { mode: "immediate" }]);
  assert.deepEqual(calls[1][3], { mode: "scheduled", scheduledFor: new Date(instant) });
  for (const action of ["start", "end"]) {
    const response = await request(url, action, {}, { empty: action === "start" });
    assert.equal(response.status, 200);
    const body = await assertDocumentedResponse(response, contract(action), "post");
    assert.deepEqual(Object.keys(body).sort(), ["communityId", "endedAt", "id", "startedAt", "state"]);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.deepEqual(calls.at(-1), [action, "Bearer fixture-only-marker", communityId, id]);
  }
});

test("ride HTTP creation rejects selectors, unsupported intents and noncanonical or impossible schedules", async () => {
  const { url, calls } = await start();
  for (const body of [{}, null, [], { mode: "active" }, { mode: "immediate", accountId: id }, { mode: "immediate", state: "active" },
    { mode: "immediate", scheduledFor: null }, { mode: "scheduled" }, { mode: "scheduled", scheduledFor: 1 },
    ...["2099-01-01T00:00:00Z", "2099-01-01T06:00:00.000+06:00", "2099-02-30T00:00:00.000Z", "2099-01-01T24:00:00.000Z", "0000-01-01T00:00:00.000Z", "+010000-01-01T00:00:00.000Z"].map((scheduledFor) => ({ mode: "scheduled", scheduledFor }))]) {
    const response = await request(url, "create", body); assert.equal(response.status, 400); await assertDocumentedResponse(response, path, "post");
  }
  for (const [extra, status] of [[{ query: "?accountId=private-fixture-marker" }, 400], [{ headers: { "Content-Type": "text/plain" } }, 415], [{ raw: "{" }, 400]]) {
    const response = await request(url, "create", undefined, extra); assert.equal(response.status, status); await assertDocumentedResponse(response, path, "post");
  }
  assert.equal(calls.length, 0);
});

test("start/end HTTP accepts no lifecycle, actor, role, participant or tracking selection", async () => {
  const { url, calls } = await start();
  for (const action of ["start", "end"]) {
    for (const body of [null, [], { state: "active" }, { accountId: id }, { role: "Leader" }, { participants: [] }, { tracking: true }]) {
      const response = await request(url, action, body); assert.equal(response.status, 400); await assertDocumentedResponse(response, contract(action), "post");
    }
    for (const [extra, status] of [[{ query: "?role=Leader" }, 400], [{ headers: { "Content-Type": "text/plain" } }, 415]]) {
      const response = await request(url, action, {}, extra); assert.equal(response.status, status); await assertDocumentedResponse(response, contract(action), "post");
    }
  }
  assert.equal(calls.length, 0);
});

test("ride service failures use safe correlated errors without created-state assertions", async () => {
  const { url } = await start();
  for (const action of ["create", "start", "end"]) {
    const service = app.get(action === "create" ? RideCreationService : RideLifecycleService);
    for (const status of [400, 401, 403, 404, 409, 503]) {
      service[action] = async () => { throw new HttpException("private-fixture-marker", status); };
      const response = await request(url, action); assert.equal(response.status, status);
      const body = await assertDocumentedResponse(response, contract(action), "post");
      assert.ok(!JSON.stringify(body).includes("private-fixture-marker")); assert.equal(body.state, undefined);
    }
  }
});

test("real ride HTTP verification fails closed when disabled or opted in under production", async () => {
  for (const [mode, flag] of [["test", "false"], ["production", "true"]]) {
    process.env.NODE_ENV = mode; process.env.GROUPIFY_DEV_AUTH_ENABLED = flag;
    const { url } = await start(false);
    for (const action of ["create", "start", "end"]) {
      const response = await request(url, action); assert.equal(response.status, 503); await assertDocumentedResponse(response, contract(action), "post");
    }
    await app.close(); app = undefined;
  }
});

test("ride response contracts refuse extra/private fields, wrong mode/time combinations and state drift", async () => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Request-Id": communityId };
  const draft = { id, communityId, mode: "immediate", scheduledFor: null, state: "draft" };
  for (const value of [{ ...draft, actorId: id }, { ...draft, state: "active" }, { ...draft, scheduledFor: instant }, { ...draft, mode: "scheduled" }]) {
    await assert.rejects(assertDocumentedResponse(new Response(JSON.stringify(value), { status: 201, headers }), path, "post"));
  }
  const active = { id, communityId, state: "active", startedAt: instant, endedAt: null };
  for (const value of [{ ...active, endedAt: instant }, { ...active, startedAt: null }, { ...active, state: "completed" }, { ...active, role: "Leader" }]) {
    await assert.rejects(assertDocumentedResponse(new Response(JSON.stringify(value), { headers }), contract("start"), "post"));
  }
});

test("ride commands add no listing, detail, participant, route or active communication endpoints", async () => {
  const { url } = await start();
  for (const [method, suffix] of [["GET", ""], ["GET", `/${id}`], ["POST", `/${id}/join`], ["POST", `/${id}/leave`], ["PATCH", `/${id}/route`], ["POST", `/${id}/chat`], ["POST", `/${id}/tracking`]]) {
    const response = await fetch(`${url}${base}${suffix}`, { method }); assert.equal(response.status, 404); await assertSharedErrorResponse(response);
  }
});
