import { BadRequestException, Injectable } from "@nestjs/common";

import { AccountAuthorizationService } from "../accounts/account-authorization.service";

export type CreatedCommunity = Readonly<{ id: string; name: string; role: "Leader" }>;

@Injectable()
export class CommunityCreationService {
  constructor(private readonly accounts: AccountAuthorizationService) {}

  async create(authorization: unknown, name: unknown): Promise<CreatedCommunity> {
    return this.accounts.withActiveAccount(authorization, async (client, account) => {
      if (typeof name !== "string") throw new BadRequestException("Community name is invalid");
      const normalized = name.normalize("NFC").trim();
      if (!normalized || Array.from(normalized).length > 100 || /\p{Cc}/u.test(normalized)) {
        throw new BadRequestException("Community name is invalid");
      }
      const result = await client.query<{ id: string; name: string }>(
        "INSERT INTO communities (name, created_by) VALUES ($1, $2) RETURNING id, name", [normalized, account.id],
      );
      const community = result.rows[0];
      await client.query("INSERT INTO community_memberships (community_id, account_id, role) VALUES ($1, $2, 'Leader')",
        [community.id, account.id]);
      return Object.freeze({ id: community.id, name: community.name, role: "Leader" });
    });
  }
}
