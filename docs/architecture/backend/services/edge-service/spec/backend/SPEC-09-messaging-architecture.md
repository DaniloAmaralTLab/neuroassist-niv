# SPEC-09 — Messaging architecture

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).

## Objetivo

Record EDGE's messaging posture: **messaging is disabled** (`stack.messaging.enabled = false`). There
is no broker, no producer, no consumer. EDGE's "events" are audited domain actions over sync REST to
HIST (SPEC-09 is the deliberate no-broker record; the contract is `../../contracts/event-contracts.md`).

## Escopo

- **In:** the rationale for no broker; the sync-REST substitute (HIST audit); the watchdog as an
  in-process scheduled job (not a consumer); the ADR-006 future-broker signal.
- **Out:** the audit envelope and idempotency (event-contracts / SPEC-05).

## Decisões técnicas

- **No broker** at pilot scale (A3). All inter-service coupling is synchronous REST; domain actions
  are audited to HIST within the request boundary (mirrors ACS/PAT).
- **The heartbeat watchdog is an in-process `@Scheduled` job**, not a message consumer — it scans
  `paired` devices and flips connectivity (SPEC-02). No external scheduler.
- **The detection-lapse sweep (ADR-005) is a second in-process `@Scheduled` job**, not a consumer.
  Its escalation to EVNT (`DetectionLapseStarted` → EVNT raise, G6) is **synchronous REST** with a
  service-client token, not a broker message; it is idempotent per episode and retried from the
  sweep (never dropped). No broker is introduced.
- **Edge→cloud sync is pull/push over REST**, not an outbox. ADR-006 flags an async broker
  (RabbitMQ) only as a *future signal* if a local retry queue saturates — out of MVP scope.

## Implementação

- If a broker is later adopted (explicit future decision), the audited action names in
  `event-contracts.md` §1.2 become the message names **without renaming**, and this SPEC becomes the
  topic/queue topology.

## Casos de borda

- HIST unreachable on a write → HIST ADR-005 (event-contracts §1): hard-502 facts return
  `502 audit-unavailable` (prod); `DeviceDeactivated`/`DeviceUnpaired`/`DeviceRevoked`/
  `DetectionLapseStarted`/`DetectionLapseResolved` commit + enqueue idempotent durable retry; dev log-only.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL NOT publish or consume any broker message (messaging disabled).
- THE SYSTEM SHALL audit every state-changing domain action to HIST over synchronous REST within the request boundary (event-contracts §1).
- THE SYSTEM SHALL run the heartbeat watchdog as an in-process scheduled job, not a message consumer (SPEC-02).
- THE SYSTEM SHALL run the detection-lapse sweep as an in-process scheduled job and raise/resolve lapses to EVNT over synchronous REST (service-client), never a broker message (ADR-005, G6).
