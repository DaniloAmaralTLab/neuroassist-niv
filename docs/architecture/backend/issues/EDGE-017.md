# EDGE-017 -- Infrastructure — HistClient Feign adapter (audit sink POST /audit, 502 failure path in prod)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Create `HistClient` Feign adapter for the audit sink (integration-contracts.md §3):
`POST {hist.baseUrl}/audit` with the standard envelope from `event-contracts.md §1.1` and
`X-Correlation-Id` echoed. Auth: service-client token held by EDGE. The **failure policy** is
hard `502` on the lifecycle write path in production; dev profile degrades to log-only (the
TODO[architect] in `event-contracts.md §1.1` is tracked as INT-EDGE-003). The `HistAuditAdapter`
implements the domain port used by all use cases (EDGE-006..EDGE-010).

## Spec de referencia
- event-contracts.md §1 (audit envelope, action catalog, failure policy)
- integration-contracts.md §3 (HIST outbound contract, 2s timeout)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/hist/HistClient.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/hist/HistAuditAdapter.java`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/infrastructure/hist/HistClientWireMockTest.java`
## Criterios de aceite
- [ ] AC-1 `HistAuditAdapter.record()` sends the full envelope (action, actorType, actorId, tenantId, subjectType, subjectId, occurredAt, correlationId, payloadVersion, payload) to `POST {hist.baseUrl}/audit`
- [ ] AC-2 `X-Correlation-Id` is echoed on every audit call
- [ ] AC-3 On HIST failure in prod profile, the lifecycle use case throws `502 Bad Gateway`; in dev profile, failure is logged only
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (WireMock stubs for audit success + failure)

## Dependencias
- EDGE-006..010 (use cases that call the audit port), INT-EDGE-003 (failure policy decision)

## Estimativa
S

## Prioridade
P4
