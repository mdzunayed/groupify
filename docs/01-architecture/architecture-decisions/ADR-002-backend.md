# ADR-002: Backend framework and service shape

**Status: Approved on 2026-11-11.** The owner selected a TypeScript/NestJS modular monolith with PostgreSQL/PostGIS, Redis and WebSockets. This selects the backend direction; it does not approve a schema, deployment provider, production account or exact dependency versions.

**Options considered:** TypeScript/NestJS; Kotlin/Ktor; Java/Spring Boot; Go HTTP/WebSocket stack; and a distributed set of services rather than one modular deployment.

**Decision and reasoning:** Use TypeScript/NestJS for one modular backend deployment, with identity, community, ride, location, chat, emergency and entitlement boundaries developed as their phases require. TypeScript is already present in the client, and Nest documents HTTP and WebSocket gateways. Ktor retains Kotlin/Coroutines familiarity, Spring has a broad ecosystem, and Go can reduce runtime footprint; the owner selected NestJS for this implementation.

**Trade-offs and cost/operations:** A shared language can reduce context switching but does not make client authorization trustworthy or guarantee lower latency. A single deployable simplifies early operations but concentrates failure and deployment coupling; a distributed design introduces coordination and hosting overhead. Actual workloads, staff expertise and costs are unmeasured.

**Reversibility:** Clear module contracts and provider ports may ease a later split or framework change; database, WebSocket and operational migration would still be substantial.

**Still open:** Detailed module contracts, schema and migration design, hosting, capacity scenarios, operational requirements and exact dependency versions. Each data or API decision needs review before dependent implementation.

**Evidence:** [NestJS WebSocket gateways](https://docs.nestjs.com/websockets/gateways), [Ktor WebSockets](https://ktor.io/docs/server-websockets.html), [Spring WebSocket support](https://docs.spring.io/spring-framework/reference/web/websocket.html), [Go net/http](https://pkg.go.dev/net/http).
