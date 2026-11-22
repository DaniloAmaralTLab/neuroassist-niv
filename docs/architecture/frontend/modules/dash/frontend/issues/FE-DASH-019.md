# FE-DASH-019 -- Per-source error states and degraded banners — inline banner per failed panel (not all-or-nothing); device panel error state (not 'offline', not blank); HIST failure → em-dash KPIs (SPEC-07 §2-3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
Each failed-source panel renders an inline degraded banner while remaining healthy panels stay operational (progressive, not all-or-nothing). The device panel specifically shows an **error state** (not "offline", not blank) on EDGE read failure. HIST failure renders KPIs as `"—"` (already enforced by INV-4 in FE-DASH-010) and adds a "History may be out of date" inline banner.

## Approach (execution path)
1. Create `libs/dash/feature-overview/src/lib/panel-error-banner/panel-error-banner.component.ts` (standalone, OnPush): `@Input() message: string`; renders an inline warning banner using `@neuroassist/shared/ui-feedback` (no modal, no toast — SPEC-07 §4).
2. In `OverviewPageComponent` template, wrap each composed panel:
   - EVNT alarm/monitoring: `@if (sources().evnt === 'error' || sources().evnt === 'stale')` → show `<dash-panel-error-banner message="Alarm status unavailable — cannot confirm" />`
   - EDGE device card: `@if (sources().edge === 'error')` → show error-state wrapper (not "offline" text, not blank card); `EdgeDeviceCardComponent` should already render error state from EDGE's own design — DASH just ensures the EDGE `error` source renders the error panel
   - HIST: `@if (sources().hist === 'error' || sources().hist === 'stale')` → banner "History may be out of date — last checked HH:MM" alongside the `"—"` KPIs from FE-DASH-010
   - PAT: `@if (sources().pat === 'empty')` → "Cannot confirm the patient" degraded note
3. Healthy panels NOT failed render normally alongside the failed ones (partial failure ≠ blank screen).
4. No modal ever from DASH — SPEC-07 §4 (never from DASH).
5. Toast only on a full refresh failure (implemented in FE-DASH-020).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/panel-error-banner/panel-error-banner.component.ts` created
- [ ] `frontend/libs/dash/feature-overview/src/lib/panel-error-banner/panel-error-banner.component.html`
- [ ] EVNT `error`/`stale` → inline banner (not all-or-nothing)
- [ ] EDGE `error` → error-state panel (not "offline" text, not blank)
- [ ] HIST `error`/`stale` → "History may be out of date" banner + `"—"` KPIs
- [ ] PAT `empty` → "Cannot confirm the patient" note
- [ ] Healthy panels render normally alongside failed panels
- [ ] No modal from DASH (SPEC-07 §4)
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] EDGE source `error` renders error-state panel, not "offline" label, not blank
- [ ] HIST `error` renders `"—"` KPIs (from FE-DASH-010) + inline banner
- [ ] Partial failure: at least one source ok → that panel still renders
- [ ] No `MatDialog` or `ModalService` calls in `OverviewPageComponent`

## Dependencies
- FE-DASH-006 (per-source `sources()` signal)
- FE-DASH-008 (OverviewPageComponent template)
- FE-DASH-010 (KpiRowComponent already renders `"—"` for null KPIs)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-07-error-handling.md` (§2, §3, §4)

## Architecture alignment
- Progressive degradation (not all-or-nothing)
- INV-4: `"—"` not `0` for failed KPIs (enforced in FE-DASH-010; this issue adds the banner)
- Standalone + OnPush
- Tags Nx: `scope:dash`, `type:feature`

## Milestone
Wave 7 / UX polish

## Labels
type:feature
layer:frontend
scope:dash
priority:P7

## Prioridade
P7
