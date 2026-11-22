# CONV-015 -- HistClient Feign client + AuditPort adapter — hard-502 for TreePublished/Superseded, durable-retry dispatcher for TreeVersionWithdrawn/AudioAssetsErased (ADR-006, SPEC-10)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Creates `HistClient` (Feign client targeting `hist-service`) and `AuditPortAdapter`
(implements `AuditPort`). CONV's audit policy is split into two failure classes (ADR-006,
event-contracts.md §2): `TreePublished`/`TreeVersionSuperseded` → **hard-502** (the publish
transaction rolls back if HIST is unreachable; `auditHard()` throws and the caller returns
`502 audit-unavailable`); `TreeVersionWithdrawn`/`AudioAssetsErased` → **commit + durable-retry**
(the state change is committed first, then `auditWithRetry()` enqueues the fact in a local
durable queue retried idempotently until HIST accepts it). Base URL: `neuroassist.hist.base-url`
(includes `/hist`, hub-integration.md §3). The durable queue can be an in-process
`LinkedBlockingQueue` with persistence for MVP; the idempotency key ensures HIST receives at
most one fact per event (event-contracts.md §5).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/clients/hist/HistClient.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/clients/hist/AuditPortAdapter.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/clients/hist/DurableAuditRetryDispatcher.java`
- [ ] registrar `neuroassist.hist.base-url` em `application.yml` como stub vazio para desenvolvimento local
- [ ] adicionar `DurableAuditRetryDispatcher` com scheduler `@Scheduled(fixedDelay=5000)` que re-tenta facts pendentes

## Criterios de aceite
- [ ] AC-1 When `HistClient.postAudit()` throws on a hard-502 fact, `AuditPortAdapter.auditHard()` re-throws and the calling `@Transactional` service rolls back (WireMock IT: HIST returns 503)
- [ ] AC-2 When HIST is unreachable on a durable-retry fact, `auditWithRetry()` enqueues the fact and returns without throwing; `DurableAuditRetryDispatcher` retries and succeeds when HIST recovers (WireMock IT)
- [ ] AC-3 The idempotency key is re-sent unchanged on each retry so HIST replays with `200 OK` and no duplicate (event-contracts §5)
- [ ] AC-4 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-005 (precede — AuditPort interface)
- CONV-016 (precede — service-client token for outbound Feign calls)

## Estimativa
S

## Prioridade
P4
