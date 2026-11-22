# EVNT-037 -- Durable audit retry for the safety-runtime facts (HIST ADR-005)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

HIST ADR-005 (accepted, Option B) classifies every EVNT fact except `FeedbackRecorded` as
**commit+durable-retry** (SAFETY — the help-request / alarm / lapse pathway must never be blocked by an
audit outage): `EventGenerated` (W2 ratified), `AlarmConfirmed`, `EscalationAttempted`,
`DetectionLapseRaised`, `DetectionLapseResolved` (`detection-lapse`), `DetectionLapseAcknowledged`.
`FeedbackRecorded` stays hard-502 (after-the-fact annotation). This issue adds the durable-retry path
for the six safety facts; EVNT had no durable queue before (the write path returned `502`). Notably
`EventGenerated` (the gesture-report ingest) now keeps the persisted event and enqueues the audit
instead of returning `502` (api-contract §2.1).

Durable-retry contract (HIST event-contracts §3): commit-first, local durable store (outbox-style
table — messaging disabled, no broker), idempotent replay with an explicit `idempotencyKey` (ADR-003),
bounded with backoff + a backlog alert, dev log-only.

## Spec de referencia

- event-contracts.md (§1.2 failure policy — ADR-005 per-fact table)
- api-contract.md (§2.1 `EventGenerated` commit+durable-retry)
- integration-contracts.md (§4 EVNT → HIST)
- ../services/hist-service/contracts/event-contracts.md (§3 durable retry contract)

## Escopo

- [ ] add a local durable audit outbox table + repository (`src/main/resources/db/migration/` + entity under `com/neuroassist/evnt/infrastructure/`)
- [ ] on HIST failure for `EventGenerated` / `AlarmConfirmed` / `EscalationAttempted` / `DetectionLapseRaised` / `DetectionLapseResolved` / `DetectionLapseAcknowledged`, commit-first then persist the envelope in `src/main/java/com/neuroassist/evnt/infrastructure/feign/HistAuditFeignClient.java` (via `AuditPort`)
- [ ] add a bounded retry scheduler with backoff + backlog alert; send an explicit `idempotencyKey`
- [ ] keep `FeedbackRecorded` hard-502 (rolls back `502 audit-unavailable`)

## Criterios de aceite

- [ ] AC-1 on HIST failure, each of the six safety facts still commits its local change and persists the audit envelope; `EventGenerated` keeps the persisted event (no `502`)
- [ ] AC-2 the scheduler replays envelopes idempotently (explicit `idempotencyKey`); HIST stores at most one record each (INV-HIST-3)
- [ ] AC-3 `FeedbackRecorded` (hard-502) still rolls back and returns `502 audit-unavailable` on HIST failure
- [ ] AC-4 `./gradlew :evnt-service:test` exits 0

## Dependencias

- EVNT-014 (precede — HistAuditFeignClient / AuditPort)

## Estimativa

M

## Prioridade
P9
