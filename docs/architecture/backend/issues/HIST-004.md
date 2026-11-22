# HIST-004 -- AppendAuditRecord use case — INV-HIST-2..5 validation, scope routing (tenant vs global ADR-004), unknown-action flagging (INV-HIST-4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Core domain use case. Receives a canonical `AppendAuditRecordCommand` from the
`EnvelopeReconciliationAdapter`, validates mandatory fields (INV-HIST-2: `source`, `action`,
`actorType`, `occurredAt`, `correlationId` NOT NULL), decides the storage scope (ADR-004), and
delegates to `AuditTrailPort` / `AuditTrailGlobalPort`. Unknown `action` or `payloadVersion`
beyond the known maximum triggers `flagged = true` (INV-HIST-4) — the record is stored and
`201` is returned; never `422`. Raises in-process `AuditRecordAppended` domain milestone (no
broker publish — messaging disabled).

## Spec de referencia

- SPEC-02 (audit append orchestration)
- data-model.md §2.1/§2.2 (scope routing rules)
- event-contracts.md §1 (canonical envelope, INV-HIST-* invariants)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/usecase/AppendAuditRecord.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/model/AuditRecord.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/port/out/AuditTrailPort.java`
- [ ] unit tests: `backend/services/hist-service/src/test/java/com/neuroassist/hist/application/usecase/AppendAuditRecordTest.java`

## Criterios de aceite

- [ ] AC-1 Valid command with new idempotency key → `AuditTrailPort.append` called once; use case returns `{replay: false}`
- [ ] AC-2 `tenantId` present → scope = tenant; `tenantId` absent + GEST source → scope = global; `tenantId` absent + non-GEST source → `400 tenant-required`
- [ ] AC-3 Unknown `action` or `payloadVersion > knownMax` → record stored with `flagged = true`; use case returns `{flagged: true}`; no `422` ever thrown
- [ ] AC-4 Missing `subjectType`, `occurredAt`, or `correlationId` → `AppendAuditRecord` throws validation exception → controller returns `400`
- [ ] AC-5 Domain layer imports no Spring/JPA annotations (ArchUnit RULE-01/RULE-02)
- [ ] AC-6 `./gradlew :hist-service:test` exits 0

## Dependencias

- HIST-001 (precede)
- HIST-003 (precede — command produced by reconciliation adapter)

## Estimativa

M

## Prioridade
P2
