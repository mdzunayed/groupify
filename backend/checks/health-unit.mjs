import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";

import { NestFactory } from "@nestjs/core";

const require = createRequire(import.meta.url);
const { AppModule } = require("../dist/app.module.js");
let app;
let baseUrl;

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});

after(async () => {
  await app.close();
});

test("liveness works without exposing any product data", async () => {
  const response = await fetch(`${baseUrl}/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("readiness fails closed when dependencies are not configured", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousRedisUrl = process.env.REDIS_URL;
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  try {
    const response = await fetch(`${baseUrl}/health/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      statusCode: 503,
      message: "Dependencies unavailable",
      error: "Service Unavailable",
    });
  } finally {
    if (previousDatabaseUrl !== undefined) process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousRedisUrl !== undefined) process.env.REDIS_URL = previousRedisUrl;
  }
});

test("readiness rejects malformed connection configuration without exposing it", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousRedisUrl = process.env.REDIS_URL;
  try {
    for (const [databaseUrl, redisUrl] of [
      ["not-a-database-url", "redis://127.0.0.1:1"],
      ["postgresql://127.0.0.1:1/groupify", "not-a-redis-url"],
    ]) {
      process.env.DATABASE_URL = databaseUrl;
      process.env.REDIS_URL = redisUrl;
      const response = await fetch(`${baseUrl}/health/ready`);
      assert.equal(response.status, 503);
      const body = await response.text();
      assert.ok(!body.includes(databaseUrl));
      assert.ok(!body.includes(redisUrl));
    }
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
  }
});
