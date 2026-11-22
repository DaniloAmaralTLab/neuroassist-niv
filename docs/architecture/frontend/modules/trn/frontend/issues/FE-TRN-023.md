# FE-TRN-023 -- caregiverAuthoringGuard — real caregiver session via shared/auth-session, access-decision stub-permissive (never hardcoded true)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`caregiverAuthoringGuard` in `libs/trn/access/` gates both `/training` and `/training/assent` by consulting the real caregiver session from `@neuroassist/shared/auth-session`, routing to the sign-in surface on 401/absent session, and delegating per-authority refinement to `@neuroassist/shared/access-decision` (Wave-0 stub) — never returning a hardcoded `true`.

## Context / Problem statement
- SPEC-01 §4: `caregiverAuthoringGuard` gates both TRN routes by the caregiver-session identity from `@neuroassist/shared/auth-session`. Fine-grained `trn.*` authority refinement rides on `access-decision` (Wave-0 stub today). Until the PLATFORM ledger item, the guard decides from session presence/validity only; per-authority gate is deferred.
- Learning `guard:stub-permissive` (D-611, 6 occurrences): guard NEVER hardcodes `return true`. Even in stub mode it reads the real session; if session is absent or expired, it redirects to sign-in.
- No `patientConfirmGuard` — superseded by ADR-005 amendment.

## Approach (execution path)
1. Create `libs/trn/access/src/lib/caregiver-authoring.guard.ts` as a functional guard (`CanActivateFn`).
2. Inject `AuthSessionService` from `@neuroassist/shared/auth-session`.
3. If `authSession.caregiverSession() == null` or `authSession.isExpired()` → redirect to caregiver sign-in; return `false`.
4. Inject `AccessDecisionService` from `@neuroassist/shared/access-decision` (Wave-0 stub returns `true` for all permissions until PLATFORM item lands).
5. Call `accessDecision.can('trn.session.read')` — if `false` → redirect with "unauthorized" state; if `true` → return `true`.
6. Never call `return true` unconditionally.

## Non-goals
- No `patientConfirmGuard` or patient-session guard.
- Full per-authority gating is deferred to the PLATFORM/frontend routeGuards ledger item (INT-FE-TRN-5).

## Layer(s)
frontend / Access (`libs/trn/access/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-01-route-map.md` (§4)

## Architecture alignment
- Functional guard (`CanActivateFn`)
- Real session check from `shared/auth-session`
- Never `return true` unconditionally (guard:stub-permissive carry-forward)
- `access-decision` stub-permissive until PLATFORM item

## Implementation checklist (by layer/file)

- 🔲 `libs/trn/access/src/lib/caregiver-authoring.guard.ts` — CanActivateFn, real session check, access-decision can('trn.session.read')
- 🔲 Unit test: absent session → redirect (never return true)
- 🔲 Unit test: expired session → redirect
- 🔲 Unit test: valid session + stub access-decision → return true

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 5 / Access guards

## Labels
type:feature
layer:frontend
scope:trn
priority:P5

## Acceptance criteria
- Guard redirects to sign-in when caregiver session is absent or expired.
- Guard NEVER executes `return true` or `of(true)` unconditionally without reading the real session.
- Guard delegates per-authority check to `access-decision.can('trn.session.read')` (stub-permissive today).
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-001 (trn.contract.ts — RBAC authority keys used in can() call)
- INT-FE-TRN-5 (access-decision PLATFORM stub dependency)

## Data impact
- None — guard reads session state only.

## API / Contract impact
- None — no HTTP calls; session is from `auth-session` store.

## Testing / Evidence required
- Unit tests: absent, expired, and valid session paths.

## Risks / Notes
- `guard:stub-permissive` (D-611): the most common FE defect across 6 modules. Test for hardcoded-return-true is the primary evidence gate.
