import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";

import { NestFactory } from "@nestjs/core";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
let app;
let baseUrl;

before(async () => {
  assert.ok(
    process.env.DATABASE_URL && process.env.REDIS_URL && process.env.DATABASE_URL_WITHOUT_POSTGIS,
    "Set DATABASE_URL, REDIS_URL, and DATABASE_URL_WITHOUT_POSTGIS for integration tests",
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
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("readiness fails closed when Redis cannot be reached", async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = "redis://127.0.0.1:1";
  try {
    const response = await fetch(`${baseUrl}/health/ready`);
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
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(!body.includes(process.env.DATABASE_URL));
  } finally {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
