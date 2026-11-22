# FE-PAT-024 -- Telemetry events via @neuroassist/shared/observability (create/calibrate/retire/register actions)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
PAT UI actions (command create, calibrate, retire, gesture-type register, patient register) are forwarded to `@neuroassist/shared/observability` as typed events, enabling downstream HIST audit consumption.

## Approach (execution path)
1. Create `libs/pat/integration/src/lib/pat-observability.events.ts` defining typed event names and payloads: `pat.command.created`, `pat.command.calibrated`, `pat.command.retired`, `pat.gesture-type.registered`, `pat.patient.registered`.
2. Update `PatShellIntegrationService` to call `observabilityService.emit(eventType, payload)` when each facade action completes.
3. Never call `console.log` for audit (SPEC-06 EARS).
4. HIST module consumes these events downstream — PAT FE does not render history (SPEC-06 §2).
5. Write unit tests verifying that each facade action completion triggers the corresponding observability event.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/integration/src/lib/pat-observability.events.ts`
- [ ] atualizar `libs/pat/integration/src/lib/pat-shell-integration.service.ts`
- [ ] unit tests (cada ação dispara evento observability)
- [ ] `npx nx test pat-integration` PASS
- [ ] `npx nx lint pat-integration` PASS

## Acceptance criteria
- [ ] All 5 PAT action completions emit a typed observability event and no `console.log` (SPEC-06 EARS).
- [ ] `pat-observability.events.ts` has no HttpClient and no direct HIST dependency.
- [ ] `npx nx build pat-integration` PASS.

## Dependencies
FE-PAT-020 (PatShellIntegrationService).
FE-PAT-010 (CommandFacade action signals).
FE-PAT-008 (PatientFacade register signal).

## Tenant-context impact
Nenhum (observability events carry the patientId / commandId; tenant context is in the JWT and propagated by the shared observability service).

## Prioridade
P8
