import { Injectable } from "@nestjs/common";
import { getMigrationFilePaths } from "node-pg-migrate/migration";
import { basename, extname, join } from "node:path";
import { Client } from "pg";
import { createClient } from "redis";

@Injectable()
export class HealthService {
  async ready(): Promise<boolean> {
    const databaseUrl = process.env.DATABASE_URL;
    const redisUrl = process.env.REDIS_URL;
    if (!databaseUrl || !redisUrl) return false;

    let database: Client | undefined;
    let cache: { readonly isOpen: boolean; destroy(): void } | undefined;
    try {
      const db = new Client({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 2500,
        query_timeout: 2500,
      });
      database = db;
      const redis = createClient({
        url: redisUrl,
        disableOfflineQueue: true,
        commandOptions: { timeout: 2500 },
        socket: { connectTimeout: 2500, reconnectStrategy: false },
      });
      cache = redis;
      // Connection failures are represented by readiness, not by credential-bearing logs.
      redis.on("error", () => undefined);

      const results = await Promise.allSettled([
        (async () => {
          await db.connect();
          await db.query("SELECT postgis_full_version()");
          const files = await getMigrationFilePaths(join(__dirname, "..", "migrations"));
          if (files.length === 0) throw new Error("No migration files found");
          const required = files.map((file) => basename(file, extname(file)));
          const applied = await db.query<{ name: string }>("SELECT name FROM public.pgmigrations");
          const appliedNames = new Set(applied.rows.map((row) => row.name));
          if (!required.every((name) => appliedNames.has(name))) {
            throw new Error("Pending database migrations");
          }
        })(),
        (async () => {
          await redis.connect();
          await redis.ping();
        })(),
      ]);
      return results.every((result) => result.status === "fulfilled");
    } catch {
      return false;
    } finally {
      if (cache?.isOpen) cache.destroy();
      await database?.end().catch(() => undefined);
    }
  }
}
