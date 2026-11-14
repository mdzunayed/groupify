import assert from "node:assert/strict";
import { test } from "node:test";

import { createProfileApi, ProfileApiError } from "../src/lib/profile-api.ts";

const id = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const profile = { profileId: id, displayName: "Fixture Rider", riderType: "bicycle", vehicleDescription: null, version: "9007199254740993" };
const etag = `"profile-${id}-${profile.version}"`;
function response(status, body, headers = {}) {
  return { status, headers: new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }), json: async () => body };
}
const saved = () => response(200, profile, { etag });
function fixture(responses = [saved()]) {
  const calls = [];
  const tokens = [];
  const api = createProfileApi({ baseUrl: "https://api.example.invalid/development/", getToken: async (...args) => {
    tokens.push(args); return `fixture_only_token_${tokens.length}`;
  }, fetcher: async (...args) => { calls.push(args); return responses.shift(); } });
  return { api, calls, tokens };
}
function failure(kind) {
  return (error) => error instanceof ProfileApiError && error.kind === kind && error.message === "Rider details request failed." && error.cause === undefined;
}

test("profile client makes explicit bootstrap and independent fresh default-token requests", async () => {
  const { api, calls, tokens } = fixture([response(201, { accountId: id }), saved()]);
  assert.equal(calls.length, 0);
  assert.equal(tokens.length, 0);
  await api.bootstrap();
  const record = await api.get();
  assert.deepEqual(record, { profile, etag });
  assert.ok(Object.isFrozen(record) && Object.isFrozen(record.profile));
  assert.equal(record.profile.version, "9007199254740993");
  assert.deepEqual(tokens, [[], []]);
  assert.deepEqual(calls.map(([url, init]) => [url, init.method]), [
    ["https://api.example.invalid/development/v1/accounts/bootstrap", "POST"],
    ["https://api.example.invalid/development/v1/me/profile", "GET"],
  ]);
  calls.forEach(([, init], index) => {
    assert.equal(init.credentials, "omit");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.Authorization, `Bearer fixture_only_token_${index + 1}`);
    assert.equal(init.headers["Cache-Control"], "no-store");
    assert.equal(init.body, undefined);
  });
});

test("only a correlated JSON profile-not-found response produces an empty form", async () => {
  const missing = { statusCode: 404, code: "NOT_FOUND", message: "Not found.", requestId };
  assert.equal(await fixture([response(404, missing, { "x-request-id": requestId })]).api.get(), null);
  for (const bad of [response(404, missing), response(404, { ...missing, code: "OTHER" }, { "x-request-id": requestId }),
    response(404, missing, { "Content-Type": "text/html", "x-request-id": requestId })]) {
    await assert.rejects(fixture([bad]).api.get(), failure("protocol"));
  }
});

test("profile writes whitelist text fields, preserve explicit clearing and use the complete edit tag", async () => {
  const { api, calls } = fixture([response(201, profile, { etag }), saved()]);
  const record = await api.create({ displayName: "Fixture Rider", riderType: "bicycle", accountId: "ignored", role: "Leader" });
  await api.update({ vehicleDescription: null, role: "Leader", displayName: undefined }, record);
  assert.deepEqual(JSON.parse(calls[0][1].body), { displayName: "Fixture Rider", riderType: "bicycle" });
  assert.deepEqual(JSON.parse(calls[1][1].body), { vehicleDescription: null });
  assert.equal(calls[1][1].headers["If-Match"], etag);
  assert.equal(calls[1][1].headers["Content-Type"], "application/json");
  await assert.rejects(api.update({}, record), failure("invalid"));
  await assert.rejects(api.update({ displayName: "Fixture Rider" }, { ...record, etag: '"1"' }), failure("protocol"));
  assert.equal(calls.length, 2);
});

test("untrusted or absent API configuration never obtains a token or sends a request", () => {
  for (const baseUrl of [undefined, "", "http://api.example.invalid", "https://user:secret@example.invalid", "https://api.example.invalid?token=x", "https://api.example.invalid#x", "not a URL"]) {
    let accessed = false;
    assert.throws(() => createProfileApi({ baseUrl, getToken: async () => { accessed = true; return null; }, fetcher: async () => { accessed = true; } }), failure("configuration"));
    assert.equal(accessed, false);
  }
});

test("missing, failed or malformed authentication never reaches transport", async () => {
  for (const getToken of [async () => null, async () => "contains space", async () => "fixture\r\nmarker", async () => { throw new Error("synthetic sensitive marker"); }]) {
    let sent = false;
    const api = createProfileApi({ baseUrl: "https://api.example.invalid", getToken, fetcher: async () => { sent = true; } });
    await assert.rejects(api.get(), failure("authentication"));
    assert.equal(sent, false);
  }
});

test("transport, HTTP and malformed response failures expose only fixed client errors", async () => {
  for (const [status, kind] of [[401, "authentication"], [403, "forbidden"], [400, "invalid"], [415, "invalid"], [409, "conflict"], [412, "conflict"], [428, "conflict"], [500, "unavailable"], [503, "unavailable"]]) {
    const result = response(status, "synthetic sensitive marker");
    result.json = async () => { throw new Error("Error bodies must not be consumed"); };
    await assert.rejects(fixture([result]).api.get(), failure(kind));
  }
  const api = createProfileApi({ baseUrl: "https://api.example.invalid", getToken: async () => "fixture", fetcher: async () => { throw new Error("synthetic sensitive marker"); } });
  await assert.rejects(api.get(), failure("network"));
  await assert.rejects(fixture([{ ...saved(), redirected: true }]).api.get(), failure("protocol"));
  await assert.rejects(fixture([{ ...saved(), json: async () => { throw new Error("synthetic sensitive marker"); } }]).api.get(), failure("protocol"));
});

test("response validation rejects profile/tag drift and imprecise or overflowing versions", async () => {
  for (const result of [
    response(200, { ...profile, accountId: id }, { etag }),
    response(200, { ...profile, version: 9007199254740992 }, { etag }),
    response(200, { ...profile, version: "9223372036854775808" }, { etag }),
    response(200, { ...profile, displayName: "\ud800" }, { etag }),
    response(200, { ...profile, riderType: "other" }, { etag }),
    response(200, profile, { etag: `W/${etag}` }),
    response(200, profile, { etag, "Cache-Control": "public" }),
  ]) await assert.rejects(fixture([result]).api.get(), failure("protocol"));
});

test("cancellation before and during token acquisition prevents outgoing requests", async () => {
  const abort = new AbortController();
  abort.abort();
  const first = fixture();
  await assert.rejects(first.api.get(abort.signal), failure("cancelled"));
  assert.deepEqual(first.tokens, []);
  let release;
  let sent = false;
  const api = createProfileApi({ baseUrl: "https://api.example.invalid", getToken: () => new Promise((resolve) => { release = resolve; }), fetcher: async () => { sent = true; } });
  const later = new AbortController();
  const pending = api.get(later.signal);
  later.abort();
  release("fixture_only_token");
  await assert.rejects(pending, failure("cancelled"));
  assert.equal(sent, false);
});
