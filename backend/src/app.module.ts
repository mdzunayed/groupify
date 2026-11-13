import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { HttpErrorFilter } from "./http/http-error.filter";
import { RequestIdMiddleware } from "./http/request-id.middleware";
import { IdentityModule } from "./identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [HealthController],
  providers: [HealthService, { provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: "{*path}", method: RequestMethod.ALL });
  }
}
