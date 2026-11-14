import { BadRequestException, Body, Controller, Post, Req, Res, ServiceUnavailableException, UnsupportedMediaTypeException } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";

import { CommunityCreationService } from "./community-creation.service";

@Controller("v1/communities")
export class CommunitiesController {
  constructor(private readonly communities: CommunityCreationService) {}

  @Post()
  async create(@Body() body: unknown, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    // Creator eligibility is unresolved. This explicit preview is for controlled
    // development accounts only; enabling identity verification alone grants none.
    if (!["development", "test"].includes(process.env.NODE_ENV ?? "") || process.env.GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED !== "true") {
      throw new ServiceUnavailableException("Community creation preview is unavailable");
    }
    if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new UnsupportedMediaTypeException("Community creation requires JSON");
    }
    if (request.url?.includes("?") || !body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || Object.keys(body)[0] !== "name") {
      throw new BadRequestException("Community creation accepts only a name");
    }
    const created = await this.communities.create(request.headers.authorization, (body as { name: unknown }).name);
    response.setHeader("Cache-Control", "no-store");
    return { id: created.id, name: created.name, role: created.role };
  }
}
