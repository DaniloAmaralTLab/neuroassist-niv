# INT-FE-TRN-004 -- CONV reconcile: CONV SPEC-01 `/patient/confirm-training` banner now caregiver-driven in-session (owner CONV; cross-module coordination; do not edit CONV docs)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
CONV module is informed that its SPEC-01 patient confirmation banner linking to `/patient/confirm-training` is superseded by the caregiver-driven in-session assent model (ADR-005 amendment); CONV team must update their spec and routing to remove the `/patient/confirm-training` route and banner if it conflicts with TRN's assent model. TRN makes no changes to CONV docs or routes.

## Context / Problem statement
- CONV SPEC-01 (original): a banner in the CONV module linked the patient to `/patient/confirm-training` as a patient-facing route for training confirmation.
- ADR-005 amendment (TRN): patient assent is now a caregiver-driven in-session action (single caregiver identity, assent at `/training/assent`). There is no patient-session route for training in TRN.
- Conflict: if CONV still surfaces the `/patient/confirm-training` link/banner, it references a non-existent or repurposed route. The patient has no session token for TRN endpoints.
- This is a cross-module concern owned by the CONV module; TRN has no authority to modify CONV specs or routes.

## Coordination required
- **CONV module owner:** CONV SPEC-01 must be updated to remove or repurpose the `/patient/confirm-training` route/banner. Options: (a) remove the banner entirely; (b) replace with a caregiver-directed "ask your caregiver to continue" message; (c) redirect to a neutral informational screen.
- **TRN module owner:** this issue is a formal notification. TRN makes no changes to CONV.

## FE impact (TRN side)
- None — TRN does not register or handle `/patient/confirm-training`.
- `caregiverAuthoringGuard` does not cover the CONV patient banner route.

## Non-goals
- TRN does NOT edit CONV docs, CONV routes, or CONV components.
- No shared route handler between TRN and CONV.

## Layer(s)
Cross-module coordination (owner: CONV)

## Bounded context
trn → CONV (coordination)

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/adr/ADR-005-dual-shell-dual-authorization-authoring.md` (Amendment: single caregiver identity)

## Architecture alignment
- Clear module boundary: CONV owns its patient banner; TRN owns its assent route
- No shared route between TRN and CONV

## Implementation checklist

- 🔲 Coordination message sent to CONV module owner (file a CONV issue or add to CONV backlog)
- 🔲 CONV SPEC-01 updated by CONV owner (tracked externally)
- 🔲 Verify: TRN routes do NOT include `/patient/confirm-training`

## Milestone
Wave 1 / Foundation (cross-module)

## Labels
type:integration
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- TRN routes do not include `/patient/confirm-training` or any patient-session route.
- CONV team has been notified (coordination issue filed or message sent).
- CONV SPEC-01 is updated by the CONV owner (tracked in CONV backlog, not TRN).

## Dependencies
- FE-TRN-002 (TRN_ROUTES — confirms no `/patient/confirm-training` route in TRN)

## Risks / Notes
- If CONV is not updated and the patient-facing app still shows the `/patient/confirm-training` banner, users may be directed to a non-existent or unexpected route. Prioritize the coordination message before CONV v1 ships.
