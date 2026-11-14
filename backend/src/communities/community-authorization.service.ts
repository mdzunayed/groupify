import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { Client } from "pg";

import { AccountAuthorizationService } from "../accounts/account-authorization.service";

export type CommunityManagementCapability = "manage_roles" | "manage_membership" | "manage_rides" | "manage_invitations";
type CommunityRole = "Leader" | "Co-leader" | "Member";
export type AuthorizedCommunity = Readonly<{ accountId: string; communityId: string; role: CommunityRole }>;

@Injectable()
export class CommunityAuthorizationService {
  constructor(private readonly accounts: AccountAuthorizationService) {}

  async withManagementCapability<T>(authorization: unknown, communityId: unknown, capability: CommunityManagementCapability,
    operation: (client: Client, context: AuthorizedCommunity) => Promise<T>): Promise<T> {
    return this.accounts.withActiveAccount(authorization, async (client, account) => {
      if (typeof communityId !== "string" || communityId.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)) {
        throw new BadRequestException("Community id is invalid");
      }
      const result = await client.query<{ community_id: string; role: CommunityRole }>(`
        SELECT m.community_id, m.role FROM community_memberships m
        WHERE m.community_id = $1 AND m.account_id = $2 FOR SHARE OF m
      `, [communityId, account.id]);
      const member = result.rows[0];
      const leaderAction = capability === "manage_roles" || capability === "manage_membership";
      const sharedAction = capability === "manage_rides" || capability === "manage_invitations";
      const permitted = member && ((member.role === "Leader" && (leaderAction || sharedAction)) ||
        (member.role === "Co-leader" && sharedAction));
      if (!permitted) throw new ForbiddenException("Community access is not allowed");
      return operation(client, Object.freeze({ accountId: account.id, communityId: member.community_id, role: member.role }));
    });
  }
}
