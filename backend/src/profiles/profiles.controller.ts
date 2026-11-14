import { BadRequestException, Body, Controller, Get, Patch, Post, Req, Res, UnsupportedMediaTypeException } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";

import { ProfileTextService, type ProfileText } from "./profile-text.service";

@Controller("v1/me/profile")
export class ProfilesController {
  constructor(private readonly profiles: ProfileTextService) {}

  private request(request: IncomingMessage, json = false) {
    if (request.url?.includes("?")) throw new BadRequestException("Profile query parameters are unsupported");
    if (json && request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new UnsupportedMediaTypeException("Profile writes require JSON");
    }
    return request.headers.authorization;
  }

  private response(response: ServerResponse, profile: ProfileText) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("ETag", `"profile-${profile.profileId}-${profile.version}"`);
    return profile;
  }

  @Get()
  async get(@Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    return this.response(response, await this.profiles.get(this.request(request)));
  }

  @Post()
  async create(@Body() body: unknown, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    return this.response(response, await this.profiles.create(this.request(request, true), body));
  }

  @Patch()
  async update(@Body() body: unknown, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
    return this.response(response, await this.profiles.update(this.request(request, true), request.headers["if-match"], body));
  }
}
