import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { CommunityAuthorizationService } from "../communities/community-authorization.service";

export type RideLifecycle = Readonly<{ id: string; communityId: string; state: "active" | "completed"; startedAt: string; endedAt: string | null }>;
type RideRow = { id: string; community_id: string; state: "draft" | RideLifecycle["state"]; started_at: Date | null; ended_at: Date | null };

@Injectable()
export class RideLifecycleService {
  constructor(private readonly communities: CommunityAuthorizationService) {}

  start(authorization: unknown, communityId: unknown, rideId: unknown): Promise<RideLifecycle> {
    return this.transition(authorization, communityId, rideId, "start");
  }

  end(authorization: unknown, communityId: unknown, rideId: unknown): Promise<RideLifecycle> {
    return this.transition(authorization, communityId, rideId, "end");
  }

  private async transition(authorization: unknown, communityId: unknown, rideId: unknown, action: "start" | "end"): Promise<RideLifecycle> {
    return this.communities.withManagementCapability(authorization, communityId, "manage_rides", async (client, context) => {
      if (typeof rideId !== "string" || rideId.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rideId)) {
        throw new BadRequestException("Ride id is invalid");
      }
      const result = await client.query<RideRow>(`
        SELECT id, community_id, state, started_at, ended_at FROM rides
        WHERE id = $1 AND community_id = $2 FOR UPDATE
      `, [rideId, context.communityId]);
      let ride = result.rows[0];
      if (!ride) throw new NotFoundException("Ride is unavailable");
      if ((action === "start" && ride.state === "completed") || (action === "end" && ride.state === "draft")) {
        throw new ConflictException("Ride transition is not allowed");
      }
      if (action === "start" && ride.state === "draft") {
        ride = (await client.query<RideRow>(`
          UPDATE rides SET state = 'active', started_at = GREATEST(clock_timestamp(), created_at), started_by = $2
          WHERE id = $1 RETURNING id, community_id, state, started_at, ended_at
        `, [ride.id, context.accountId])).rows[0];
      } else if (action === "end" && ride.state === "active") {
        ride = (await client.query<RideRow>(`
          UPDATE rides SET state = 'completed', ended_at = GREATEST(clock_timestamp(), started_at), ended_by = $2
          WHERE id = $1 RETURNING id, community_id, state, started_at, ended_at
        `, [ride.id, context.accountId])).rows[0];
      }
      // SQL constraints require a start instant for every non-draft result.
      if (!ride?.started_at || ride.state === "draft") throw new Error("Invalid ride lifecycle result");
      return Object.freeze({ id: ride.id, communityId: ride.community_id, state: ride.state,
        startedAt: ride.started_at.toISOString(), endedAt: ride.ended_at?.toISOString() ?? null });
    });
  }
}
