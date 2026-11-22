# SPEC-09 — Messaging Architecture

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
State, explicitly, that GEST uses **no message broker**, and how its "events" are handled instead.

## Escopo
- **In:** the sync-only posture; audit facts to HIST; absence of outbox/broker.
- **Out:** any topic/queue design (there is none); the detection→event path (EVNT, not GEST).

## Decisões técnicas
- `stack.messaging.enabled = false` project-wide (vision 04). GEST has **no** broker, **no** outbox,
  **no** published or consumed messages.
- Domain facts (`EngineVersionRegistered`, `EngineCapabilityDeclared` anchor, `EngineCapabilityRetired`,
  `EngineVersionDeprecated`) are **synchronous HIST audit records** (event-contracts §1).

## Implementação
- Each successful write posts the shared audit envelope to HIST within the request transaction
  (fail-closed for mutations — all four GEST facts are hard-502 under HIST ADR-005, hub-integration §3).
  No async dispatch, no durable retry (no access-ending or safety facts).

## Casos de borda
- HIST unavailable on a write → the write is rolled back (`503`); nothing is "queued for later".
- Consumers needing change notification **pull** (support-check/list with `ETag`); GEST never pushes.

## Critérios de aceite (EARS)
- THE SYSTEM SHALL NOT connect to any message broker.
- WHEN a GEST write succeeds, THE SYSTEM SHALL record the audit fact to HIST synchronously, not via a
  broker or outbox.
- THE SYSTEM SHALL support consumer pull with conditional `GET` (`ETag`/`304`) instead of push.
