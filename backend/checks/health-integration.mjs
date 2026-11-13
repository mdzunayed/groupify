import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";

import { NestFactory } from "@nestjs/core";

import { assertDocumentedResponse } from "./api-contract.mjs";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
let app;
let baseUrl;

before(async () => {
  assert.ok(
    process.env.DATABASE_URL && process.env.REDIS_URL && process.env.DATABASE_URL_WITHOUT_POSTGIS &&
      process.env.DATABASE_URL_WITHOUT_MIGRATIONS && process.env.DATABASE_URL_WITH_PENDING_MIGRATIONS,
    "Set all integration-test database URLs and REDIS_URL",
  );
  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});

after(async () => {
  if (app) await app.close();
});

test("readiness checks PostGIS and Redis", async () => {
  const response = await fetch(`${baseUrl}/health/ready`);
  await assertDocumentedResponse(response, "/health/ready");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("readiness fails closed when Redis cannot be reached", async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  try {
    const response = await fetch(`${baseUrl}/health/ready`);
    await assertDocumentedResponse(response, "/health/ready");
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(!body.includes(previousRedisUrl));
    assert.ok(!body.includes(process.env.DATABASE_URL));
  } finally {
    process.env.REDIS_URL = previousRedisUrl;
  }
});

test("readiness fails closed when the database lacks PostGIS", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.DATABASE_URL_WITHOUT_POSTGIS;
  try {
    const response = await fetch(`${baseUrl}/health/ready`);
    await assertDocumentedResponse(response, "/health/ready");
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(!body.includes(process.env.DATABASE_URL));
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test("readiness fails when migration history is missing or a migration is pending", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  try {
    for (const databaseUrl of [
      process.env.DATABASE_URL_WITHOUT_MIGRATIONS,
      process.env.DATABASE_URL_WITH_PENDING_MIGRATIONS,
    ]) {
      process.env.DATABASE_URL = databaseUrl;
      const response = await fetch(`${baseUrl}/health/ready`);
      await assertDocumentedResponse(response, "/health/ready");
      assert.equal(response.status, 503);
      assert.ok(!(await response.text()).includes(databaseUrl));
    }
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
