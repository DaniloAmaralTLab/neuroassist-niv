# SPEC-09 — Messaging architecture

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

State PAT's messaging posture: there is **no broker** this phase, and specify how domain
actions are delivered instead (audited to HIST over sync REST), so the design is broker-ready
without carrying broker code now.

## Escopo

- **In:** the messaging-disabled posture, the audited-action delivery mechanism, the forward
  path to a broker.
- **Out:** broker selection, topic design, consumer groups (future decision, doc 04).

## Decisões técnicas

- `stack.messaging.enabled = false` → PAT publishes no broker messages and consumes none.
- Domain actions (`PatientRegistered`, `CommandCalibrated` anchor, `CommandRetired`,
  `GestureTypeRegistered`, patient lifecycle) are **audited to HIST over synchronous REST**
  within the same request boundary (event-contracts §1; mirrors ACS).
- Action names are chosen to become broker event names **unchanged** when a broker is later
  introduced — an explicit future decision, not this phase.

## Implementação

- `HistAuditPort` (domain) + HTTP adapter (infrastructure); `POST {hist.baseUrl}/audit`.
- No `@KafkaListener` / broker config, no `consumed_events`.
- Catalog propagation is **pull** (ADR-004), not push; a future broker could publish
  `CommandCalibrated` to invalidate edge caches without changing ownership (ADR-004 consequence).

## Casos de borda

- HIST unreachable → hard-502 facts: write path `502 audit-unavailable` in prod; `PatientDeactivated`:
  commit + enqueue idempotent durable retry (event-contracts §1, HIST ADR-005), log-only in dev.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL publish no broker message and consume none while `stack.messaging.enabled = false`.
- WHEN a state-changing use case commits, THE SYSTEM SHALL deliver the corresponding audited action to HIST over synchronous REST within the same request.
- THE SYSTEM SHALL keep audited-action names identical to the future broker event names (no rename on broker adoption).
