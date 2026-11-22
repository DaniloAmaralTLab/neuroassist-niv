# SPEC-10 — Integrations

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical: `../../contracts/integration-contracts.md`, `../../contracts/hub-integration.md`.

## Objetivo

Specify ACS's integration boundaries: no external systems, synchronous intra-project
relationships, and the referenced-by-id boundaries with PAT and EDGE.

## Escopo

- **In:** ACS → HIST (audit), resource-servers → ACS (token validation), ACS → MIG (schema
  ownership), references to PAT/EDGE by id, resilience strategy.
- **Out:** TechLab AI hub (not integrated — `ai.hasAi = false`), external IdP, broker.

## Decisões técnicas

- No TechLab AI hub — hub-integration.md; P3 `techlab-ai-sync` skipped.
- Framework-native auth, internal-network only (OPS-002), TLS outside localhost (TECH-006)
  — doc 04 §External Integrations.
- HIST failure policy split by action class — event-contracts §1.2 (resolved by HIST ADR-005; commit+durable-retry = `CaregiverDeactivated`, `CaregiverAuthenticated`, `PatientUnlinked`, `PatientSessionRevoked`; all others hard-502). Base URL includes `/hist`; service-client JWT carries `hist.audit.record` (INT-ACS-006).

## Implementação

- `HistAuditClient` (Feign, Eureka service id `hist-service`), 2s timeout, circuit breaker
  (integration-contracts §3).
- JWKS (`/acs/.well-known/jwks.json`) + introspect (`/acs/auth/introspect`) are the inbound
  validation surface for every resource server.
- `patient_id` (PAT) and `device_id` (EDGE) stored as plain references — no cross-service
  FK.

## Casos de borda

- HIST circuit open → hard-502 actions fail fast (`502`); commit+durable-retry actions stay available (ADR-005).
- Resource servers cache JWKS; a key rotation requires them to refresh.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL NOT integrate any external IdP, broker or TechLab AI hub in the MVP.
- WHEN ACS commits a state-changing use case, THE SYSTEM SHALL call HIST `/audit` synchronously with a 2-second timeout.
- IF the HIST circuit breaker is open, THEN THE SYSTEM SHALL fail hard-502 actions with `502` while continuing to serve commit+durable-retry actions (ADR-005, SEC-001).
- THE SYSTEM SHALL serve JWKS and introspection so every resource server can validate ACS-issued tokens.
- THE SYSTEM SHALL reference PAT `Patient` and EDGE device identities by id only, with no cross-service foreign key.
