import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

import { HttpErrorFilter } from "./http-error.filter";
import { HttpLifecycleService } from "./http-lifecycle.service";
import { RequestIdMiddleware } from "./request-id.middleware";

@Module({ providers: [HttpLifecycleService, { provide: APP_FILTER, useClass: HttpErrorFilter }] })
export class HttpInfrastructureModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: "{*path}", method: RequestMethod.ALL });
  }
}
