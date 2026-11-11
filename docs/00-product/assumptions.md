# Assumptions requiring confirmation

Each item below is an **Assumption requiring confirmation**, not an approved requirement, permission, architecture, or provider selection. These assumptions must be confirmed or rejected before dependent decisions or implementation rely on them.

| ID | Assumption requiring confirmation | Related open question |
| --- | --- | --- |
| A-02 | Communities and rides may have separate leadership assignments. | How do the two contexts relate and which permissions apply in each? |
| A-03 | Community invitations may use a unique code or QR code. | Are invitations in scope, and which methods and eligibility rules are approved? |
| A-05 | Location access may be revoked when a member leaves an active ride. | Which access is revoked, for whom, and what happens to already recorded data? The approved active-ride sharing boundary still applies. |
| A-06 | A modular-monolith backend may be used initially. | What backend architecture and hosting arrangement are approved? |
| A-07 | Production map tiles should use a properly licensed provider rather than relying on unlimited public OSM tile infrastructure. | Which tile provider, terms, usage limits, and cost are acceptable? |

**Resolved:** A-01 is approved: the community creator becomes Leader. The owner also approved ride management for Leaders and Co-leaders; the exact lifecycle and assignment details related to A-04 remain open.

The [open decisions](open-decisions.md) identify other unanswered questions without assuming an answer. The [risk register](risks.md) records possible consequences separately.
