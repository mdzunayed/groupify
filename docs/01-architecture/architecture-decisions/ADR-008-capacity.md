# ADR-008: Capacity and scaling assumptions

**Status: Proposed.** No maximum membership, concurrency, availability target or initial infrastructure size is approved.

**Options considered:** Use an assumed fixed population as a capacity promise; use measured workloads and adjustable assumptions; begin with a distributed high-availability design regardless of measured need.

**Recommendation and reasoning:** Use a parameterized load and cost model for concurrent rides, participants, active listeners, update frequency, message fan-out, offline bursts and media relay. Agree test scenarios and availability requirements with the owner before sizing. The owner confirmed the master plan's approximately 100–500 users as a planning population, not a concurrency or membership limit.

**Trade-offs and cost/operations:** A smaller starting deployment may be cheaper and simpler but has limited fault isolation; early distributed infrastructure costs more to run and can add complexity. Load tests, media relay and realistic Bangladesh connectivity have operational and possibly provider charges.

**Reversibility:** Parameterized assumptions and module boundaries allow workload changes, but database growth, media architecture, SLAs and provider migrations are costly to reverse under load.

**Approval required:** Population and concurrency scenarios, ride/community limits, availability objectives, measured load thresholds and budget before capacity commitments.

**Evidence:** [cost and capacity formulas](../research-cost-capacity.md), [DigitalOcean pricing](https://www.digitalocean.com/pricing/droplets), [WebRTC TURN](https://webrtc.org/getting-started/turn-server).
