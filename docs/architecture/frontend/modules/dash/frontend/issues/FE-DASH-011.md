# FE-DASH-011 -- DetectionLapseNoticeComponent — presentational; amber notice for 'online but not detecting' (SAFETY: never emergency, never all_clear)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/dash/feature-overview/src/lib/detection-lapse-notice/detection-lapse-notice.component.ts` is a standalone `OnPush` presentational component that takes `@Input lapse: NoticeVM | null` and renders an amber "online but not detecting" notice when a detection lapse is open — never styling it as emergency, never contributing to `all_clear` (SAFETY invariants INV-1 and INV-3 together prevent this path).

## Approach (execution path)
1. Create `detection-lapse-notice.component.ts` with `@Input() lapse: NoticeVM | null = null`.
2. Template: `@if (lapse !== null)` → render amber notice banner with text from `lapse.message` (e.g. "Device is online but no gesture detected in the last 2 minutes. Check camera positioning.").
3. Color: use `--color-status-notice` (amber) token — NEVER `--color-alarm` and NEVER any red/emergency-class. This is a routine operational notice (SPEC-07 §2).
4. No action buttons on this notice: it is informational only. Navigation to EVNT lapse detail (if any) is an outbound link, not a DASH-owned action.
5. Unit test: `lapse = null` → component renders nothing; `lapse = { message: '...' }` → renders amber notice.
6. SAFETY note in TSDoc: "This component MUST NOT apply emergency styling. Emergency UI is owned exclusively by EVNT (INV-3). Detection lapse = amber notice, never emergency (SPEC-07 §2)."

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/detection-lapse-notice/detection-lapse-notice.component.ts` standalone + OnPush
- [ ] `frontend/libs/dash/feature-overview/src/lib/detection-lapse-notice/detection-lapse-notice.component.html`
- [ ] `@Input() lapse: NoticeVM | null = null`
- [ ] Renders ONLY when `lapse !== null`
- [ ] Uses amber token `--color-status-notice` (not `--color-alarm`, not any red/emergency CSS class)
- [ ] TSDoc SAFETY comment on the class
- [ ] Unit test: null input → empty; non-null → amber notice visible
- [ ] `npx nx test dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] `lapse = null` renders nothing (no empty placeholder, no "0 lapses" counter)
- [ ] `lapse != null` renders amber notice — zero emergency-class CSS applied
- [ ] `npx nx test dash` PASS

## Dependencies
- FE-DASH-006 (DashboardFacade exposes `detectionLapse: Signal<NoticeVM | null>`)
- FE-DASH-008 (OverviewPageComponent passes `[lapse]`)
- INT-FE-DASH-001 (LapseAlertFacade — until it lands, `lapse` will always be `null`; component must handle this gracefully)

## Tenant-context impact
None — lapse state is scoped to the active patient by EVNT.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 DetectionLapseNoticeComponent)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-07-error-handling.md` (§2 — online but not detecting)

## Architecture alignment
- SAFETY-GEST-1 / INV-1 / INV-3: detection lapse = `notice` (amber), never `all_clear`, never `emergency`
- Standalone + OnPush
- Tags Nx: `scope:dash`, `type:feature`

## Milestone
Wave 3 / Feature lib

## Labels
type:feature
layer:frontend
scope:dash
priority:P3
safety:INV-1,INV-3,SAFETY-GEST-1

## Prioridade
P3
