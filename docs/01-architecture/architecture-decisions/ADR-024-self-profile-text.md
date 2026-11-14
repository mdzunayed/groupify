# ADR-024: Active-self development profile text

**Status: development implementation in review, not R1 or phase acceptance.** The
owner requested autonomous roadmap implementation and reversible choices. Prepare
the approved text attributes with conservative active-self read/edit; do not infer
other-rider/Leader editing, picture timing, recovery, erasure or production policy.
The previous optional preference question is not acceptance of these choices.

Use AccountsModule's current provider/account transaction and owner-derived SQL,
not caller IDs or community roles. A private ProfilesModule owns its service and
GET/POST/PATCH controller. One profile/account, exact rider vocabulary, optional
vehicle text, positive bigint version and restricted FK are database constraints.
NFC/trim, Unicode-scalar/control checks and 80/160-code-point bounds are explicit
reversible development defaults. Pictures remain required and unimplemented; no
unenforced photo ID, URL fetch or profile-complete assertion is added.

Profile identity is a generated immutable UUID distinct from account ownership.
Strong edit tags bind that identity and its decimal version, avoiding tags shared
by different actors/representations at the same counter. Conditional UPDATE checks
owner/id/version in one statement within the active-account transaction; concurrent
stale writes fail. Return ETag unchanged, never Number-coerce bigint versions.
Use HTTP 412 for failed conditions and 428 for missing preconditions with safe
machine codes; the older draft's 409 stale-version recommendation is superseded
only for this development implementation. Actual response includes own profile ID
and text/version, without timestamps/provider/role/lifecycle data.

POST never replaces existing text; GET/PATCH never create it. No arbitrary login
bootstrap, cross-account selector, client metadata write or role override exists.
No automatic retry/idempotency cache is selected. Commit precedes response, but
uncertain failures do not prove rollback. Populated downgrade refuses data loss;
erasure/media/legal/restore workflows remain prerequisites before production use.

Real SQL/HTTP tests must cover actor isolation, generation/version binding,
competing edits, optional fields, Unicode, constraints, rollback and bigint values.
Local protocol tests with stubs are not live identity/device or database proof.

Details: [implemented text API](../../03-api/self-profile-text.md).
Sources fetched 2026-11-14: [HTTP preconditions](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match),
[428 Precondition Required](https://www.rfc-editor.org/rfc/rfc6585.html#section-3).
