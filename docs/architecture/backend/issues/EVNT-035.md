# EVNT-035 -- HIST audit facts for detection-lapse: DetectionLapseRaised/Resolved/Acknowledged + EscalationAttempted subjectType (SPEC-12 LAPSE-7/ESC-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

SPEC-12 LAPSE-7 requires three new HIST audit facts: `DetectionLapseRaised` (on raise, EVNT-030),
`DetectionLapseResolved` (on resolve, EVNT-031), `DetectionLapseAcknowledged` (on acknowledge,
EVNT-032). Additionally, the existing `EscalationAttempted` audit fact (ESC-7, already emitted for
emergency events) must carry a `lapseId` field (instead of `eventId`) when the subject is a lapse.
All four facts use the **standard HIST audit envelope** (action discriminates). The
`HistAuditClient` Feign adapter must be extended with the new payloads. No new HIST endpoint: same
`POST /hist/facts` surface; only the action string and subject fields differ.

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md §Audit / LAPSE-7
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1.2
- SPEC-11 ESC-7 (EscalationAttempted — reused)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/DetectionLapseService.java` (emit DetectionLapseRaised, DetectionLapseResolved, DetectionLapseAcknowledged via HistAuditClient)
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/EscalationSweep.java` (emit EscalationAttempted with lapseId when subject is a lapse)
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/audit/HistAuditClient.java` (add new fact DTOs: DetectionLapseRaisedFact, DetectionLapseResolvedFact, DetectionLapseAcknowledgedFact; extend EscalationAttemptedFact with optional lapseId)
- [ ] implementar `src/test/java/com/neuroassist/evnt/infrastructure/audit/HistAuditClientLapseTest.java`

## Criterios de aceite
- [ ] AC-1 On raise: `DetectionLapseRaised` audit published to HIST with `{action, lapseId, patientId, tenantId, deviceId, cause, lapseStartedAt, correlationId}` (LAPSE-7)
- [ ] AC-2 On resolve: `DetectionLapseResolved` audit published to HIST with `{action, lapseId, resolvedAt, correlationId}` (LAPSE-7)
- [ ] AC-3 On acknowledge: `DetectionLapseAcknowledged` audit published to HIST with `{action, lapseId, acknowledgedBy, acknowledgedAt, correlationId}` (LAPSE-7)
- [ ] AC-4 `EscalationAttempted` audit for a lapse attempt carries `lapseId` (not `eventId`) in the subject field; existing emergency escalation facts are unchanged (ESC-7 reuse)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.infrastructure.audit.HistAuditClientLapseTest"` exits 0 against WireMock HIST stub

## Dependencias
- EVNT-030 (precede — DetectionLapseService raise exists)
- EVNT-031 (precede — resolve exists)
- EVNT-032 (precede — acknowledge exists)
- EVNT-034 (precede — EscalationSweep lapse path exists)
- EVNT-012 (precede — HistAuditClient base adapter exists)

## Estimativa
M

## Prioridade
P7
