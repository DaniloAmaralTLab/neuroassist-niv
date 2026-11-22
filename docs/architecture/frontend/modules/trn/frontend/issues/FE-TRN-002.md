# FE-TRN-002 -- TRN_ROUTES — /training + /training/assent, lazy loadComponent, caregiverAuthoringGuard

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`libs/trn/src/lib/trn.routes.ts` exports `TRN_ROUTES: Routes` with exactly two caregiver routes — `/training` (TrainingSessionPageComponent) and `/training/assent` (PatientAssentPageComponent) — both lazy via `loadComponent`, both guarded by `caregiverAuthoringGuard`, and no patient-session route or `/patient/confirm-training` route.

## Context / Problem statement
- SPEC-01 §1: two routes under the single caregiver identity; both use `caregiverAuthoringGuard`.
- The route file is the public entry point consumed by the caregiver Shell via `loadChildren: () => import('@neuroassist/trn').then(r => r.TRN_ROUTES)`.
- No `patientConfirmGuard` and no patient-session route — the assent surface runs in the caregiver session (ADR-005 amendment, SPEC-01 §2).
- Bloqueia: FE-TRN-004, FE-TRN-014, FE-TRN-019

## Approach (execution path)
1. Create `libs/trn/src/lib/trn.routes.ts` exporting `TRN_ROUTES: Routes`.
2. Define route `path: ''` (maps to `/training`) with `canActivate: [caregiverAuthoringGuard]`, `loadComponent` to `TrainingSessionPageComponent`, `title: 'Training'`, `data: { breadcrumb: 'Training' }`.
3. Define route `path: 'assent'` (maps to `/training/assent`) with `canActivate: [caregiverAuthoringGuard]`, `loadComponent` to `PatientAssentPageComponent`, `title: 'Patient assent'`, `data: { breadcrumb: 'Patient assent' }`.
4. Both `loadComponent` import paths are lazy (`() => import(...)`); no eager import at route-file level.
5. Re-export `TRN_ROUTES` from `src/index.ts`.
6. Verify: no `patientConfirmGuard`, no `/patient/confirm-training` path, no patient-session guard.

## Non-goals
- No implementation of `caregiverAuthoringGuard` here (FE-TRN-023).
- No implementation of `TrainingSessionPageComponent` or `PatientAssentPageComponent` here (FE-TRN-014, FE-TRN-019).
- No patient-session route under any path.

## Layer(s)
frontend / Tool entry (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-01-route-map.md` (§1, §2, §3, §4)

## Architecture alignment
- Lazy `loadComponent` for every route (no eager imports)
- Single caregiver identity (ACS INV-3 untouched)
- caregiverAuthoringGuard on both routes — never a hardcoded `return true`

## Implementation checklist (by layer/file)

**Lib path: `frontend/libs/trn/src/lib/`**
- 🔲 `trn.routes.ts` — TRN_ROUTES with exactly 2 routes, both `canActivate: [caregiverAuthoringGuard]`
- 🔲 `src/index.ts` — re-exports `TRN_ROUTES`

**Tests**
- 🔲 Unit test: `TRN_ROUTES` has exactly 2 entries; no entry has path containing `patient/confirm`
- 🔲 Unit test: each route has `caregiverAuthoringGuard` in its `canActivate` array
- 🔲 `npx nx lint trn` PASS
- 🔲 `npx nx build trn` PASS

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- `TRN_ROUTES` contains exactly two routes: `''` (training) and `'assent'` (patient-assent).
- Both routes include `caregiverAuthoringGuard` in their `canActivate` array; no other guard.
- No route entry has path `patient/confirm-training` or any patient-session-scoped path.
- Both `loadComponent` calls are lazy (arrow function, not direct component reference).
- `npx nx build trn` PASS; `npx nx lint trn` PASS.

## Dependencies
- FE-TRN-001 (TRN_ROUTES depends on MODULE_KEY from trn.contract.ts)
- FE-TRN-023 (caregiverAuthoringGuard implementation)

## Data impact
- None — route configuration only.

## API / Contract impact
- None — no HTTP endpoints here.

## Testing / Evidence required
- Unit test output: 2 routes, both with caregiverAuthoringGuard, no patient route.

## Risks / Notes
- Guard carry-forward `guard:stub-permissive` (Learning D-611): guard must reference `accessDecisionService` or `authSessionService`, never `return true`.
