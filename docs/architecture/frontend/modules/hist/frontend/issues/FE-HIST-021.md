# FE-HIST-021 -- ui/ lib — HistoryEventRowComponent, UrgencyBadgeComponent, ConfirmationStatusComponent, FeedbackOutcomeBadgeComponent

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

**SPEC refs:** SPEC-02 §1–3, SPEC-03 §2 (HistoryEntryVM fields)

## Outcome
The `ui/` lib contains four presentational, app-agnostic-local components: `HistoryEventRowComponent` (prototype event card — commandLabel + urgency + confirmation), `UrgencyBadgeComponent` (emergency/routine), `ConfirmationStatusComponent` ("You confirmed at …" / "Not yet confirmed"), and `FeedbackOutcomeBadgeComponent` (real/false positive/not reviewed). None import `HttpClient` or any facade.

## Approach (execution path)
1. Create `frontend/libs/hist/ui/src/lib/history-event-row.component.ts` (standalone + OnPush):
   - `@Input() entry: HistoryEntryVM`; `@Input() canRecordFeedback: boolean`; `@Output() markFeedback: EventEmitter<...>`.
   - Shows command label in quotes (prototype: `"{{ entry.commandLabel }}"`); falls back to `entry.title` when `commandLabel` absent (G-HIST-1).
   - Renders `UrgencyBadgeComponent`, `ConfirmationStatusComponent`, `FeedbackOutcomeBadgeComponent`.
2. Create `UrgencyBadgeComponent`: renders 'emergency' (badge tone 'er'/'alarm') or 'routine' (tone 'nf') reusing `@neuroassist/shared/ui-components` badge.
3. Create `ConfirmationStatusComponent`: renders "You confirmed at HH:MM" (from `entry.confirmedAt`) or "Not yet confirmed".
4. Create `FeedbackOutcomeBadgeComponent`: renders per `entry.feedbackOutcome` — 'real' (ok tone), 'false_positive' (mu tone), 'not_evaluated' (muted).
5. All components depend only on `@neuroassist/shared/ui-*` — no data-access imports.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/ui/src/lib/history-event-row.component.ts`
- [ ] implementar `frontend/libs/hist/ui/src/lib/urgency-badge.component.ts`
- [ ] implementar `frontend/libs/hist/ui/src/lib/confirmation-status.component.ts`
- [ ] implementar `frontend/libs/hist/ui/src/lib/feedback-outcome-badge.component.ts`
- [ ] `frontend/libs/hist/ui/src/index.ts` — export all four
- [ ] HistoryEventRowComponent falls back to entry.title when commandLabel absent
- [ ] No HttpClient import in any ui/ component
- [ ] `npx nx test hist-ui` PASS
- [ ] `npx nx lint hist-ui` PASS

## Acceptance criteria
- [ ] `npx nx test hist-ui` PASS
- [ ] `npx nx lint hist-ui` PASS
- [ ] `npx nx build hist-ui` PASS

## Dependencies
FE-HIST-010 (HistoryEntryVM type).

## Tenant-context impact
Nenhum — componentes puramente presentacionais sem estado de tenant.

## Prioridade
P5
