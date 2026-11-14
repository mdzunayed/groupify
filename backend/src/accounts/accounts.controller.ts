import { BadRequestException, Body, Controller, Post, Req, Res, UnsupportedMediaTypeException } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";

import { AccountProvisioningService } from "./account-provisioning.service";

@Controller("v1/accounts")
export class AccountsController {
  constructor(private readonly provisioning: AccountProvisioningService) {}

  @Post("bootstrap")
  async bootstrap(@Body() body: unknown, @Req() request: IncomingMessage, @Res() response: ServerResponse) {
    const hasBody = Number(request.headers["content-length"] ?? 0) > 0 || request.headers["transfer-encoding"] !== undefined;
    if (hasBody && request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new UnsupportedMediaTypeException("Only an empty JSON object is supported");
    }
    if (request.url?.includes("?") || (body !== undefined &&
        (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 0))) {
      throw new BadRequestException("Bootstrap request must be empty");
    }
    const result = await this.provisioning.provision(request.headers.authorization);
    response.statusCode = result.created ? 201 : 200;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ accountId: result.id }));
  }
}
