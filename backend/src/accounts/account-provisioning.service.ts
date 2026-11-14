import { ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";

import { DevelopmentIdentityService } from "../identity/development-identity.service";
import { accountTransaction, findLockedAccount } from "./account-store";

export type ProvisionedAccount = Readonly<{ id: string; created: boolean }>;

@Injectable()
export class AccountProvisioningService {
  constructor(private readonly identity: DevelopmentIdentityService) {}

  // Explicit internal provisioning only. Authentication and arbitrary protected
  // requests never invoke this method; there is no public bootstrap controller.
  async provision(authorization: unknown): Promise<ProvisionedAccount> {
    const identity = await this.identity.verifyBearer(authorization);
    return accountTransaction(async (client) => {
      let account = await findLockedAccount(client, identity);
      if (!account) {
        const inserted = await client.query<{ id: string }>("INSERT INTO accounts DEFAULT VALUES RETURNING id");
        const id = inserted.rows[0].id;
        const linked = await client.query(`
          INSERT INTO external_identities (account_id, provider, issuer, subject)
          VALUES ($1, $2, $3, $4) ON CONFLICT (provider, issuer, subject) DO NOTHING
          RETURNING account_id
        `, [id, identity.provider, identity.issuer, identity.subject]);
        if (linked.rowCount === 1) return Object.freeze({ id, created: true });

        // A concurrent provision won. Remove our unlinked candidate in this same
        // transaction before reading its committed mapping with a fresh snapshot.
        await client.query("DELETE FROM accounts WHERE id = $1", [id]);
        account = await findLockedAccount(client, identity);
      }
      if (!account) throw new ServiceUnavailableException("Account authorization is unavailable");
      if (account.state !== "active") throw new ForbiddenException("Account access is not allowed");
      return Object.freeze({ id: account.id, created: false });
    });
  }
}
