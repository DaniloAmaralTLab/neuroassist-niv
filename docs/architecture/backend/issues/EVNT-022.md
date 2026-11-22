# EVNT-022 -- Implement PatientEventController and EventController read surface — GET active-alarm, list events, get event by id, GET escalation-attempts (ACS link scoping INV-EVNT-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Exposes the four read endpoints of the caregiver path (ACS resource server, authority
`evnt.event.read`/`evnt.escalation.read`). Read scoping: every response is guarded by
ACS link check (`CaregiverLinksPort`) — unlinked or cross-tenant `patientId`/`eventId` returns
`404` (never discloses existence — INV-EVNT-7). `GET /evnt/patients/{patientId}/active-alarm`
returns the active emergency plus `pollIntervalSeconds` (server-advertised from config) and
`serverTime`. `GET /evnt/patients/{patientId}/events` supports `?urgency`, `?limit`, `?before`
keyset pagination. `GET /evnt/events/{eventId}/escalation-attempts` returns attempts ordered by
`attemptedAt`, destinations **masked** (last digits of phone, subscription label — SPEC-06/SPEC-11).

## Spec de referencia
- SPEC-01 §3, §3.4 (read surface + escalation trail)
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §3

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/PatientEventController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/EscalationAttemptController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/ActiveAlarmResponse.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/EventListResponse.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/EscalationAttemptResponse.java`

## Criterios de aceite
- [ ] AC-1 `GET /evnt/patients/{id}/active-alarm` returns `{activeAlarm, serverTime, pollIntervalSeconds}` (non-null alarm or null — api §3.1)
- [ ] AC-2 `GET /evnt/patients/{id}/events?limit=5` returns at most 5 events ordered `occurredAt DESC` with `nextBefore` cursor
- [ ] AC-3 `GET /evnt/events/{id}/escalation-attempts` returns attempts ordered by `attemptedAt` with phone number masked (`+55•••••1234`)
- [ ] AC-4 Caller not linked to `patientId` or `eventId` → `404 Not Found` (INV-EVNT-7, never discloses existence)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.api.PatientEventControllerTest"` exits 0

## Dependencias
- EVNT-008 (precede — EventRepository)
- EVNT-010 (precede — EscalationAttemptRepository)
- EVNT-013 (precede — ACS link scoping)
- EVNT-015 (precede — security config)

## Estimativa
M

## Prioridade
P7
