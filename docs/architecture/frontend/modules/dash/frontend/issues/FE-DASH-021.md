# FE-DASH-021 -- Telemetry — forward refresh events, source-error signals, detection-lapse notices to @neuroassist/shared/observability; correlation-id from composed reads; no raw patient PII (SPEC-07 §4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`OverviewPageComponent` and `DashShellIntegrationService` forward three event categories to `@neuroassist/shared/observability`: (1) caregiver-initiated refresh, (2) per-source error/stale transitions, and (3) detection-lapse notice appearances and dismissals. All events carry the composed-read correlation id; no raw patient PII is included in event payloads.

## Approach (execution path)
1. Inject `ObservabilityService` from `@neuroassist/shared/observability` in `DashShellIntegrationService`.
2. On `refresh()`: emit `{ event: 'dash.overview.refresh', correlationId: <from composed read> }`.
3. On source-error/stale transition (derived from `DashboardFacade.sources()` signal changes): emit `{ event: 'dash.source.error', source: <SourceKey>, health: <SourceHealth>, correlationId }`. Use an `effect()` on `sources()` to detect transitions.
4. On detection-lapse notice appearing (FE-DASH-011 `lapse` input becomes non-null): emit `{ event: 'dash.detection-lapse.shown', correlationId }`. On disappearing: emit `{ event: 'dash.detection-lapse.dismissed' }`.
5. On `SuggestionCardComponent` confirm/ignore (FE-DASH-012): emit `{ event: 'dash.suggestion.confirmed' }` or `{ event: 'dash.suggestion.ignored' }`.
6. PII rule: event payloads contain no patient name, DOB, diagnosis or any `Patient.*` field. PatientId (UUID) is acceptable as a pseudonymous correlation key.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/integration/src/lib/dash-shell-integration.service.ts` — refresh event telemetry
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-page.component.ts` — source-error effect + lapse events + suggestion events
- [ ] No raw patient PII in any event payload (name, DOB excluded; patientId UUID is ok)
- [ ] Correlation id from composed reads carried in all events
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS
- [ ] At least one `effect()` wiring source-error transitions (not on every render cycle)

## Acceptance criteria
- [ ] Grep: no `patient.name` / `patient.dateOfBirth` / PII fields in event payloads
- [ ] `refresh()` emits a `dash.overview.refresh` event with `correlationId`
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-007 (DashShellIntegrationService)
- FE-DASH-008 (OverviewPageComponent)
- FE-DASH-011 (DetectionLapseNoticeComponent lapse signal)
- FE-DASH-012 (SuggestionCardComponent confirm/ignore outputs)

## Tenant-context impact
None — events are tenant-scoped via the JWT; no extra tenant tagging needed.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-07-error-handling.md` (§4)

## Architecture alignment
- No raw patient PII in telemetry (SPEC-07 §4; privacy constraint)
- Tags Nx: `scope:dash`, `type:util`

## Milestone
Wave 8 / Observability

## Labels
type:feature
layer:frontend
scope:dash
priority:P8

## Prioridade
P8
