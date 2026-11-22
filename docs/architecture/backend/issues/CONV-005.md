# CONV-005 -- Domain ports — 6 outbound port interfaces (PublishedTreeRepositoryPort, AudioAssetPort, SearchPort, PatientReferencePort, AuditPort, UsagePort)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Defines the six outbound port interfaces that isolate the domain and application layers from
infrastructure (ArchUnit RULE-04): `PublishedTreeRepositoryPort` (find/save the aggregate +
lock for concurrency), `AudioAssetPort` (fetch bytes from blob storage + crypto-shred),
`SearchPort` (optional FTS/kNN lookup for caregiver/TRN — never called on the patient path,
ADR-002/INV-CONV-5), `PatientReferencePort` (validate patient exists via PAT service-client),
`AuditPort` (POST /hist/audit with hard-502 / durable-retry split, ADR-006),
`UsagePort` (persist opt-in `UsageSignal` rows). Interfaces live in `domain.ports`; no
implementation here — implementations come in P3/P4.

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/ports/PublishedTreeRepositoryPort.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/ports/AudioAssetPort.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/ports/SearchPort.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/ports/PatientReferencePort.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/ports/AuditPort.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/domain/ports/UsagePort.java`
- [ ] criar stubs `@MockBean` para cada port em `ConvServiceApplication` para compileJava green at P2

## Criterios de aceite
- [ ] AC-1 Six interfaces exist in `com.neuroassist.conv.domain.ports` with the correct method signatures (read from `api-contract.md` and `hub-integration.md`)
- [ ] AC-2 `AuditPort` distinguishes the two failure classes: `auditHard(AuditFact)` throws on HIST failure (hard-502); `auditWithRetry(AuditFact)` commits and enqueues (durable-retry, ADR-006)
- [ ] AC-3 `SearchPort` is annotated or documented as "NOT on the patient station path" (ADR-002, INV-CONV-5)
- [ ] AC-4 `./gradlew :conv-service:compileJava` exits 0 with stub implementations in place

## Dependencias
- CONV-004 (precede — domain model)

## Estimativa
S

## Prioridade
P2
