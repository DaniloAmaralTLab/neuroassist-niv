# INT-HIST-004 -- Producer commit+durable-retry implementation (16 facts) — each producer implements local durable outbox (commit-first, enqueue on HIST failure, bounded retry with backoff, explicit idempotencyKey in envelope); closes 5 upstream TODO[architect] (ACS 4, PAT 1, EDGE 5, EVNT 6); dev profile log-only

> **Scope note (orchestrator, 2026-11-20):** this INT item is COORDINATION + ACCEPTANCE only. The producer-side
> implementation is already tracked per producer — do NOT implement it from here: ACS-026 (extends ACS-016/ACS-024:
> PatientUnlinked + CaregiverAuthenticated), PAT-026 (PatientDeactivated), EDGE-035 (DeviceDeactivated/Unpaired/Revoked,
> DetectionLapseStarted/Resolved), EVNT-037 (EventGenerated, AlarmConfirmed, EscalationAttempted, DetectionLapseRaised/
> Resolved/Acknowledged). GEST has no commit+durable-retry facts. Close this item when those four are done and HIST
> accepts replays idempotently (HIST-010).

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

ADR-005 defines two failure-policy classes (event-contracts.md §3):
- **20 hard-502 facts**: producer rolls back its own transaction when HIST returns non-2xx.
  These facts are non-safety (catalog/lifecycle); a business operation must not complete without
  them recorded.
- **16 commit+durable-retry facts** (W1 safety): producer **commits its own transaction first**,
  then enqueues a durable retry if HIST call fails. These are the safety-runtime and
  access-ending facts (CaregiverAuthenticated, EventGenerated, AlarmConfirmed, FeedbackRecorded,
  EscalationAttempted, PatientLinked/Unlinked, PatientSessionRevoked, DeviceEnrolled, DevicePaired,
  DeviceDeactivated, DeviceRevoked, DetectionLapseStarted/Resolved, DetectionLapseRaised/Resolved/Acknowledged).

Each producer that owns at least one W1 fact must implement a **local durable outbox** pattern:
1. Write domain event + outbox row in the same DB transaction.
2. Attempt HIST call inline; on success, delete outbox row.
3. On failure, leave outbox row; a background retry job replays with exponential backoff + jitter,
   bounded retry count.
4. Each outbox row carries an explicit `idempotencyKey` (producer-generated UUID) so HIST
   deduplicates retries (ADR-003 Option C, HIST-010).

The `TODO[architect]` markers in upstream event-contracts.md are closed by this issue's
completion. Dev profile: log-only (do not call HIST; log the payload at WARN).

Producers and their W1 fact counts: ACS (4), PAT (1: PatientLinked), EDGE (5), EVNT (6).
GEST has no W1 facts — all 4 GEST facts are hard-502 by classification.

## Spec de referencia

- integration-contracts.md (HIST failure-policy contract, producer obligations)
- event-contracts.md §3 (failure-policy classification table)
- ADR-005 (Option B + W1 split)
- ADR-003 (idempotencyKey on outbox retry)

## Escopo

- [ ] ACS: durable outbox for 4 W1 facts (CaregiverAuthenticated, PatientLinked, PatientUnlinked, PatientSessionRevoked)
- [ ] PAT: durable outbox for 1 W1 fact (PatientLinked — in PAT context)
- [ ] EDGE: durable outbox for 5 W1 facts (DeviceEnrolled, DevicePaired, DeviceDeactivated, DeviceRevoked, DetectionLapseStarted/Resolved)
- [ ] EVNT: durable outbox for 6 W1 facts (EventGenerated, AlarmConfirmed, FeedbackRecorded, EscalationAttempted, DetectionLapseRaised/Resolved/Acknowledged)

## Criterios de aceite

- [ ] AC-1 Each W1 producer: when HIST returns `502`, producer commits its domain transaction; audit outbox row is persisted with `idempotencyKey` (UUID)
- [ ] AC-2 Retry job picks up the outbox row; replays `POST /hist/audit` with the same `idempotencyKey`; HIST returns `200` (replay detected) or `201` (first success); row deleted
- [ ] AC-3 After N max-retries without success, row enters `DEAD_LETTER` state; alert/metric emitted (`hist.outbox.dead_letter{source, action}`)
- [ ] AC-4 Dev profile: log-only mode (no HTTP call to HIST); integration test with `@ActiveProfiles("dev")` confirms no outbound call and log line present
- [ ] AC-5 All 5 upstream `TODO[architect]` markers in upstream event-contracts.md are removed/resolved
- [ ] AC-6 HIST `GET /hist/audit?correlationId=X` returns the eventually-consistent record after one retry cycle

## Dependencias

- INT-HIST-003 (base-URL config must be correct before retry sends to right endpoint)
- HIST-010 (idempotency in HIST must be live for retry deduplication to work)

## Estimativa

XL

## Prioridade
P5
