# ADR-006: PTT audio transport

**Status: Proposed.** In-app native PTT is approved; media transport is unselected.

**Options considered:** Managed WebRTC SFU such as LiveKit Cloud; self-hosted LiveKit/WebRTC with TURN; a custom audio transport over WebSockets; another managed native audio service.

**Recommendation and reasoning:** Evaluate WebRTC with LiveKit as a candidate, beginning with a managed-versus-self-hosted cost and device feasibility comparison. Keep media separate from the approved WebSocket control plane. Candidate SDK documentation describes an Expo integration, but that is not proof of this app's Android background, locked-screen or version compatibility.

**Trade-offs and cost/operations:** A managed SFU reduces some deployment work but incurs usage and lock-in; LiveKit's published Ship plan starts at US$50/month, while its Build plan is listed at US$0. Check production eligibility and actual usage rather than assuming either plan fits. Self-hosting adds media, TURN, monitoring, security, bandwidth and incident work. WebRTC over unreliable mobile networks can require relays. A raw WebSocket audio design would require more codec, jitter, audio-focus and recovery engineering. Expo Go cannot supply the candidate's native SDK.

**Reversibility:** A media adapter and separate arbitration make substitution more feasible, but client native binaries, token formats, networking and media enforcement must be migrated and retested.

**Approval required:** Transport/vendor, hosting, cost, media-access enforcement, Android device evidence and fallback behavior. [ADR-012](ADR-012-ptt-arbitration.md) separately proposes arbitration and no-duration-timeout recovery.

**Evidence:** [LiveKit Expo SDK](https://docs.livekit.io/transport/sdk-platforms/expo/), [LiveKit pricing](https://livekit.com/pricing), [WebRTC TURN](https://webrtc.org/getting-started/turn-server), [Android foreground-service types](https://developer.android.com/develop/background-work/services/fgs/service-types).
