import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { IncomingMessage } from "node:http";

import { requestIdFor } from "./request-id";

const errors: Record<number, { code: string; message: string }> = {
  400: { code: "BAD_REQUEST", message: "The request is invalid." },
  401: { code: "UNAUTHENTICATED", message: "Authentication is required." },
  403: { code: "FORBIDDEN", message: "This action is not permitted." },
  404: { code: "NOT_FOUND", message: "The requested resource was not found." },
  405: { code: "METHOD_NOT_ALLOWED", message: "This method is not allowed." },
  408: { code: "REQUEST_TIMEOUT", message: "The request timed out." },
  409: { code: "CONFLICT", message: "The request conflicts with the current state." },
  413: { code: "PAYLOAD_TOO_LARGE", message: "The request is too large." },
  415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "The content type is not supported." },
  422: { code: "UNPROCESSABLE_ENTITY", message: "The request could not be processed." },
  429: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." },
  500: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  502: { code: "BAD_GATEWAY", message: "An upstream service is unavailable." },
  503: { code: "SERVICE_UNAVAILABLE", message: "The service is temporarily unavailable." },
  504: { code: "GATEWAY_TIMEOUT", message: "An upstream service timed out." },
};

export function httpErrorBody(statusCode: number, requestId: string) {
  const error = errors[statusCode] ?? (statusCode >= 500 ? errors[500] : {
    code: "REQUEST_FAILED", message: "The request could not be completed.",
  });
  return { statusCode, ...error, requestId };
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<IncomingMessage>();
    const response = context.getResponse();
    const adapter = this.adapterHost.httpAdapter;
    const candidate = exception instanceof HttpException ? exception.getStatus() : 500;
    const statusCode = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
    // Body-parser failures can reach the filter before route middleware runs.
    const requestId = requestIdFor(request);
    const body = httpErrorBody(statusCode, requestId);
    if (statusCode >= 500) {
      this.logger.error({ event: "http_error", requestId, statusCode, code: body.code });
    }
    if (adapter.isHeadersSent(response)) {
      adapter.end(response);
      return;
    }
    adapter.setHeader(response, "X-Request-Id", requestId);
    adapter.setHeader(response, "Cache-Control", "no-store");
    adapter.reply(response, body, statusCode);
  }
}
