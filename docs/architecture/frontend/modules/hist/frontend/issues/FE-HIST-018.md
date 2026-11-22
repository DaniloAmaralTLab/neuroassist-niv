# FE-HIST-018 -- feature-trail lib + EscalationTrailSectionComponent — smart, same HistoryFacade, flag hist.escalation-trail

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**[SAFETY-GEST-1] SPEC refs:** SPEC-02 §2, SPEC-01 §1 (trail as section), SPEC-05 §3 (flag hist.escalation-trail)

## Outcome
**[SAFETY-GEST-1]** `EscalationTrailSectionComponent` (smart, same `HistoryFacade`) renders the escalation & detection-lapse trail as a **page section** under the same `hist.history.read` authority — no extra call, no extra route, no extra authority. It is gated by feature flag `hist.escalation-trail`.

## Approach (execution path)
1. Create `frontend/libs/hist/feature-trail/src/lib/escalation-trail-section.component.ts` (standalone + OnPush):
   - Injects `HistoryFacade` (same facade, same read as feature-history — no duplicate call).
   - Reads `trail()` = `facade.historyPageVm().entries.filter(e => e.kind === 'escalation' || e.kind === 'detection-lapse')`.
   - Reads `trailDegraded()` = `facade.trailDegraded`.
   - Shows `TrailDegradedNoticeComponent` when `trailDegraded` is true.
   - Passes `attempts` and `lapses` to EscalationAttemptListComponent / DetectionLapseListComponent.
2. No `trail.routes.ts` needed — this is a page section, not a child route (SPEC-01 §1).
3. `EscalationTrailSectionComponent` shown in `HistoryPageComponent` only when `hist.escalation-trail` flag is on.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-trail/src/lib/escalation-trail-section.component.ts`
- [ ] Uses same HistoryFacade window — no extra call or authority
- [ ] gated by `hist.escalation-trail` feature flag in HistoryPageComponent
- [ ] Renders TrailDegradedNoticeComponent when trailDegraded signal is true
- [ ] `npx nx test hist-feature-trail` PASS
- [ ] `npx nx lint hist-feature-trail` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-trail` PASS
- [ ] `npx nx lint hist-feature-trail` PASS
- [ ] Section is not a child route — it is an `@if` block inside the /history page
- [ ] Turning off `hist.escalation-trail` does not affect the event timeline

## Dependencies
FE-HIST-011 (HistoryFacade), FE-HIST-019 (TrailSectionHeaderComponent), FE-HIST-020 (EscalationAttemptListComponent, DetectionLapseListComponent), FE-HIST-022 (ui/ SAFETY rows).

## Tenant-context impact
Nenhum — mesma leitura que feature-history; tenant derivado do JWT.

## Prioridade
P3
