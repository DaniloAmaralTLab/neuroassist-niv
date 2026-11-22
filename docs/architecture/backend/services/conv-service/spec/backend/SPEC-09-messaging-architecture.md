# SPEC-09 — Messaging Architecture

> EARS guide: `../../../../standards/ears-notation.md`.

## Objective
State CONV's messaging posture: **there is no broker**.

## Scope
- **In:** the no-broker decision and its consequences; how domain events are realized instead.
- **Out:** any Kafka/Artemis/outbox pattern (messaging disabled project-wide).

## Technical decisions
- `stack.messaging.enabled = false` (doc 04). Intra-project relationships are synchronous REST + id
  references. Domain events are realized as HIST audit facts, client-side realizations, or
  `usage_signal` rows (`event-contracts.md`).

## Implementation
- No producer, no consumer, no topic/queue, no outbox table.
- `TreePublished`/`TreeVersionSuperseded`/`TreeVersionWithdrawn`/`AudioAssetsErased` → `POST /hist/audit`.
- `PhraseSpoken` → client-side; opt-in `usage_signal` only.

## Edge cases
- A future need for async fan-out would be introduced behind a port, not bolted onto CONV now
  (YAGNI; messaging stays disabled).

## Acceptance criteria (EARS)
- THE SYSTEM SHALL NOT publish to or consume from any broker.
- THE SYSTEM SHALL realize every domain event as a HIST audit fact, a client-side action, or an opt-in usage signal (`event-contracts.md`), never a broker message.
- THE SYSTEM SHALL keep the patient's live speaking path free of any messaging or synchronous server call (INV-CONV-5).
