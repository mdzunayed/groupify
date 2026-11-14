import { BadRequestException, Body, Controller, HttpCode, Param, Post, Req, Res, UnsupportedMediaTypeException } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";

import { RideCreationService } from "./ride-creation.service";
import { RideLifecycleService, type RideLifecycle } from "./ride-lifecycle.service";

@Controller("v1/communities/:communityId/rides")
export class RidesController {
  constructor(private readonly rides: RideCreationService, private readonly lifecycle: RideLifecycleService) {}

  private request(request: IncomingMessage, body: unknown, creation = false) {
    const hasBody = Number(request.headers["content-length"] ?? 0) > 0 || request.headers["transfer-encoding"] !== undefined;
    if ((creation || hasBody) && request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new UnsupportedMediaTypeException("Ride commands require JSON");
    }
    if (request.url?.includes("?") || (!creation && body !== undefined &&
        (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 0))) {
      throw new BadRequestException("Ride command is invalid");
    }
    return request.headers.authorization;
  }

  @Post()
  async create(@Param("communityId") communityId: string, @Body() body: unknown, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    const authorization = this.request(request, body, true);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestException("Ride intent is invalid");
    const value = body as Record<string, unknown>;
    const keys = Object.keys(value).sort().join(",");
    let intent;
    if (value.mode === "immediate" && keys === "mode") intent = { mode: "immediate" };
    else if (value.mode === "scheduled" && keys === "mode,scheduledFor" && typeof value.scheduledFor === "string" &&
        /^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value.scheduledFor)) {
      const scheduledFor = new Date(value.scheduledFor);
      if (!Number.isFinite(scheduledFor.getTime()) || scheduledFor.toISOString() !== value.scheduledFor) throw new BadRequestException("Ride schedule is invalid");
      intent = { mode: "scheduled", scheduledFor };
    } else throw new BadRequestException("Ride intent is invalid");
    const ride = await this.rides.create(authorization, communityId, intent);
    response.setHeader("Cache-Control", "no-store");
    return { id: ride.id, communityId: ride.communityId, mode: ride.mode, scheduledFor: ride.scheduledFor, state: ride.state };
  }

  private result(response: ServerResponse, ride: RideLifecycle) {
    response.setHeader("Cache-Control", "no-store");
    return { id: ride.id, communityId: ride.communityId, state: ride.state, startedAt: ride.startedAt, endedAt: ride.endedAt };
  }

  @Post(":rideId/start")
  @HttpCode(200)
  async start(@Param("communityId") communityId: string, @Param("rideId") rideId: string, @Body() body: unknown, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    return this.result(response, await this.lifecycle.start(this.request(request, body), communityId, rideId));
  }

  @Post(":rideId/end")
  @HttpCode(200)
  async end(@Param("communityId") communityId: string, @Param("rideId") rideId: string, @Body() body: unknown, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    return this.result(response, await this.lifecycle.end(this.request(request, body), communityId, rideId));
  }
}
