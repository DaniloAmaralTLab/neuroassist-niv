# GEST-017 -- HistAuditPort and HistAuditClient Feign adapter (fail-closed audit with shared audit envelope)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Implement the HIST audit sink adapter. All four GEST write operations (`EngineVersionRegistered`,
`EngineVersionDeprecated`, `EngineCapabilityDeclared`, `EngineCapabilityRetired`) call
`HistAuditPort.record(auditEvent)` synchronously within the same request transaction. Fail-closed: if
HIST rejects, the write is rolled back. The shared audit envelope structure matches
`event-contracts.md §1.1`.

## Spec de referencia
- contracts/event-contracts.md §1–2
- contracts/hub-integration.md §3
- SPEC-09 (messaging — synchronous audit, no broker)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/port/HistAuditPort.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/integration/HistAuditClient.java`
- [ ] implementar `src/test/java/com/neuroassist/gest/infrastructure/integration/HistAuditClientTest.java`

## Resultado esperado
`HistAuditPort.record(event)` posts the shared audit envelope to HIST. HIST failure causes the calling
write to be rolled back. WireMock test covers success and 5xx.

## Criterios de aceite
- [ ] AC-1: `HistAuditPort` is in `domain.port` with method `void record(AuditEvent event)` throwing `AuditUnavailableException` on failure.
- [ ] AC-2: `HistAuditClient` sends the shared audit envelope from `event-contracts.md §1.1` including `source="gest-service"` and the echoed `correlationId`.
- [ ] AC-3: `HistAuditClient` sends `url_prop: hist.base-url`.
- [ ] AC-4: `AuditEvent` includes idempotency key fields: `source`, `subjectType`, `subjectId`, `eventType`, `occurredAt` (event-contracts §2).
- [ ] AC-5: HIST returning `5xx` → `AuditUnavailableException` (service layer rolls back write, responds `503`).
- [ ] AC-6: `./gradlew :gest-service:test` exits 0 for `HistAuditClientTest` with WireMock stubs.

## Dependencias
- GEST-001 (precede — module scaffold)

## Estimativa
M

## Prioridade
P4
