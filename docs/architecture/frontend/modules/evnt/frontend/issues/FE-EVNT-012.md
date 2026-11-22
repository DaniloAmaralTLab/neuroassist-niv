# FE-EVNT-012 -- EmergencyAlarmComponent + AlarmSubjectBannerComponent + AcknowledgeButtonComponent

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

Three presentational components in `libs/evnt/feature-alarm/`: `EmergencyAlarmComponent` (full-bleed), `AlarmSubjectBannerComponent` (patient + label + time), and `AcknowledgeButtonComponent` (single action, hidden WHILE !canConfirm, disabled WHILE submitting). All standalone, OnPush.

## Context / Problem statement

- These are purely presentational — inputs in, outputs out, no injected facade (SPEC-02 §4).
- `AcknowledgeButtonComponent` is the ONLY affordance on the takeover (SPEC-02 §1, doc 02 §3). It is hidden WHILE `!canConfirm` and disabled WHILE `submitting` to prevent double-confirm.
- Background: full-bleed `--color-alarm` from `@neuroassist/shared/ui-tokens` (SPEC-02 §3, `contracts/design-tokens.md`). No hardcoded color.
- Color is NEVER the only alarm signal — text + icon + motion are also required (WCAG AA, SPEC-02 §4).
- Time display via a time-format pipe, never `toFixed` (carry-forward `fe-component:kpi-decimal-format`).
- Bloqueia: FE-EVNT-011 (AlarmPageComponent hosts these)

## Approach (execution path)

1. `EmergencyAlarmComponent`: input `vm: AlarmVM`, output `acknowledgeRequested`. Full-bleed Tailwind/oklch using `--color-alarm` token; not hardcoded red.
2. `AlarmSubjectBannerComponent`: inputs `patientName`, `commandLabel`, `detectedAt`. Renders "{patient} needs help · "{label}" · detected at HH:mm" using a time-format pipe.
3. `AcknowledgeButtonComponent`: inputs `canConfirm: boolean`, `submitting: boolean`. Output `acknowledgeRequested`. Hidden via `*ngIf`/`@if` WHILE `!canConfirm`; `[disabled]="submitting"`. Receives focus on takeover appearance.
4. Ensure the alarm is visually communicated by text + icon (AlarmChromeIcon from `libs/evnt/ui/`) + motion — not color alone (WCAG AA against `--color-alarm`).

## Non-goals

- No business logic in these components (the smart layer is AlarmPageComponent).

## Layer(s)

frontend / feature (`libs/evnt/feature-alarm/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §1

## Architecture alignment

- Standalone + OnPush
- Tailwind v4 + oklch tokens, no hardcoded color
- WCAG AA alarm signal (text + icon + motion, not color alone)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-alarm/src/lib/emergency-alarm/emergency-alarm.component.ts`
- [ ] `libs/evnt/feature-alarm/src/lib/emergency-alarm/emergency-alarm.component.html`
- [ ] `libs/evnt/feature-alarm/src/lib/alarm-subject-banner/alarm-subject-banner.component.ts`
- [ ] `libs/evnt/feature-alarm/src/lib/acknowledge-button/acknowledge-button.component.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (AcknowledgeButton hidden when !canConfirm; disabled when submitting; emits acknowledgeRequested on click)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- AcknowledgeButton hidden when `canConfirm=false` (not merely disabled)
- AcknowledgeButton disabled when `submitting=true`
- Time display uses a time-format pipe (not `toFixed` or string concatenation)
- Color is not the only visual alarm signal (icon + text present in template)

## Dependencies

- FE-EVNT-011 (AlarmPageComponent hosts these)

## Tenant-context impact

Nenhum.

## Risks / Notes

- Design tokens: `--color-alarm` from `@neuroassist/shared/ui-tokens` — never hardcode a hex/rgb value.
- WCAG AA: provide sufficient contrast against `--color-alarm` in both light and dark themes.

## Prioridade

P3
