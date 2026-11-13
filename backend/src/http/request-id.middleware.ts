import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";

import { requestIdFor } from "./request-id";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: IncomingMessage, response: ServerResponse, next: () => void) {
    response.setHeader("X-Request-Id", requestIdFor(request));
    next();
  }
}
