# Roadmap implementation status

This is a snapshot of evidence in the repository and current development environment, not the live [project tracker](https://docs.google.com/spreadsheets/d/1b__35uk0LqXWKjUfO9_TMHCadurFBflXbuVo4U0YQss/edit). The tracker was not accessible from this environment when this snapshot was prepared. Phase acceptance belongs to the product owner; a branch or passing check alone does not mark a phase complete.

| Phase | Repository evidence and current status |
| --- | --- |
| P0 — Product specification | **In review:** requirements, feature matrix, business rules, journeys, assumptions, risks, and open decisions are documented. The owner confirmed Expo/React Native, the planning population, background GPS, legal-retention baseline, and starter permissions. Detailed role assignment and other decisions remain open. |
| P1 — Research and architecture | **In progress:** the owner approved a NestJS modular monolith and Clerk for development; architecture and ADRs are documented. Hosting, production OTP, maps, PTT transport, and other choices remain unapproved. PTT and background-GPS physical-device proofs have not been run. |
| P2 — Development foundation | **In review:** the repository contains a locked install, checks, Android JavaScript bundle command, and a CI workflow. A fresh HTTPS clone passed the install, lint, typecheck, 15 mocked authentication tests, and Android bundling; see the [validation evidence](foundation.md#build-and-ci-boundaries). A hosted CI run and a live Clerk session have not been verified. |
| P3–P16 — Design through release | **Not assessed against the live tracker:** the checked-in app has an existing phone/OTP flow and placeholder home screen; those do not establish completion of later phases. Check each phase's dependencies and evidence before implementation or acceptance. |

See [open decisions](../00-product/open-decisions.md), the [architecture decision index](../01-architecture/architecture-decisions/README.md), and the [device validation plan](../01-architecture/device-validation-plan.md) for the specific gaps. Update this snapshot as work progresses and reconcile it with the live tracker when access is available.
