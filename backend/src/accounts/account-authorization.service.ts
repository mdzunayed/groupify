import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Client } from "pg";

import { DevelopmentIdentityService } from "../identity/development-identity.service";
import { accountTransaction, findLockedAccount } from "./account-store";

export type ActiveAccount = Readonly<{ id: string }>;

@Injectable()
export class AccountAuthorizationService {
  constructor(private readonly identity: DevelopmentIdentityService) {}

  // Only trusted server code supplies this callback. It must use this client for
  // all protected SQL and must not publish external effects before commit.
  async withActiveAccount<T>(authorization: unknown, operation: (client: Client, account: ActiveAccount) => Promise<T>): Promise<T> {
    const identity = await this.identity.verifyBearer(authorization);
    return accountTransaction(async (client) => {
      const row = await findLockedAccount(client, identity);
      if (!row || row.state !== "active") throw new ForbiddenException("Account access is not allowed");
      return operation(client, Object.freeze({ id: row.id }));
    });
  }
}
