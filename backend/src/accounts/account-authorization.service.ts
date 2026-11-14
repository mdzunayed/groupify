import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Client } from "pg";

import { DevelopmentIdentityService } from "../identity/development-identity.service";

export type ActiveAccount = Readonly<{ id: string }>;

@Injectable()
export class AccountAuthorizationService {
  constructor(private readonly identity: DevelopmentIdentityService) {}

  // Only trusted server code supplies this callback. It must use this client for
  // all protected SQL and must not publish external effects before commit.
  async withActiveAccount<T>(authorization: unknown, operation: (client: Client, account: ActiveAccount) => Promise<T>): Promise<T> {
    const identity = await this.identity.verifyBearer(authorization);
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new ServiceUnavailableException("Account authorization is unavailable");

    let client: Client | undefined;
    try {
      client = new Client({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 2500,
        statement_timeout: 2500,
        query_timeout: 3000,
      });
      // A connection loss also fails the pending SQL; never log its raw details.
      client.on("error", () => undefined);
      await client.connect();
      await client.query("BEGIN");
      const result = await client.query<{ id: string; state: string }>(`
        SELECT a.id, a.state FROM accounts a
        JOIN external_identities i ON i.account_id = a.id
        WHERE i.provider = $1 AND i.issuer = $2 AND i.subject = $3
        FOR SHARE OF a, i
      `, [identity.provider, identity.issuer, identity.subject]);
      const row = result.rows[0];
      if (!row || row.state !== "active") throw new ForbiddenException("Account access is not allowed");
      const value = await operation(client, Object.freeze({ id: row.id }));
      const committed = await client.query("COMMIT");
      // PostgreSQL can answer COMMIT with ROLLBACK if a callback swallowed a SQL
      // error. Never report the operation's return value as committed in that case.
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
}
