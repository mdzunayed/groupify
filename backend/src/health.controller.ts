import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    if (!(await this.health.ready())) {
      throw new ServiceUnavailableException("Dependencies unavailable");
    }
    return { status: "ok" };
  }
}
