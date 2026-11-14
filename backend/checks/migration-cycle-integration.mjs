import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { getMigrationFilePaths } from "node-pg-migrate/migration";
import pg from "pg";

const execute = promisify(execFile);
const directory = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/node-pg-migrate/bin/node-pg-migrate.js", import.meta.url));
const tables = ["accounts", "external_identities", "communities", "community_memberships", "rider_profiles", "rides"];

test("the entire empty migration chain rolls back/reapplies without dropping PostGIS", async () => {
  // Only the Docker runner marks its newly created, isolated database disposable.
  // Direct callers must explicitly provide the same assurance before any DDL.
  assert.ok(process.env.GROUPIFY_TEST_DISPOSABLE_DATABASE === "true", "Full-chain rollback requires an explicitly disposable test database");
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  const files = await getMigrationFilePaths(fileURLToPath(new URL("../migrations", import.meta.url)));
  assert.ok(files.length > 0);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    assert.equal((await client.query("SELECT count(*)::int AS count FROM public.pgmigrations")).rows[0].count, files.length);
    for (const table of tables) {
      // Identifiers are a fixed test-owned list, never request input.
      assert.equal((await client.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count, 0,
        "Full-chain rollback refuses a populated fixture");
    }
    const postgis = (await client.query("SELECT postgis_version() AS version")).rows[0].version;
    await execute(process.execPath, [cli, "down", String(files.length)], { cwd: directory, maxBuffer: 4 * 1024 * 1024 });
    assert.equal((await client.query("SELECT count(*)::int AS count FROM public.pgmigrations")).rows[0].count, 0);
    for (const table of tables) {
      assert.equal((await client.query("SELECT to_regclass($1) AS relation", [`public.${table}`])).rows[0].relation, null);
    }
    assert.equal((await client.query("SELECT postgis_version() AS version")).rows[0].version, postgis);
    for (let replay = 0; replay < 2; replay++) {
      await execute(process.execPath, [cli, "up"], { cwd: directory, maxBuffer: 4 * 1024 * 1024 });
      assert.equal((await client.query("SELECT count(*)::int AS count FROM public.pgmigrations")).rows[0].count, files.length);
      for (const table of tables) {
        assert.notEqual((await client.query("SELECT to_regclass($1) AS relation", [`public.${table}`])).rows[0].relation, null);
        assert.equal((await client.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count, 0);
      }
      assert.equal((await client.query("SELECT postgis_version() AS version")).rows[0].version, postgis);
    }
  } finally { await client.end(); }
});
