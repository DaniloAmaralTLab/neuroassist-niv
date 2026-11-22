# FE-HIST-020 -- EscalationAttemptListComponent + DetectionLapseListComponent — presentational; uses shared ui/ row components

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**[SAFETY-GEST-1] SPEC refs:** SPEC-02 §2, SPEC-03 §2 (kind='escalation'|'detection-lapse')

## Outcome
**[SAFETY-GEST-1]** `EscalationAttemptListComponent` and `DetectionLapseListComponent` are presentational list wrappers that reuse the shared `EscalationRowComponent` and `DetectionLapseRowComponent` from `ui/` — no logic duplication.

## Approach (execution path)
1. Create `EscalationAttemptListComponent` (standalone + OnPush):
   - `@Input() attempts: HistoryEntryVM[]` (kind='escalation')
   - Iterates with `@for`, renders `EscalationRowComponent` per entry.
2. Create `DetectionLapseListComponent` (standalone + OnPush):
   - `@Input() lapses: HistoryEntryVM[]` (kind='detection-lapse')
   - Iterates with `@for`, renders `DetectionLapseRowComponent` per entry.
3. Both depend on the `ui/` shared row components (FE-HIST-022).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-trail/src/lib/escalation-attempt-list.component.ts`
- [ ] implementar `frontend/libs/hist/feature-trail/src/lib/detection-lapse-list.component.ts`
- [ ] Uses EscalationRowComponent from ui/ (no duplicate)
- [ ] Uses DetectionLapseRowComponent from ui/ (no duplicate)
- [ ] `npx nx test hist-feature-trail` PASS
- [ ] `npx nx lint hist-feature-trail` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-trail` PASS
- [ ] `npx nx lint hist-feature-trail` PASS

## Dependencies
FE-HIST-018 (EscalationTrailSectionComponent), FE-HIST-022 (EscalationRowComponent + DetectionLapseRowComponent — SAFETY).

## Tenant-context impact
Nenhum.

## Prioridade
P3
