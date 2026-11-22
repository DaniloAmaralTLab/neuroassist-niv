# SPEC-06 — Security + Audit-Write Failure Policy

> ADR-005 (accepted) failure policy; shared ADR-003-multi-tenancy; ADR-002 immutability.
> Contracts: `../../contracts/api-contract.md` §0, `../../contracts/event-contracts.md` §3,
> `../../contracts/integration-contracts.md` §2.

## Objective

Define authentication/authorization, tenant derivation, and the project-wide audit-write failure policy
(ADR-005) that HIST publishes as authoritative.

## Scope

- **In** — resource-server JWT (ACS JWKS), service-client auth, authorities, tenant filter, failure
  policy classification + durable-retry contract, HIST availability SLO.
- **Out** — producer internal implementation of durable retry (producer specs).

## Decisions

- **AuthN** — OAuth2 resource server, JWT via ACS JWKS. Producers use a **service-client JWT, one
  principal per producer service**; `source` derived from it when the envelope omits it.
- **AuthZ** — authorities `hist.audit.record`, `hist.history.read`, `hist.audit.read`,
  `hist.erasure.create` (D-639 English `.read`/`.record`/`.create`).
- **Tenant** — derived from the authenticated principal / envelope under `TenantContextFilter`
  (`@Order(Ordered.LOWEST_PRECEDENCE - 10)` so it runs **after** Spring Security JWT processing —
  Learning `security:tenant-filter:wrong-order`). `X-Tenant-Id` header is never trusted.
- **Link scoping (reads)** — caregiver→patient link enforced with the **same rule as EVNT
  `PatientEventService`** (tenant from JWT + caregiver linked to patient).

## Failure policy (ADR-005, authoritative — `event-contracts.md` §3)

- **hard-502 (20 facts)** — producer rolls back the use case + returns `502 audit-unavailable` on HIST
  failure (prod); integrity-first grant/creation/config.
- **commit+durable-retry (16 facts)** — producer commits local change + enqueues durable idempotent audit
  retry; access-ending + safety-runtime (and `EventGenerated`, warning W2).
- **Dev** — log-only for every fact.
- **Durable-retry contract** — commit-first, local durable enqueue (no broker), idempotent replay
  (explicit `idempotencyKey` recommended), bounded with backlog alert, ordering not required
  (`event-contracts.md` §3).
- **SLO** — HIST availability ≥ 99.9% (HA, fast restart) because the hard-502 set gates most writes
  (doc 06 R1).

## Acceptance criteria (EARS)

- WHEN a token is missing/invalid, THE SYSTEM SHALL respond `401`; WHEN authority is missing, `403`.
- THE SYSTEM SHALL derive tenant from the principal/envelope, never from `X-Tenant-Id`.
- WHILE handling a tenant-scoped operation, THE SYSTEM SHALL call `TenantContextHolder.require()` as the
  first line.
- IF PostgreSQL is unavailable, THEN THE SYSTEM SHALL fail the ingest so the producer's ADR-005 policy
  applies (HIST never acknowledges an unpersisted write).
- THE SYSTEM SHALL publish the failure-policy classification of `event-contracts.md` §3 as the single
  project-wide policy (closes the 5 upstream `TODO[architect]`).
