# ADR-023: Authenticated development WebSocket probe

**Status: implementation direction in review.** Backend WebSockets are owner-approved.
This reversible foundation grants no new product permission, selects no PTT audio
transport or production provider, and accepts no phase.

Use pinned `ws` 8.23.0 in a private Nest RealtimeModule, with `@types/ws` 8.18.2 for
development. Node 26.13.0 satisfies its requirement. Preserve other locked versions;
no Expo/native dependency changes. The library owns framing/UTF-8 validation; use
its documented no-server/handleUpgrade APIs with the HTTP server and Nest lifecycle.

Require opt-in plus development/test mode. Authenticate bearer/current account
before HTTP 101, rather than treating a post-connection callback as completed
upgrade authorization. Accept only the development path, header credentials and
one account-check event. No cookies, URL/subprotocol tokens, rooms, broadcasts or
payload echo. Recheck provider/account per supported action using the SQL boundary.
Use shared safe HTTP formatting and independent request IDs; raw transport errors
are not output. Connection state never grants resource access.

An 8KiB decoder bound, no compression and one in-flight check are development choices,
not population/membership limits or speaking-duration timeouts. Shutdown removes
the owned listener and terminates owned sockets. No durable delivery/drain or live
session proof follows.

Alternatives: Nest WsAdapter/gateway or Socket.IO; provider-specific realtime.
The small no-server boundary supports async pre-upgrade authorization, delegates
framing to a maintained library and avoids an extra gateway protocol for one probe.
A production/event adapter may replace it. Exact product contracts, quotas,
proxy/WSS, Redis fanout, monitoring, reconnect, broadcast invalidation and mobile
behavior require separate review/evidence. Live Clerk/native compatibility remains
unverified.

Verify loopback protocol/failures, then actual PostgreSQL status changes across
messages. External identity is mocked only at that transport-suite boundary; the
separate SDK suite remains the cryptographic contract proof. No mock, open port
or bundle is represented as live/physical-session proof.

Details: [development protocol](../../03-api/development-websocket.md).
Sources fetched 2026-11-14: [ws 8.23.0 API](https://github.com/websockets/ws/blob/8.23.0/doc/ws.md),
[authentication/no-server example](https://github.com/websockets/ws/blob/8.23.0/README.md#client-authentication),
[Nest adapters](https://docs.nestjs.com/websockets/adapter), [Nest guards](https://docs.nestjs.com/websockets/guards).
