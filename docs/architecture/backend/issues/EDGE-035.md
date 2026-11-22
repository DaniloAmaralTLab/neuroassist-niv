# EDGE-035 -- Durable audit retry for access-ending + detection-lapse facts (HIST ADR-005)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

HIST ADR-005 (accepted, Option B) classifies five EDGE facts as **commit+durable-retry** —
`DeviceDeactivated`, `DeviceUnpaired`, `DeviceRevoked` (ACCESS-END — device can no longer run /
unpair / revoke) and `DetectionLapseStarted`, `DetectionLapseResolved` (`edge-device`) (SAFETY —
detection down must never be blocked by an audit outage). The remaining EDGE facts stay hard-502,
including the `system` heartbeat observations `DeviceWentOffline` / `DeviceCameOnline` (N1: the next
heartbeat cycle re-derives the state, so hard-502 is harmless). This issue adds the durable-retry path
for the five facts; EDGE had no durable queue before.

Durable-retry contract (HIST event-contracts §3): commit-first, local durable store (outbox-style
table — messaging disabled, no broker), idempotent replay with an explicit `idempotencyKey` (ADR-003),
bounded with backoff + a backlog alert, dev log-only.

## Spec de referencia

- event-contracts.md (§1.2 failure policy — ADR-005 per-fact table)
- integration-contracts.md (§3 EDGE → HIST, §7 resilience)
- ../services/hist-service/contracts/event-contracts.md (§3 durable retry contract)

## Escopo

- [ ] add a local durable audit outbox table + repository (`backend/services/edge-service/src/main/resources/db/migration/` + entity under `com/neuroassist/edge/infrastructure/hist/`)
- [ ] on HIST failure for `DeviceDeactivated` / `DeviceUnpaired` / `DeviceRevoked` / `DetectionLapseStarted` / `DetectionLapseResolved`, commit-first then persist the envelope in `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/hist/HistAuditAdapter.java`
- [ ] add a bounded retry scheduler with backoff + backlog alert; send an explicit `idempotencyKey`
- [ ] keep all other EDGE facts hard-502 (incl. `DeviceWentOffline` / `DeviceCameOnline`, N1)

## Criterios de aceite

- [ ] AC-1 on HIST failure, each of the five facts still commits its local change and persists the audit envelope to the durable store
- [ ] AC-2 the scheduler replays envelopes idempotently (explicit `idempotencyKey`); HIST stores at most one record each (INV-HIST-3)
- [ ] AC-3 `DeviceWentOffline` (hard-502) still returns `502 audit-unavailable` on HIST failure (no enqueue)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0

## Dependencias

- EDGE-017 (precede — HistClient Feign adapter)

## Estimativa

M

## Prioridade
P9
