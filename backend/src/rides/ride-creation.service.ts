import { BadRequestException, Injectable } from "@nestjs/common";

import { CommunityAuthorizationService } from "../communities/community-authorization.service";

export type CreatedRide = Readonly<{ id: string; communityId: string; mode: "immediate" | "scheduled"; scheduledFor: string | null; state: "draft" }>;
type RideRow = { id: string; community_id: string; mode: CreatedRide["mode"]; scheduled_for: Date | null; state: "draft" };

function intent(input: unknown): { mode: CreatedRide["mode"]; scheduledFor: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Ride intent is invalid");
  const value = input as Record<string, unknown>;
  const keys = Object.keys(value).sort().join(",");
  if (value.mode === "immediate" && keys === "mode") return { mode: "immediate", scheduledFor: null };
  if (value.mode === "scheduled" && keys === "mode,scheduledFor" && value.scheduledFor instanceof Date &&
      Number.isFinite(value.scheduledFor.getTime()) && value.scheduledFor.getUTCFullYear() >= 1 && value.scheduledFor.getUTCFullYear() <= 9999) {
    return { mode: "scheduled", scheduledFor: value.scheduledFor.toISOString() };
  }
  throw new BadRequestException("Ride intent is invalid");
}

@Injectable()
export class RideCreationService {
  constructor(private readonly communities: CommunityAuthorizationService) {}

  async create(authorization: unknown, communityId: unknown, input: unknown): Promise<CreatedRide> {
    return this.communities.withManagementCapability(authorization, communityId, "manage_rides", async (client, context) => {
      const value = intent(input);
      const result = await client.query<RideRow>(`
        WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS now)
        INSERT INTO rides (community_id, created_by, mode, scheduled_for, created_at)
        SELECT $1, $2, $3, $4::timestamptz, instant.now FROM instant
        WHERE $3 = 'immediate' OR $4::timestamptz > instant.now
        RETURNING id, community_id, mode, scheduled_for, state
      `, [context.communityId, context.accountId, value.mode, value.scheduledFor]);
      const ride = result.rows[0];
      if (!ride) throw new BadRequestException("Scheduled ride must be in the future");
      return Object.freeze({ id: ride.id, communityId: ride.community_id, mode: ride.mode,
        scheduledFor: ride.scheduled_for?.toISOString() ?? null, state: ride.state });
    });
  }
}
