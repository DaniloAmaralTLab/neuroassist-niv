# EDGE-026 -- Hardening — idempotency guards (compare-and-set pair, watchdog transition guard, re-revoke/deactivate/unpair, Resilience4j on PAT/ACS/HIST, SPEC-05/SPEC-10)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Harden all three outbound integrations (PAT, ACS, HIST) with Resilience4j circuit breakers
(integration-contracts.md §7: 2s timeout, 2× backoff for PAT, open after 5 consecutive failures)
and add the compare-and-set idempotency guards for the pairing claim (SPEC-05) and
transition-only guards for the watchdog (SPEC-05). Verify that re-revoke/re-deactivate/re-unpair
return the correct success status with no double-audit under concurrent load. `ResilienceConfig`
wires the circuit breaker beans for `PatClient`, `AcsClient`, and `HistClient`.

## Spec de referencia
- SPEC-05 (idempotency — compare-and-set, transition guards)
- integration-contracts.md §7 (resilience — timeouts, retries, circuit breakers)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/resilience/ResilienceConfig.java`
## Criterios de aceite
- [ ] AC-1 PAT circuit breaker opens after 5 consecutive failures; fallback serves last `CachedCatalog` (INV-EDGE-5)
- [ ] AC-2 ACS JWKS circuit breaker falls back to cached keys on outage (never accepts unsigned tokens)
- [ ] AC-3 HIST circuit breaker configured; `502` surfaced on lifecycle write path in prod when open (INT-EDGE-003 resolution applied)
- [ ] AC-4 Two concurrent pair-claims on the same code: exactly one succeeds (compare-and-set verified under load — SPEC-05)
- [ ] AC-5 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-015, EDGE-016, EDGE-017 (Feign adapters), EDGE-007 (compare-and-set claim)

## Estimativa
S

## Prioridade
P9
