# Development WebSocket boundary

**Implemented development foundation in review.** Disabled by default; usable only
with `GROUPIFY_DEV_WS_ENABLED=true` and `NODE_ENV=development` or `test`. Production
mode never installs this upgrade handler. Normal public HTTP routes remain health
probes. This diagnostic protocol is not chat/PTT/SOS/location delivery, live Clerk
or device proof, production deployment or phase acceptance.

## Connection and authorization

Use the existing HTTP server at `/v1/development/events`, with a single
`Authorization: Bearer <session JWT>` header. The settings in [the authentication guide](../authentication-backend.md),
current provider session and existing active Groupify mapping are required. Supply
secrets only through server settings. Authentication never provisions implicitly.

Provider verification and account SQL finish before HTTP 101. Cookies, URL query
credentials and subprotocol tokens are not accepted; the URL must match exactly.
Failed upgrades use shared safe JSON HTTP errors, server request IDs and no-store
caching. Invalid authentication is 401; missing/inactive mapping 403; unavailable
authentication/database 503; unsupported path/negotiation 404/400. No exception,
token, payload, account/provider ID or request material is logged or reflected.
The initial ID also appears in the upgrade's `X-Request-Id` header.

The present app has a loopback development HTTP listener. Production WSS/TLS,
proxy/origin policy, connection/upgrade/rate budgets, monitoring and hosting remain
separate; this flag is not a production setting. No Android client/native-header
integration is implemented here.

## Diagnostic frames

After accepted upgrade the server sends:

```json
{"event":"connected","requestId":"<server UUID>","data":{"status":"ok"}}
```

The sole supported client data message is exactly:

```json
{"event":"check_account"}
```

After a fresh provider/account check and SQL commit, the server replies:

```json
{"event":"account_checked","requestId":"<new server UUID>","data":{"status":"ok"}}
```

Frames describe the observed check. They contain no account/provider identity,
role, room, ride, location or profile. They do not confirm delivery to another rider
or authorize a later product action. Each supported message rechecks authorization;
connection establishment is not a reusable active-account assertion. Idle sockets
may remain connected until the next action; they subscribe to no data. Native
protocol ping/pong means transport liveness only.

One diagnostic request may be in flight per connection; overlapping requests close
with 1008 instead of creating an unbounded queue. Text messages have an 8,192-byte
bound; compression is disabled and normal UTF-8 validation retained. These are
reversible development resource choices, not population/membership/concurrency
limits, production SLAs or PTT speaking-duration timeouts. Product limits remain open.

Binary frames close with 1003; malformed JSON with 1007; unknown/extra fields or
unsupported events with 1008; oversized frames with the library's 1009. Invalid
authentication/mapping on an action closes with generic 1008; unavailability with
generic 1013. Reasons omit raw details. No automatic retry, refresh, recovery, role
assignment or media grant occurs.

## Ownership and future work

RealtimeModule owns a private no-server `ws` adapter on Nest's HTTP server. The
library handles framing; authorization runs before upgrade. Shutdown unregisters
the owned listener, destroys pending upgrades and terminates owned peers. This is
transport cleanup, not durable event draining or delivery proof. There is no
automatic transmission-duration timeout.

Future product handlers must validate event schemas, current account, exact
resource, membership/role, active-ride participation and opt-in consent as applicable.
A management grant or open socket is insufficient. Broadcast invalidation,
replay/idempotency, persistence/outbox, Redis fanout, reconnect and mobile/offline/media
behavior remain unimplemented/unselected.

## Evidence

Local protocol tests use actual HTTP/WebSocket transport with a mocked account
boundary for gating, authorization ordering, redaction/correlation, per-message
checks, safe close behavior, bounded requests and shutdown. Database tests stub
only external identity and use actual SQL/transactions for active, unmapped,
subsequently deactivated and unlinked connections in the disposable PostGIS/Redis
runner. No real provider key/request, SMS, native session, Android background
behavior, Redis broadcast or PTT audio is used or proved.
