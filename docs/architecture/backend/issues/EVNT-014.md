# EVNT-014 -- Implement HistAuditFeignClient — POST /audit with service-client token, EventGenerated / AlarmConfirmed / FeedbackRecorded / EscalationAttempted envelopes

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT audits four domain actions to HIST over synchronous REST (messaging disabled): `EventGenerated`,
`AlarmConfirmed`, `FeedbackRecorded`, `EscalationAttempted`. The envelope is **identical to
ACS/PAT/EDGE** (event-contracts §1.1). Service-client JWT for `evnt-service` principal; `X-Correlation-Id`
echoed on every call (INV-EVNT-8). Failure policy: prod profile → `502 audit-unavailable`; dev
profile → log-only (INT-EVNT-003). `EscalationAttempted` uses `actorType = system`, `actorId =
evnt-service`, carrying `{patientId, tier, channel, caregiverId, status, errorReason?, providerMessageId?}`.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §4
- INT-EVNT-003 (HIST failure policy — hard-502 vs enqueue)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/hist/AuditPort.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/feign/HistAuditFeignClient.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/feign/dto/AuditEnvelope.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/feign/HistAuditFeignClientTest.java` (WireMock: 200 ok, 5xx → policy)

## Criterios de aceite
- [ ] AC-1 `POST {hist.baseUrl}/audit` with `EventGenerated` envelope, `actorType=edge-device`, `actorId=deviceId` completes successfully
- [ ] AC-2 `EscalationAttempted` envelope carries `actorType=system`, `actorId=evnt-service`, and the SPEC-11 payload fields
- [ ] AC-3 HIST `5xx` on prod profile → caller receives `502 audit-unavailable` (not silently swallowed)
- [ ] AC-4 HIST `5xx` on dev profile → logged only, call continues (see INT-EVNT-003 for final policy)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.feign.HistAuditFeignClientTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- INT-EVNT-002 (service-client minting for the hist call)
- INT-EVNT-003 (HIST failure policy — determines hard-502 vs enqueue in AC-3)

## Estimativa
S

## Prioridade
P4
