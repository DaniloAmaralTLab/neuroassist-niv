# EDGE-032 -- Infrastructure — `EvntLapseClient` Feign adapter (G6 detection-lapse raise/resolve, service-client token, Idempotency-Key, retry/circuit-breaker)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Implements the infrastructure adapter for the outbound G6 detection-lapse escalation call defined
in `integration-contracts.md §6.2` (ADR-005, SAFETY-GEST-1). The domain port is
`EvntLapseNotificationPort` (EDGE-029); this adapter provides the Feign-based implementation.

**Raise:** `POST {evnt.baseUrl}/evnt/detection-lapses` — service-client JWT carrying the
EVNT-namespace authority (placeholder `evnt.detection-lapse.raise`; exact string confirmed by
INT-EDGE-006), `Idempotency-Key: <evnt_idempotency_key>`, `X-Correlation-Id` propagated, payload
`{ deviceId, patientId, tenantId, cause, detectionState, reason, lastDetectingAt, lapseStartedAt,
engineVersion }`.

**Resolve:** `POST {evnt.baseUrl}/evnt/detection-lapses/{lapseId}/resolution` — same service-client
identity, same correlation-id, body `{ deviceId, tenantId }`.

EDGE must **never** silently discard an unraised lapse (safety-critical): the resilience policy is
Resilience4j retry with exponential backoff (up to 5 attempts) and a circuit breaker (open after 5
consecutive failures); on circuit-open the episode row stays open (`raisedToEvntAt = null`) and the
next sweep iteration retries. The `edge.device` token is never used here; this is the EDGE
backend's service-client identity (integration-contracts §6.2 bullet 3).

## Spec de referencia
- SPEC-10 (integrations — G6, EVNT detection-lapse contract shape)
- integration-contracts.md §6.2 (payload, idempotency key, auth, fallback, EARS)
- integration-contracts.md §7 (EVNT resilience: timeout 2s, retry backoff, circuit breaker after 5 failures)

## Escopo
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/evnt/EvntLapseClient.java` — Feign `@FeignClient(name = "evnt-service", url = "${neuroassist.evnt.base-url}")` com dois métodos: `raise(LapseRaiseRequest, @RequestHeader("Idempotency-Key") String, @RequestHeader("X-Correlation-Id") String): void` e `resolve(UUID lapseId, LapseResolveRequest, @RequestHeader("X-Correlation-Id") String): void`; inclui interceptor Feign para injetar o service-client JWT
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/evnt/dto/LapseRaiseRequest.java` e `LapseResolveRequest.java` — campos conforme `integration-contracts.md §6.2` payload table
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/evnt/EvntLapseNotificationAdapter.java` — implementa `EvntLapseNotificationPort`; chama `EvntLapseClient.raise(...)` e `EvntLapseClient.resolve(...)`; aplica Resilience4j `@CircuitBreaker(name = "evnt-lapse")` + `@Retry(name = "evnt-lapse")`; em caso de falha NÃO lança excepção para o caller (a aplicação já registou `raisedToEvntAt = null`; a próxima passagem do sweep reintenta)
- [ ] configurar `backend/services/edge-service/src/main/resources/application.yml` — adicionar entradas Resilience4j para `evnt-lapse` (timeout 2s, 5 retries com backoff, circuit breaker threshold 5) e `neuroassist.evnt.base-url`
- [ ] criar WireMock stubs para EVNT nas suítes de integração de EDGE-033 (raise → `201`, resolve → `200`, outage → connection refused)

## Criterios de aceite
- [ ] AC-1 `raise()` sends `Idempotency-Key` header with the episode's `evntIdempotencyKey` on every attempt (integration-contracts §6.2 idempotency)
- [ ] AC-2 On EVNT `5xx` or connection failure, the adapter retries up to 5 times with backoff and does NOT throw to the caller (never silently discard the episode — safety-critical: the episode row stays open)
- [ ] AC-3 The adapter never uses the `edge.device` token; it always injects the ACS service-client JWT (integration-contracts §6.2 bullet 3; INV-EDGE-2)
- [ ] AC-4 After 5 consecutive failures the circuit breaker opens; subsequent calls skip the HTTP attempt and return without throwing (the sweep will retry on the next iteration)
- [ ] AC-5 `./gradlew :edge-service:test` exits 0 (WireMock-based unit test for raise/resolve/outage flows)

## Dependencias
- EDGE-016 (AcsClient — service-client token cache; EDGE-032 borrows the same token for EVNT calls)
- EDGE-029 (EvntLapseNotificationPort interface — precede)
- EDGE-026 (Resilience4j baseline — circuit-breaker config extends existing; may run parallel)
- INT-EDGE-006 (EVNT confirms the actual endpoint paths + authority string; placeholder used until resolved)
- INT-EDGE-007 (ACS confirms the authority embedded in the service-client token for EVNT calls)

## Estimativa
M

## Prioridade
P4
