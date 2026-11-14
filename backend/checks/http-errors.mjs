import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";

import { Controller, Get, Post, Param, HttpException, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { assertSharedErrorResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const marker = "synthetic-private-error-marker";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const capturedErrors = [];
let app;
let baseUrl;

// Test-only endpoints; these are never registered in the production AppModule.
class FailureController {
  unexpected() { throw new Error(marker, { cause: new Error(marker) }); }
  client() { throw new HttpException({ message: [marker], details: marker }, 403); }
  unusual() { throw new HttpException(marker, 418); }
  invalidStatus() { throw new HttpException(marker, 200); }
  json() { return { accepted: true }; }
  status(value) { throw new HttpException(marker, Number(value)); }
}
Controller("checks")(FailureController);
for (const [method, decorator] of [
  ["unexpected", Post("unexpected")], ["client", Get("client")],
  ["unusual", Get("unusual")], ["invalidStatus", Get("invalid-status")], ["json", Post("json")], ["status", Get("status/:status")],
]) {
  decorator(FailureController.prototype, method, Object.getOwnPropertyDescriptor(FailureController.prototype, method));
}
Param("status")(FailureController.prototype, "status", 0);
class FailureModule {}
Module({ imports: [AppModule], controllers: [FailureController] })(FailureModule);

before(async () => {
  app = await NestFactory.create(FailureModule, {
    logger: { log() {}, warn() {}, error(...args) { capturedErrors.push(args); } },
  });
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});
after(async () => { if (app) await app.close(); });

async function errorResponse(response, statusCode, code) {
  await assertSharedErrorResponse(response);
  assert.equal(response.status, statusCode);
  assert.match(response.headers.get("x-request-id"), uuid);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["code", "message", "requestId", "statusCode"]);
  assert.equal(body.statusCode, statusCode);
  assert.equal(body.code, code);
  assert.equal(body.requestId, response.headers.get("x-request-id"));
  assert.equal(typeof body.message, "string");
  assert.ok(!JSON.stringify(body).includes(marker));
  return body;
}

test("success preserves its payload and replaces untrusted request IDs with fresh UUIDs", async () => {
  const ids = new Set();
  for (const incoming of [marker, "a".repeat(4096), "11111111-1111-4111-8111-111111111111"]) {
    const response = await fetch(`${baseUrl}/health/live`, { headers: { "X-Request-Id": incoming } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    const id = response.headers.get("x-request-id");
    assert.match(id, uuid);
    assert.notEqual(id, incoming);
    ids.add(id);
  }
  assert.equal(ids.size, 3);
});

test("unknown routes, root requests and wrong methods use the same safe envelope", async () => {
  for (const [path, method] of [[`/missing/${marker}?token=${marker}`, "GET"], ["/", "GET"], ["/health/live", "POST"]]) {
    const body = await errorResponse(await fetch(`${baseUrl}${path}`, { method }), 404, "NOT_FOUND");
    assert.equal(body.message, "The requested resource was not found.");
  }
});

test("known HTTP errors never reflect arbitrary exception response content", async () => {
  const body = await errorResponse(await fetch(`${baseUrl}/checks/client`), 403, "FORBIDDEN");
  assert.equal(body.message, "This action is not permitted.");
});

test("unexpected errors have a safe response and an allowlisted correlated log", async () => {
  const body = await errorResponse(await fetch(`${baseUrl}/checks/unexpected?token=${marker}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${marker}`, Cookie: `session=${marker}`, "Content-Type": "application/json" },
    body: JSON.stringify({ privateData: marker }),
  }), 500, "INTERNAL_ERROR");
  assert.equal(body.message, "An unexpected error occurred.");
  assert.deepEqual(capturedErrors.at(-1)[0], {
    event: "http_error", requestId: body.requestId, statusCode: 500, code: "INTERNAL_ERROR",
  });
  assert.ok(!JSON.stringify(capturedErrors).includes(marker));
});

test("malformed JSON is correlated even before route middleware has run", async () => {
  await errorResponse(await fetch(`${baseUrl}/checks/json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Request-Id": marker },
    body: `{"privateData":"${marker}"`,
  }), 400, "BAD_REQUEST");
  assert.ok(!JSON.stringify(capturedErrors).includes(marker));
});

test("unlisted HTTP errors remain safe and invalid exception statuses become 500", async () => {
  const body = await errorResponse(await fetch(`${baseUrl}/checks/unusual`), 418, "REQUEST_FAILED");
  assert.equal(body.message, "The request could not be completed.");
  await errorResponse(await fetch(`${baseUrl}/checks/invalid-status`), 500, "INTERNAL_ERROR");
});


test("common HTTP status codes have stable safe machine codes", async () => {
  const codes = {
    400: "BAD_REQUEST", 401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED", 408: "REQUEST_TIMEOUT", 409: "CONFLICT", 412: "PRECONDITION_FAILED",
    413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE", 422: "UNPROCESSABLE_ENTITY", 428: "PRECONDITION_REQUIRED",
    429: "TOO_MANY_REQUESTS", 500: "INTERNAL_ERROR", 502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE", 504: "GATEWAY_TIMEOUT",
  };
  for (const [status, code] of Object.entries(codes)) {
    await errorResponse(await fetch(`${baseUrl}/checks/status/${status}`), Number(status), code);
  }
  assert.ok(!JSON.stringify(capturedErrors).includes(marker));
});

test("the existing JSON parser size limit returns a safe 413 rather than 500", async () => {
  await errorResponse(await fetch(`${baseUrl}/checks/json`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: "x".repeat(256 * 1024) }),
  }), 413, "PAYLOAD_TOO_LARGE");
});
