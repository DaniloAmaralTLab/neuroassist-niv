# FE-DASH-001 -- dash.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP (5 composed authorities, no dash.*), MODULE_FEATURE_FLAGS

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/dash/src/lib/dash.contract.ts` is authored with the four exports required by the shell integration contract: `MODULE_KEY`, `MODULE_MENU_METADATA`, `MODULE_PERMISSION_MAP` (the union of the 5 composed modules' authorities, no `dash.*` key), and `MODULE_FEATURE_FLAGS` (`dash.suggestion.enabled`, `dash.bff.enabled`), all wired to the BE-canonical authority strings per D-639 and SPEC-05.

## Approach (execution path)
1. Create `libs/dash/src/lib/dash.contract.ts` exporting `MODULE_KEY = 'dash'`.
2. Define `MODULE_MENU_METADATA` with key `dash`, title `Home`, icon `dashboard`, section `care`, order `0`; one entry: `{ label: 'Home', route: '/home', requires: null }` (the home shell is not authority-gated; each embedded panel self-gates per SPEC-05 §4).
3. Define `MODULE_PERMISSION_MAP` with exactly 5 keys: `hist.history.read`, `evnt.event.read`, `evnt.detection-lapse.read`, `edge.device.read`, `pat.command.read` — copied verbatim from the owning modules; NO `dash.*` key (BE ADR-001 — DASH has no backend and no authority namespace).
4. Define `MODULE_FEATURE_FLAGS`: `dash.suggestion.enabled` (defaultState: true; inline advisory card) and `dash.bff.enabled` (defaultState: false; OFF until a dash-service is confirmed per ADR-001).
5. Re-export all four from `libs/dash/src/index.ts`.
6. Verify: `AccessDecisionService.can(key)` resolves for each permission key — guards and `@if` conditions use these keys unchanged (D-639).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/dash.contract.ts` created
- [ ] `MODULE_KEY = 'dash'` exported
- [ ] `MODULE_MENU_METADATA` — 1 entry (`/home`), `requires: null`, section `care`, order 0
- [ ] `MODULE_PERMISSION_MAP` — exactly 5 BE-canonical authority keys; zero `dash.*` keys
- [ ] `MODULE_FEATURE_FLAGS` — `dash.suggestion.enabled: true`, `dash.bff.enabled: false`
- [ ] All four symbols re-exported from `libs/dash/src/index.ts`
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS (no TS errors)
- [ ] `MODULE_PERMISSION_MAP` keys verified against SPEC-05 §2 — no invented authority

## Acceptance criteria
- [ ] `MODULE_PERMISSION_MAP` has exactly 5 keys matching SPEC-05 §2 verbatim (no `dash.*`, no `pat.patient.read`, no view-suffix variants)
- [ ] `MODULE_FEATURE_FLAGS['dash.bff.enabled'].defaultState === false`
- [ ] `MODULE_MENU_METADATA.order === 0` (first post-login destination)
- [ ] `npx nx build dash` PASS (no TS errors)

## Dependencies
Nenhuma (foundation issue — no predecessors).

## Tenant-context impact
None — this is a static contract definition; no tenant-scoped data.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-05-tool-contract.md` (§1–§4)

## Architecture alignment
- Standalone + OnPush + Signals (all components downstream)
- Tags Nx: `scope:dash`, `type:domain`
- D-639: permission codes equal BE authority constants exactly

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:dash
priority:P1

## Prioridade
P1
