import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";

import { NestFactory } from "@nestjs/core";

import { assertDocumentedResponse, assertSharedErrorResponse, loadContract } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
const { HealthService } = require("../dist/health.service.js");
let app;
let baseUrl;
let ready = false;

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  // Route/schema proof only: this deliberately does not prove real dependencies.
  app.get(HealthService).ready = async () => ready;
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});
after(async () => { if (app) await app.close(); });

test("the OpenAPI document describes implemented health and protected development bootstrap operations", async () => {
  const document = await loadContract();
  assert.equal(document.openapi, "3.0.3");
  assert.deepEqual(Object.keys(document.paths).sort(), ["/health/live", "/health/ready", "/v1/accounts/bootstrap"]);
  assert.deepEqual(document.security, []);
  assert.deepEqual(document.paths["/v1/accounts/bootstrap"].post.security, [{ DevelopmentBearer: [] }]);
  assert.equal(document.servers, undefined);
});

test("live HTTP liveness matches the documented payload and headers", async () => {
  const response = await fetch(`${baseUrl}/health/live`);
  assert.equal(response.status, 200);
  await assertDocumentedResponse(response, "/health/live");
});

test("readiness responses match the contract for controlled success and failure", async () => {
  for (const healthy of [false, true]) {
    ready = healthy;
    const response = await fetch(`${baseUrl}/health/ready`);
    assert.equal(response.status, healthy ? 200 : 503);
    await assertDocumentedResponse(response, "/health/ready");
  }
});

test("an unmatched route uses the documented shared error schema", async () => {
  await assertSharedErrorResponse(await fetch(`${baseUrl}/missing`));
});

test("response validation rejects payload, header and correlation drift", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const headers = { "Content-Type": "application/json", "X-Request-Id": id };
  for (const body of [{ status: "wrong" }, { status: "ok", accidentalData: true }]) {
    await assert.rejects(assertDocumentedResponse(new Response(JSON.stringify(body), { headers }), "/health/live"));
  }
  await assert.rejects(assertDocumentedResponse(new Response('{"status":"ok"}', {
    headers: { ...headers, "X-Request-Id": "invalid" },
  }), "/health/live"));
  await assert.rejects(assertDocumentedResponse(new Response('{"status":"ok"}', {
    headers: { "Content-Type": "application/json" },
  }), "/health/live"));
  const body = { statusCode: 503, code: "SERVICE_UNAVAILABLE", message: "Safe error", requestId: id };
  const errorHeaders = { ...headers, "Cache-Control": "no-store" };
  for (const drift of [
    { body: { ...body, statusCode: 500 }, headers: errorHeaders },
    { body: { ...body, code: "INTERNAL_ERROR" }, headers: errorHeaders },
    { body: { ...body, requestId: "22222222-2222-4222-8222-222222222222" }, headers: errorHeaders },
    { body, headers: headers },
  ]) {
    await assert.rejects(assertDocumentedResponse(new Response(JSON.stringify(drift.body), {
      status: 503, headers: drift.headers,
    }), "/health/ready"));
  }
});
