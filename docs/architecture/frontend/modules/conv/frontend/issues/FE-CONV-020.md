# FE-CONV-020 -- TreeState + error UI surfaces — cold-loading, cold-empty, offline-stale marker, session-ended banner, setup-issue banner, syncNow toast (never modal)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-03 §2, SPEC-07 §2 §4–5, generator-config.yml §module_type (offline-first-runtime)

## Outcome
`SpeechTreeNavigatorComponent` renders correctly for all five `TreeState` values and for the error states from SPEC-07 §2. `cold` → bounded loading state (spinner with timeout, never infinite). `empty` → "not yet synced on this station" state (R1). `offline-stale` → subtle "offline — last synced vX" marker; cached tree stays usable. `401 unauthenticated` → session-ended banner (inline, calm; cached tree visible beneath). `403 forbidden` → setup-issue banner. Manual `syncNow` failure → toast only. **NEVER a modal** (CONV never takes over the viewport — EVNT is the only product takeover).

## Approach (execution path)
1. Add `@if` branches to `SpeechTreeNavigatorComponent` template for each `treeState()` value:
   - `'cold'` → render a bounded loading indicator with a maximum display time (e.g., 10 s); after timeout, treat as `empty` (never infinite spinner).
   - `'syncing'` → render the cached tree normally + a subtle background-sync indicator.
   - `'ready'` → render the full tree normally.
   - `'empty'` → render "Not yet synced on this station. Connect to sync." (never a blank speech surface).
   - `'offline-stale'` → render the tree + inline "Offline — last synced vX" marker (not an error; not a toast).
2. For error states (from `SpeechTreeFacade.errorState()` signal):
   - `'unauthenticated'` → inline banner: "Session ended — ask your caregiver" (calm, below the cached tree if present).
   - `'forbidden'` → inline banner: "Setup issue — ask your caregiver" (stop syncing).
   - Errors map via `ProblemDetail.type` slug → AppError → surface copy (SPEC-07 §2).
3. Manual `syncNow()` from a "Sync now" button: on failure → `@neuroassist/shared/ui-feedback` toast. On success → tree updates silently.
4. No modal under any circumstance.
5. Unit tests for each state transition: cold → bounded spinner; empty → "not yet synced" message; offline-stale → tree stays usable.

## Implementation checklist (by layer/file)
- [ ] `SpeechTreeNavigatorComponent` template handles all 5 `TreeState` values with correct UI for each
- [ ] `'cold'` state: bounded loading indicator with max display time (never infinite spinner)
- [ ] `'empty'` state: "Not yet synced on this station" message (never blank speaking surface)
- [ ] `'offline-stale'` state: subtle offline marker; cached tree remains fully usable
- [ ] `'unauthenticated'` error → inline session-ended banner (not modal; cached tree visible beneath)
- [ ] `'forbidden'` error → inline setup-issue banner (not modal)
- [ ] Manual syncNow failure → toast only (never modal)
- [ ] Error copy mapped from `ProblemDetail.type` slug via error-model (not hardcoded from HTTP status)
- [ ] `npx nx test conv-feature-converse` PASS — all state branches; no modal rendered
- [ ] `npx nx lint conv-feature-converse` PASS

## Acceptance criteria
- [ ] `treeState()='cold'` renders a bounded loading state that transitions out before a configurable timeout
- [ ] `treeState()='empty'` renders an informative "not yet synced" state, never an empty tile grid
- [ ] `treeState()='offline-stale'` → tree is interactive and the offline marker is visible
- [ ] Error state `unauthenticated` → inline banner, no modal, no route change
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Dependencies
FE-CONV-011 (TreeState type).
FE-CONV-012 (SpeechTreeFacade.treeState() signal).
INT-FE-CONV-003 (shared/error-model for ProblemDetail.type mapping).

## Tenant-context impact
None — error states are patient-session-scoped; no tenant-level differentiation in error rendering.
