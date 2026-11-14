import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { ForbiddenException } from "@nestjs/common";

const require = createRequire(import.meta.url);
const { RideLifecycleService } = require("../dist/rides/ride-lifecycle.service.js");
const id = "11111111-1111-4111-8111-111111111111";
const communityId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const started_at = new Date("2026-01-01T00:00:00.000Z");
const ended_at = new Date("2026-01-01T01:00:00.000Z");
function fixture(rows) {
  const calls = []; const queries = [];
  const service = new RideLifecycleService({ withManagementCapability: async (...args) => {
    calls.push(args.slice(0, 3));
    return args[3]({ query: async (...query) => { queries.push(query); return { rows: rows.shift() }; } }, { communityId, accountId, role: "Leader" });
  } });
  return { service, calls, queries };
}

test("lifecycle methods delegate to current community ride management and derive immutable transition results", async () => {
  for (const action of ["start", "end"]) {
    const state = action === "start" ? "active" : "completed";
    const { service, calls, queries } = fixture([
      [{ id, community_id: communityId, state: action === "start" ? "draft" : "active", started_at: action === "start" ? null : started_at, ended_at: null }],
      [{ id, community_id: communityId, state, started_at, ended_at: action === "start" ? null : ended_at }],
    ]);
    const value = await service[action]("fixture", communityId, id);
    assert.deepEqual(calls, [["fixture", communityId, "manage_rides"]]);
    assert.deepEqual(queries[0][1], [id, communityId]); assert.deepEqual(queries[1][1], [id, accountId]);
    assert.deepEqual(value, { id, communityId, state, startedAt: started_at.toISOString(), endedAt: action === "start" ? null : ended_at.toISOString() });
    assert.ok(Object.isFrozen(value));
  }
});

test("invalid IDs and missing scoped rides fail safely; authority denial never enters protected SQL", async () => {
  const { service, queries } = fixture([[]]);
  for (const value of [undefined, null, {}, "", `${id}\n`, `${id}' OR TRUE --`]) {
    await assert.rejects(service.start("fixture", communityId, value), (error) => error.getStatus() === 400);
  }
  assert.equal(queries.length, 0);
  await assert.rejects(service.end("fixture", communityId, id), (error) => error.getStatus() === 404);
  const denied = new RideLifecycleService({ withManagementCapability: async () => { throw new ForbiddenException(); } });
  await assert.rejects(denied.start("fixture", communityId, id), (error) => error.getStatus() === 403);
});

test("retries preserve current metadata and invalid state transitions issue no update", async () => {
  for (const [action, state, status] of [["start", "active", null], ["end", "completed", null], ["start", "completed", 409], ["end", "draft", 409]]) {
    const { service, queries } = fixture([[{ id, community_id: communityId, state, started_at: state === "draft" ? null : started_at, ended_at: state === "completed" ? ended_at : null }]]);
    if (status) await assert.rejects(service[action]("fixture", communityId, id), (error) => error.getStatus() === status);
    else assert.equal((await service[action]("fixture", communityId, id)).state, state);
    assert.equal(queries.length, 1);
  }
});
