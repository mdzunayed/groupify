# HTTP conventions and error model

**Status: implemented foundation, in review.** This is a reversible P4 convention,
not approval of product APIs, account/profile schemas, authorization policies or
a production deployment. Only the health endpoints currently exist.

## Responses and correlation

Success responses keep their endpoint-specific JSON shape. `GET /health/live`
and healthy `GET /health/ready` continue to return `200` with `{"status":"ok"}`.
Every request reaching the application's HTTP handling receives a server-generated
UUID v4 in `X-Request-Id`. Caller-supplied IDs are ignored, including UUID-shaped
values. A request ID identifies one attempt; it is not an identity, permission,
trace from a trusted proxy, or idempotency key.

Failed HTTP requests use a single JSON shape:

```json
{
  "statusCode": 503,
  "code": "SERVICE_UNAVAILABLE",
  "message": "The service is temporarily unavailable.",
  "requestId": "11111111-1111-4111-8111-111111111111"
}
```

The example ID is illustrative; the server generates a new ID for each request.
The body ID equals the response header. Errors include `Cache-Control: no-store`.
Clients branch on HTTP status and `code`, not English message text. An error is
not proof that a write did not happen: automatic retries of future writes require
an explicit endpoint idempotency contract. No retry schedule or product rate limit
is introduced here.

## Status codes

| HTTP status | Machine code |
| --- | --- |
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 405 | `METHOD_NOT_ALLOWED` |
| 408 | `REQUEST_TIMEOUT` |
| 409 | `CONFLICT` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 422 | `UNPROCESSABLE_ENTITY` |
| 429 | `TOO_MANY_REQUESTS` |
| 500 | `INTERNAL_ERROR` |
| 502 | `BAD_GATEWAY` |
| 503 | `SERVICE_UNAVAILABLE` |
| 504 | `GATEWAY_TIMEOUT` |

Other valid 4xx exceptions receive `REQUEST_FAILED`; other valid 5xx exceptions
receive `INTERNAL_ERROR`, retaining their HTTP status. Unknown failures and invalid
exception statuses become 500. These mappings describe how exceptions are
presented; they do not implement authentication, validation, throttling, timeouts
or provider integrations. With the current Nest router, an unmatched method
returns 404, rather than automatically detecting an allowed-method list.

## Safe errors and logs

The global filter uses fixed public messages. It never reflects an exception's
message/response, request URL or query, request body, headers, token, database
connection string, stack or cause. Field-level validation details and domain error
codes require explicit safe contracts before being added; a raw validation message
array is not automatically safe.

Server errors (5xx) emit an allowlisted structured `http_error` log with only
`requestId`, `statusCode` and `code` plus the logging framework's context/metadata.
Raw exceptions and requests are not logged. This includes unavailable readiness
checks. There is no request/access logging or full tracing yet. Monitoring,
log retention/access, and safe deeper diagnostics remain operational decisions.

Body-parser failures may occur before route middleware; the filter generates the
correlation ID in that case. Malformed JSON and oversized JSON at the existing
Express parser limit receive safe 400/413 errors. This task does not change that
framework default or establish product payload limits. HTTP failures before Nest
handles the request, WebSocket errors and responses with headers already sent are
outside the JSON-envelope guarantee; a failure after headers are sent ends the
response rather than attempting a second response.

## Compatibility and remaining contracts

**Changed:** readiness failure was Nest's default
`{statusCode:503,message:"Dependencies unavailable",error:"Service Unavailable"}`.
It now uses the envelope above. Health success bodies and readiness's dependency/
migration conditions are unchanged. No current mobile client calls these APIs.

Product routing/versioning, field validation/limits, pagination, write idempotency,
product DTO/OpenAPI contracts, CORS, request deadlines, authentication/account-state checks,
rate limiting and WebSocket errors remain unimplemented. Each needs an explicit
contract before product clients depend on it. This foundation grants no access to
community, ride, location, chat, PTT or SOS data.

## Verification

`cd backend && npm test` builds TypeScript and runs real loopback HTTP checks,
including safe status mappings, unknown routes, malformed/oversized JSON, caller-ID
replacement, preserved success payloads, and absence of synthetic sensitive values
from errors and captured error logs. Test-only failure controllers live under
`backend/checks`; they are never registered in production AppModule.

`npm run test:integration:docker` separately checks real PostGIS/Redis and migration
repeatability/rollback/reapply. See implementation status for whether a particular
run passed or was blocked; unit/HTTP checks alone do not prove those dependencies.

## Machine-readable foundation contract

[openapi.json](openapi.json) is an OpenAPI 3.0.3 document for the two implemented
GET health operations and the shared error response. It deliberately declares no
product paths, provider security scheme or deployment URL. The health operations
are public. Required UUID headers, error cache headers and strict response shapes
are machine-readable; error status/header correlation is also checked at runtime
by the test helper because JSON Schema alone cannot compare HTTP headers/body.

`cd backend && npm run test:contract` validates the document with Swagger Parser
(external reference resolution disabled) and checks real loopback responses with
Ajv. Readiness success/failure in this focused suite use a controlled service
result to test the HTTP contract without requiring PostGIS/Redis. The real
PostGIS/Redis integration suite also invokes this same response validator; it is
a separate check, and its infrastructure blocker is recorded in implementation
status. Contract tests explicitly reject payload/header/correlation drift.
