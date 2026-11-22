# FE-EVNT-008 -- Wire mappers + name resolver — toAlarmVM, toRoutineNoticeVM, toAcknowledgedVM, toEscalationAttemptVM

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/api/src/lib/` has four mapper functions and a `PatientNameResolver` service. Each mapper converts a wire record to a VM following the invariants: no fabricated fields, `patientName`/`confirmedByName` resolved externally (not from wire), `commandLabel` verbatim, masked `target` verbatim, `pollIntervalSeconds`/`serverTime` from envelope (never hardcoded).

## Context / Problem statement

- Carry-forward `fe-facade:fabricated-null-fields`: mappers MUST NOT invent `patientName` / `confirmedByName` from missing data — resolve from session/ACS link, render "the patient" fallback only WHERE known (G-EVNT-6, SPEC-03 §1).
- Carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`: VM fields must derive from the wire record shape only — no creative field additions.
- `EscalationAttemptVM.maskedTarget` renders the `target` field VERBATIM (already masked BE-side) — the mapper never unmasks or enriches it.
- `toEscalationAttemptVM`: `errorReason` → human readable `note`, never a raw provider payload.
- Bloqueia: FE-EVNT-009 (facade calls mappers)

## Approach (execution path)

1. Create `alarm-vm.mapper.ts`: `toAlarmVM(envelope: ActiveAlarmEnvelopeWire, resolvedName: string | null): AlarmVM` — reads `activeAlarm.urgency` to confirm it is `emergency` before setting `state='active'`; reads `serverTime` and `pollIntervalSeconds` for `MonitoringVM`.
2. Create `routine-notice-vm.mapper.ts`: `toRoutineNoticeVM(event: EventRowWire, resolvedName: string | null): RoutineNoticeVM` — urgency unknown/not-emergency degrades conservatively to routine notice (ADR-005 §Decision 4).
3. Create `acknowledged-vm.mapper.ts`: `toAcknowledgedVM(result: ConfirmationResultWire, resolvedNames: {...}): AcknowledgedVM` — `confirmedByName` from session, not from `confirmedBy` id in wire.
4. Create `escalation-attempt-vm.mapper.ts`: `toEscalationAttemptVM(attempt: EscalationAttemptWire): EscalationAttemptVM` — `maskedTarget = attempt.target` (verbatim, never enriched); `note` is a human-readable translation of `errorReason` enum.
5. Create `patient-name.resolver.ts`: service that resolves patient display names from `@neuroassist/shared/auth-session` / ACS link — returns a `Signal<Map<string,string>>`.

## Non-goals

- No facade signals — that is FE-EVNT-009.
- No unmasking of `EscalationAttemptWire.target` (intentionally masked BE-side).

## Layer(s)

frontend / data-access (`libs/evnt/api/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §1–§4b, §5

## Architecture alignment

- Carry-forward `fe-facade:fabricated-null-fields`
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access layer**
- [ ] `libs/evnt/api/src/lib/alarm-vm.mapper.ts`
- [ ] `libs/evnt/api/src/lib/routine-notice-vm.mapper.ts`
- [ ] `libs/evnt/api/src/lib/acknowledged-vm.mapper.ts`
- [ ] `libs/evnt/api/src/lib/escalation-attempt-vm.mapper.ts`
- [ ] `libs/evnt/api/src/lib/patient-name.resolver.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (each mapper: wire → VM; patientName fallback "the patient" when unknown; maskedTarget verbatim; unknown urgency → routine; pollIntervalSeconds from envelope)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P2

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `toAlarmVM` with unknown patient returns `patientName = "the patient"` (never null/undefined)
- `toEscalationAttemptVM.maskedTarget` equals input `attempt.target` exactly (not enriched)
- `toRoutineNoticeVM` with urgency=undefined degrades to routine (never promoted to alarm)
- `toAlarmVM` reads `pollIntervalSeconds` from the envelope, never hardcodes it

## Dependencies

- FE-EVNT-007 (wire types)

## Tenant-context impact

Nenhum direto.

## Risks / Notes

- Carry-forward: fabricated nulls caused confusing "null patient" text in earlier modules.

## Prioridade

P2
