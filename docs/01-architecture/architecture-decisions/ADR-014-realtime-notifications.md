# ADR-014: Real-time events and push notifications

**Status: Proposed.** WebSockets and FCM are approved directions; implementation and delivery semantics are open.

**Options considered:** Authenticated WebSocket delivery plus direct FCM for offline/background notification hints; an Expo push service path using FCM beneath it; WebSockets alone; FCM alone for all real-time and SOS state.

**Recommendation and reasoning:** Evaluate authenticated WebSockets for active sessions and direct FCM as a notification/wake path, with durable server state and reconciliation. Evaluate Expo notification APIs for the client without assuming a particular push intermediary. Separate server-accepted, push-submitted, device-delivered and user-read evidence. Neither FCM nor a WebSocket send alone proves SOS delivery.

**Trade-offs and cost/operations:** Multiple channels require token lifecycle, retries, deduplication, authorization and observability; direct FCM gives control but increases operational responsibility. An intermediary may simplify delivery but adds a service dependency. Network and OS behavior can delay or suppress push, including urgent notifications.

**Reversibility:** Provider adapters and durable event IDs make a push path replaceable, while device-token migration and receipt semantics still require coordination.

**Approval required:** Push integration, any message audiences beyond active ride participants, delivery/read definitions, detailed offline chat behavior, SOS retry/receipt expectations and all unspecified role permissions.

**Evidence:** [Expo direct push](https://docs.expo.dev/push-notifications/sending-notifications-custom/), [FCM Android priority](https://firebase.google.com/docs/cloud-messaging/android-message-priority), [NestJS WebSocket gateways](https://docs.nestjs.com/websockets/gateways).
