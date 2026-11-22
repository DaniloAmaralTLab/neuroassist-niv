# INT-ACS-001 -- ACS → HIST audit integration (Feign client + audit envelope contract + resilience policy)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Integration contract between ACS (audit producer) and HIST (audit consumer).
ACS calls `POST {hist.baseUrl}/audit` synchronously (Feign, Eureka discovery) with
the envelope defined in event-contracts.md §1.1.

This issue validates the end-to-end contract (not just unit tests of the Feign client
stub): actual payload shape, `X-Correlation-Id` propagation, and the resilience split
between grant and access-ending actions.

## Spec de referencia

- integration-contracts.md (§2.1 ACS → HIST direction)
- event-contracts.md (§1.1 audit envelope, §1.2 failure policy)

## Escopo

- [ ] implementar `backend/services/acs-service/src/main/java/com/neuroassist/acs/infrastructure/clients/hist/HistClient.java`
- [ ] validar payload shape do envelope enviado ao HIST contra event-contracts.md §1.1

## Criterios de aceite

- [ ] AC-1 `HistClient.postAudit(AuditEnvelope)` sends `POST /audit` with `Content-Type: application/json` and `X-Correlation-Id` propagated from MDC; verified by WireMock IT
- [ ] AC-2 Audit envelope fields match event-contracts.md §1.1 exactly: `action`, `actorType`, `actorId`, `tenantId`, `subjectType`, `subjectId`, `occurredAt`, `correlationId`, `payloadVersion`, `payload`
- [ ] AC-3 On HIST 503 for `PatientSessionProvisioned` (grant): use case rolls back and returns 502; for `PatientSessionRevoked` (access-ending): state committed, audit enqueued
- [ ] AC-4 `./gradlew :acs-service:integrationTest` exits 0 (WireMock IT covers happy path)

## Dependencias

- ACS-016 (precede)
- ACS-024 (precede)

## Estimativa

M

## Prioridade
P4
