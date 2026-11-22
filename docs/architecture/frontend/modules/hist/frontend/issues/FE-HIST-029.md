# FE-HIST-029 -- [SAFETY-GEST-1] E2E — escalation-detection-lapse-trail.feature (info styling, masking, partial-trail degraded)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**[SAFETY-GEST-1] SPEC refs:** SPEC-08 §escalation-detection-lapse-trail.feature, e2e/escalation-detection-lapse-trail.feature

## Outcome
**[SAFETY-GEST-1]** Playwright spec covers: escalation and detection-lapse trail as page section under `hist.history.read` (no extra authority); neutral info styling (never alarm); `maskedTarget` verbatim render; partial-trail degraded failure (banner, NOT "no escalations").

## Approach (execution path)
1. Create `frontend/apps/hist-e2e/src/escalation-detection-lapse-trail.spec.ts`.
2. Scenarios:
   - Trail section appears on /history when flag `hist.escalation-trail` is on and session has `hist.history.read`
   - Escalation row: `channel` label rendered correctly; `maskedTarget` shows masked value verbatim
   - Escalation row: NO `--color-alarm` CSS class applied (asserting against alarm styling)
   - Detection-lapse row: lapseState rendered; NO alarm styling
   - Partial-trail degraded: mock makes the EVNT-related call fail while timeline succeeds → `TrailDegradedNoticeComponent` shown; event timeline still visible; no "no escalations" text
   - Trail hidden when `hist.escalation-trail` flag is off

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/hist-e2e/src/escalation-detection-lapse-trail.spec.ts`
- [ ] Trail section under hist.history.read only (no extra authority)
- [ ] Escalation row: maskedTarget verbatim (no reconstruction)
- [ ] No --color-alarm CSS class on safety rows
- [ ] Partial-trail degraded: banner shown, timeline still visible
- [ ] Trail hidden when flag is off

## Acceptance criteria
- [ ] `npx nx e2e hist-e2e --spec escalation-detection-lapse-trail.spec.ts` PASS

## Dependencies
FE-HIST-018..020 (feature-trail), FE-HIST-022 (EscalationRowComponent + DetectionLapseRowComponent — SAFETY).

## Tenant-context impact
Tests use a single-tenant/patient fixture scope.

## Prioridade
P9
