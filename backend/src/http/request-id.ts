import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

const requestIdKey = Symbol("groupifyRequestId");
type CorrelatedRequest = IncomingMessage & { [requestIdKey]?: string };

// Never trust a caller's correlation header or put request contents in an ID.
export function requestIdFor(request: CorrelatedRequest): string {
  return (request[requestIdKey] ??= randomUUID());
}
