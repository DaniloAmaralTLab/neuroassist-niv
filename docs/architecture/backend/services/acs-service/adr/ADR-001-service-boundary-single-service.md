<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — ACS service boundary: single service

## Status
aceita

## Contexto
ACS is the platform's authorization server: it owns caregiver identity and
credentials, roles/authorities, caregiver↔patient links, the patient-with-session
actor and its lifecycle, and the JWT issuer plus the revocation blacklist. These
concerns share a single invariant surface (tenant isolation, least-authority, token
lifecycle). The project direction is a modular monolith (shared ADR-002, placeholder),
and the live `neuroassist-ai` monorepo already exposes `acs-service` as one service.
The question is whether ACS should be decomposed further (e.g. a separate session
service or a separate token service).

## Decisão
We keep ACS as a **single service** (`acs-service`), one bounded context. We do not
split identity, authority, linking, patient-session lifecycle or token issuance into
separate services, because they must enforce the same invariants transactionally and
splitting them would scatter the authorization surface and multiply tenant-scope
checks. The `Patient` aggregate (PAT) and the edge **device** identity (EDGE) stay
outside ACS and are referenced by id.

## Consequências
- Positive: one cohesive authorization surface; invariants (tenant NOT NULL,
  least-authority patient session, immediate revocation) enforced in one transactional
  boundary; matches the existing `acs-service` in production.
- Positive: simplest unit to reason about for a single-caregiver pilot.
- Negative / trade-off: ACS concentrates several responsibilities; if one later needs
  independent scaling (unlikely at pilot volume), a split would be required. Accepted —
  decomposition is a reversible, per-service decision and can be revisited without
  touching other modules.
