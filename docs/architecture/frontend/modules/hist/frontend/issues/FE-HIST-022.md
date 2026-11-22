# FE-HIST-022 -- [SAFETY] EscalationRowComponent + DetectionLapseRowComponent — neutral info styling; --color-info NEVER --color-alarm; maskedTarget verbatim

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**[SAFETY] SPEC refs:** SPEC-02 §2 (visual distinctness SAFETY-GEST-1), SPEC-03 §2 (isSafetySurface), doc 01 §1

## Outcome
**[SAFETY]** `EscalationRowComponent` and `DetectionLapseRowComponent` render with **neutral, informational styling** (`--color-info` family) — NEVER `--color-alarm` or emergency treatment. `maskedTarget` on escalation rows is rendered **verbatim** from the wire; the FE NEVER unmasks.

## Approach (execution path)
1. Create `EscalationRowComponent` (standalone + OnPush):
   - `@Input() entry: HistoryEntryVM` (kind='escalation')
   - Renders: channel label (web_push → "Push notification" | sms → "SMS" | voice → "Voice call"), `maskedTarget` verbatim (e.g. "+1 *** *** 4567"), outcome badge (sent/failed).
   - **Background/border uses `--color-info` token family** — never `--color-alarm`, never pulsing/animated emergency treatment.
   - `isSafetySurface = true` drives the info styling class.
2. Create `DetectionLapseRowComponent` (standalone + OnPush):
   - `@Input() entry: HistoryEntryVM` (kind='detection-lapse')
   - Renders: lapseState ('started'|'resolved'|'acknowledged'), source label, occurredAt.
   - Same `--color-info` neutral treatment.
3. Both components: no auto-route, no full-screen takeover, no animation (SPEC-02 §2).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/ui/src/lib/escalation-row.component.ts`
- [ ] implementar `frontend/libs/hist/ui/src/lib/detection-lapse-row.component.ts`
- [ ] EscalationRowComponent uses --color-info, NEVER --color-alarm
- [ ] maskedTarget rendered verbatim — no unmasking, no reconstruction
- [ ] DetectionLapseRowComponent uses --color-info, NEVER --color-alarm
- [ ] No animation or full-screen takeover
- [ ] `npx nx test hist-ui` PASS
- [ ] `npx nx lint hist-ui` PASS

## Acceptance criteria
- [ ] `npx nx test hist-ui` PASS — test proves no --color-alarm CSS class applied to escalation or detection-lapse row
- [ ] `npx nx lint hist-ui` PASS
- [ ] E2E (FE-HIST-029) confirms neutral info styling and masked target verbatim render

## Dependencies
FE-HIST-010 (HistoryEntryVM — isSafetySurface flag), FE-HIST-021 (sibling ui/ components).

## Tenant-context impact
Nenhum.

## Prioridade
P5
