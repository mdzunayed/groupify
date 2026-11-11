# ADR-002: Backend framework and service shape

**Status: Proposed.** A modular monolith is an assumption requiring confirmation, not an approved architecture.

**Options considered:** TypeScript/NestJS; Kotlin/Ktor; Java/Spring Boot; Go HTTP/WebSocket stack; and a distributed set of services rather than one modular deployment.

**Recommendation and reasoning:** Evaluate TypeScript/NestJS first as a modular-monolith candidate, using explicit identity, community, ride, location, chat, emergency and entitlement boundaries. TypeScript is already present in the client, and Nest documents HTTP and WebSocket gateways. Ktor retains Kotlin/Coroutines familiarity, Spring has a broad ecosystem, and Go can reduce runtime footprint; none is excluded. Redis, PostgreSQL/PostGIS and WebSockets remain approved directions independent of framework.

**Trade-offs and cost/operations:** A shared language can reduce context switching but does not make client authorization trustworthy or guarantee lower latency. A single deployable simplifies early operations but concentrates failure and deployment coupling; a distributed design introduces coordination and hosting overhead. Actual workloads, staff expertise and costs are unmeasured.

**Reversibility:** Clear module contracts and provider ports may ease a later split or framework change; database, WebSocket and operational migration would still be substantial.

**Approval required:** Owner approval of language, framework, modular shape and eventual service boundaries before dependent code or schema. Define the capacity and operational evidence first.

**Evidence:** [NestJS WebSocket gateways](https://docs.nestjs.com/websockets/gateways), [Ktor WebSockets](https://ktor.io/docs/server-websockets.html), [Spring WebSocket support](https://docs.spring.io/spring-framework/reference/web/websocket.html), [Go net/http](https://pkg.go.dev/net/http).
