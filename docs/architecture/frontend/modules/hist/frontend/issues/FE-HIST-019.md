# FE-HIST-019 -- TrailSectionHeaderComponent + TrailDegradedNoticeComponent — presentational; partial-trail failure (SPEC-07 §2.1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**[SAFETY-GEST-1] SPEC refs:** SPEC-02 §2, SPEC-07 §2.1

## Outcome
**[SAFETY-GEST-1]** `TrailSectionHeaderComponent` renders the trail title with a "distinct from an active emergency" framing; `TrailDegradedNoticeComponent` shows a partial-trail failure notice — it NEVER implies "there were no escalations" when that section failed.

## Approach (execution path)
1. Create `TrailSectionHeaderComponent` (standalone + OnPush):
   - Renders section title (e.g. "Escalation & Detection-Lapse Trail") plus a small visual framing note: "This is a historical review — not an active emergency notification" (or equivalent short clarification).
   - Uses `--color-info` token family, never `--color-alarm`.
2. Create `TrailDegradedNoticeComponent` (standalone + OnPush):
   - Renders: "Couldn't load the escalation & detection-lapse trail — partial history shown."
   - Shown when `trailDegraded` signal is true; does NOT imply "no escalations occurred".
   - Does NOT replace or hide the event timeline that loaded successfully.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-trail/src/lib/trail-section-header.component.ts`
- [ ] implementar `frontend/libs/hist/feature-trail/src/lib/trail-degraded-notice.component.ts`
- [ ] TrailSectionHeaderComponent uses --color-info, never --color-alarm
- [ ] TrailDegradedNoticeComponent does NOT imply "no escalations occurred"
- [ ] `npx nx test hist-feature-trail` PASS
- [ ] `npx nx lint hist-feature-trail` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-trail` PASS
- [ ] `npx nx lint hist-feature-trail` PASS
- [ ] TrailDegradedNoticeComponent test: message does not contain "no escalation"

## Dependencies
FE-HIST-018 (EscalationTrailSectionComponent that hosts these).

## Tenant-context impact
Nenhum.

## Prioridade
P3
