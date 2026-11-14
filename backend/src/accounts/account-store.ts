import { HttpException, ServiceUnavailableException } from "@nestjs/common";
import { Client } from "pg";

import type { VerifiedExternalIdentity } from "../identity/development-identity.service";

export async function findLockedAccount(client: Client, identity: VerifiedExternalIdentity): Promise<{ id: string; state: string } | undefined> {
  const result = await client.query<{ id: string; state: string }>(`
    SELECT a.id, a.state FROM accounts a
    JOIN external_identities i ON i.account_id = a.id
    WHERE i.provider = $1 AND i.issuer = $2 AND i.subject = $3
    FOR SHARE OF a, i
  `, [identity.provider, identity.issuer, identity.subject]);
  return result.rows[0];
}

export async function accountTransaction<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new ServiceUnavailableException("Account authorization is unavailable");
  let client: Client | undefined;
  try {
    client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 2500, statement_timeout: 2500, query_timeout: 3000 });
    client.on("error", () => undefined);
    await client.connect();
    // Provisioning relies on a fresh snapshot after a conflicting insert waits.
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const value = await operation(client);
    const committed = await client.query("COMMIT");
    if (committed.command !== "COMMIT") throw new Error();
    return value;
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    if (error instanceof HttpException) throw error;
    throw new ServiceUnavailableException("Account authorization is unavailable");
  } finally {
    await client?.end().catch(() => undefined);
  }
}
