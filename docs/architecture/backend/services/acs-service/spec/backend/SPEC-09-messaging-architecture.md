# SPEC-09 — Messaging architecture

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Record that ACS is **fully synchronous** (messaging disabled) and define how its domain
events are realised as audited actions, plus the explicit trigger for a future broker.

## Escopo

- **In:** sync REST topology (ACS → HIST, resource servers → ACS), audited-action model,
  future-broker reassessment trigger.
- **Out:** any broker configuration (none exists; `stack.messaging.enabled = false`).

## Decisões técnicas

- All synchronous — doc 04 §Async vs Sync. Revocation is synchronous and immediate by
  design (SEC-001); no async propagation delay is tolerated for an access-ending action.
- Domain events are **audited domain actions** delivered to HIST over REST
  (event-contracts §1), not messages.

## Implementação

- No `@KafkaListener`/`@RabbitListener`, no broker dependency on the classpath.
- `AuditPort` (domain) → `HistAuditClient` (Feign) is the only "event" egress.
- The action names in event-contracts §1.2 are broker-ready names for a future migration.

## Casos de borda

- HIST outage on commit+durable-retry actions → local commit + enqueue-for-retry (event-contracts
  §1.2, HIST ADR-005; the set is `CaregiverDeactivated`, `CaregiverAuthenticated`, `PatientUnlinked`,
  `PatientSessionRevoked`); this is an in-process durable queue, not a broker.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL process authentication, linking, session provisioning/revocation and audit writes synchronously.
- THE SYSTEM SHALL NOT depend on any message broker while `stack.messaging.enabled = false`.
- WHEN a commit+durable-retry action's audit write fails, THE SYSTEM SHALL still commit the access change and enqueue the audit in-process for idempotent retry (HIST ADR-005).
- WHERE audit-path latency or coupling later becomes a concern, THE SYSTEM SHALL introduce a broker only as an explicit future decision, not an implicit upgrade.
