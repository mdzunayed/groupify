import { Injectable } from "@nestjs/common";
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
