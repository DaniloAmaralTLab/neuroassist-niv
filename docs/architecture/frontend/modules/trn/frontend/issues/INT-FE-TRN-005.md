# INT-FE-TRN-005 -- shared/access-decision stub dependency — PLATFORM ledger item (caregiverAuthoringGuard + all RBAC-of-UI affordances use stub until PLATFORM lands)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
All TRN RBAC-of-UI affordances and `caregiverAuthoringGuard` are wired to `@neuroassist/shared/access-decision` Wave-0 stub today. When the PLATFORM ledger item delivers the real access-decision service (backed by the authority ledger), the stub is replaced transparently — no TRN code changes required beyond the library upgrade.

## Context / Problem statement
- SPEC-05 §4: RBAC-of-UI uses `AccessDecisionService.can(authority)` for all 12 caregiver authorities.
- SPEC-01 §4: `caregiverAuthoringGuard` delegates per-authority check to `access-decision.can('trn.session.read')`.
- Today: `@neuroassist/shared/access-decision` is a Wave-0 stub that returns `true` for all `can()` calls (after session-presence check in the guard).
- PLATFORM ledger item: when the access-decision service is backed by the real authority ledger, the stub is replaced via the `@neuroassist/shared/access-decision` package — TRN code never calls the stub directly by class name.
- Impact: until PLATFORM lands, all RBAC gating in TRN is permissive (the guard still redirects on absent/expired session). The only security gate is the session check.

## Coordination required
- **PLATFORM team:** notify TRN when `@neuroassist/shared/access-decision` v2 ships (real ledger-backed). TRN will pin the new version; no code changes needed.
- **TRN owner:** ensure `caregiverAuthoringGuard` injects `AccessDecisionService` by interface token (not by class), so the stub swap is transparent.

## FE impact (TRN side)
1. `caregiverAuthoringGuard` — already wired to `access-decision.can('trn.session.read')` (FE-TRN-023).
2. All 12 affordance gates in `ProposedNodeCardComponent` — already wired to `access-decision.can(authority)` (FE-TRN-017).
3. Erase affordance — already wired to `access-decision.can('trn.content.delete')` (FE-TRN-026).
4. No code changes when PLATFORM lands — only a library version bump.

## Non-goals
- No TRN-side implementation of the access-decision logic.
- No hardcoded authority checks.

## Layer(s)
Cross-module coordination (owner: PLATFORM)

## Bounded context
trn → PLATFORM

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-05-tool-contract.md` (§4)

## Architecture alignment
- Injection by interface token (never by concrete stub class)
- Stub-permissive Wave-0 is an explicit, documented tradeoff (not an accidental omission)

## Implementation checklist

- 🔲 Confirm `AccessDecisionService` injected by token (not stub class) in `caregiverAuthoringGuard` and all 12 RBAC-of-UI affordances
- 🔲 Document stub dependency in `libs/trn/access/README.md` (or equivalent)
- 🔲 Coordination message sent to PLATFORM team

## Milestone
Wave 5 / Access guards

## Labels
type:integration
layer:frontend
scope:trn
priority:P5

## Acceptance criteria
- `caregiverAuthoringGuard` and all RBAC-of-UI affordances inject `AccessDecisionService` by interface token.
- No TRN file imports the stub class directly.
- When PLATFORM ships, upgrading `@neuroassist/shared/access-decision` activates real RBAC without TRN code changes.

## Dependencies
- FE-TRN-023 (caregiverAuthoringGuard — wiring point)
- FE-TRN-017 (ProposedNodeCardComponent — RBAC-of-UI wiring)

## Risks / Notes
- Until PLATFORM lands, absent-session check is the only security gate for TRN routes. This is a documented risk in the ADR-005 amendment; it must be resolved before production launch.
