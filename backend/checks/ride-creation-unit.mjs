import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { ForbiddenException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { assertSharedErrorResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { RideCreationService } = require("../dist/rides/ride-creation.service.js");
const { AppModule } = require("../dist/app.module.js");
const communityId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";

function fixture(rows = []) {
  const calls = [];
  const queries = [];
  const service = new RideCreationService({ withManagementCapability: async (...args) => {
    calls.push(args.slice(0, 3));
    return args[3]({ query: async (...query) => { queries.push(query); return { rows }; } }, { communityId, accountId, role: "Co-leader" });
  } });
  return { service, calls, queries };
}

test("ride drafts reject unknown selectors, lifecycle grants and malformed internal schedules before SQL", async () => {
  const { service, queries } = fixture();
  for (const input of [undefined, null, [], "immediate", {}, { mode: "active" },
    { mode: "immediate", scheduledFor: null }, { mode: "immediate", accountId }, { mode: "immediate", state: "active" },
    { mode: "immediate", leaderId: accountId }, { mode: "immediate", participants: [] }, { mode: "immediate", tracking: true },
    { mode: "scheduled" }, { mode: "scheduled", scheduledFor: "2099-01-01T00:00:00.000Z" },
    { mode: "scheduled", scheduledFor: new Date(NaN) }, { mode: "scheduled", scheduledFor: new Date("0000-01-01T00:00:00.000Z") },
    { mode: "scheduled", scheduledFor: new Date("+010000-01-01T00:00:00.000Z") },
    Object.assign(Object.create({ mode: "immediate" }), { accountId }),
  ]) await assert.rejects(service.create("fixture", communityId, input), (error) => error.getStatus() === 400);
  assert.equal(queries.length, 0);
});

test("ride creation reuses the scoped management seam and returns only immutable non-active metadata", async () => {
  for (const mode of ["immediate", "scheduled"]) {
    const date = mode === "scheduled" ? new Date("2099-01-01T00:00:00.000Z") : null;
    const { service, calls, queries } = fixture([{ id, community_id: communityId, mode, scheduled_for: date, state: "draft" }]);
    const input = date ? { mode, scheduledFor: date } : { mode };
    const value = await service.create("fixture", communityId, input);
    assert.deepEqual(calls, [["fixture", communityId, "manage_rides"]]);
    assert.deepEqual(queries[0][1], [communityId, accountId, mode, date?.toISOString() ?? null]);
    assert.deepEqual(value, { id, communityId, mode, scheduledFor: date?.toISOString() ?? null, state: "draft" });
    assert.ok(Object.isFrozen(value));
  }
});

test("denied management never enters a write and database-rejected schedule is a safe bad request", async () => {
  const denied = new RideCreationService({ withManagementCapability: async () => { throw new ForbiddenException(); } });
  await assert.rejects(denied.create("fixture", communityId, { mode: "immediate" }), (error) => error.getStatus() === 403);
  const { service, queries } = fixture();
  await assert.rejects(service.create("fixture", communityId, { mode: "scheduled", scheduledFor: new Date(0) }), (error) => error.getStatus() === 400);
  assert.equal(queries.length, 1);
});

test("internal ride composition exposes no ride, participant or lifecycle HTTP route", async () => {
  const previous = process.env.GROUPIFY_DEV_WS_ENABLED;
  process.env.GROUPIFY_DEV_WS_ENABLED = "false";
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const url = await app.getUrl();
    for (const [method, route] of [["POST", "/v1/rides"], ["GET", `/v1/rides/${id}`],
      ["POST", `/v1/communities/${communityId}/rides`], ["POST", `/v1/rides/${id}/join`], ["POST", `/v1/rides/${id}/start`], ["POST", `/v1/rides/${id}/end`]]) {
      const response = await fetch(`${url}${route}`, { method });
      assert.equal(response.status, 404); await assertSharedErrorResponse(response);
    }
  } finally {
    await app.close();
    if (previous === undefined) delete process.env.GROUPIFY_DEV_WS_ENABLED; else process.env.GROUPIFY_DEV_WS_ENABLED = previous;
  }
});
