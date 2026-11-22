# Architectural Constitution — NeuroAssist NIV

> Invariants derived from the decisions formalized in `arch/decisions/*.arch.json`.
> This document is **generated deterministically** by `/new-project` P2 (D-072) and
> re-emitted by `/be-architect-upgrade` whenever an aspect is bumped. Do not edit by hand.
>
> **Composite version:** rbac:1.0.0 / permission-catalogue:1.0.0 / entity-scope:1.0.0 / multi-tenancy:1.0.0 / error-model:1.0.0 / events:1.0.0 / persistence:1.0.0
>
> Notation: [EARS](https://alistair.cockburn.us/coffee-break-software/ears/) (Easy
> Approach to Requirements Syntax) — 5 patterns: `Ubiquitous`, `Event-driven`
> (WHEN ...), `State-driven` (WHILE ...), `Optional` (WHERE ...),
> `Unwanted` (IF ..., THEN ...).
>
> Cited by: `be-implement`, `be-validator`, `be-architect-specs`,
> `fe-implement`, `fe-validator`.

## How to use this document

- Every rule is **testable** (passes/fails against the code).
- Every rule cites the aspect + version that derived it. When the aspect changes, the
  rule changes — drift-check (D-055) flags the document for regeneration.
- The rules do NOT replace the per-aspect documents (`docs/architecture/shared/...`)
  — those remain the narrative explanation of the "why". This
  constitution is the minimalist "what" that the agent cites in every prompt.

---

## RBAC + permission-catalogue (`rbac + permission-catalogue` v1.0.0 / v1.0.0)

**RBAC.001** — WHEN a controller endpoint is accessed, THE SYSTEM SHALL enforce `@PreAuthorize("hasAuthority('<code>')")` where `<code>` is declared in `permission-catalogue.arch.json`.

**RBAC.002** — WHEN an action ∈ ['CREATE', 'UPDATE', 'DELETE'] occurs on a controller method, THE SYSTEM SHALL emit `@AuditAction("<CRUD>_<RESOURCE>")` on that method.

**RBAC.003** — IF a `@PreAuthorize` references a code not declared in `permission-catalogue.arch.json`, THEN THE SYSTEM SHALL reject the generation with an explicit error (gen_controller hard validation, D-060).

---

## Entity scope (data-scope per entity) (`entity-scope` v1.0.0)

**ES.001** — WHEN a JPA entity is generated for a table declared in `entity-scope.arch.json`, THE SYSTEM SHALL emit `@FilterDef`/`@Filter` matching the declared `filter_name` and `column`.

**ES.002** — WHILE a request is bound to a non-EMPRESA_COMPLETA data-scope type, THE SYSTEM SHALL activate every Hibernate filter declared for that type in `entity-scope.scopes[tipo]`.

---

## Multi-tenancy (context propagation + isolation) (`multi-tenancy` v1.0.0)

**MT.001** — WHEN an `application.service` method is invoked, THE SYSTEM SHALL call `TenantContextHolder.require()` at entry (RULE-07).

**MT.002** — WHEN a Postgres connection is acquired (schema-per-tenant), THE SYSTEM SHALL set `search_path` to `"<tenantId>", <global_schema>, public` per MultiTenantConnectionProvider (D-071).

**MT.003** — WHEN a Postgres connection is released, THE SYSTEM SHALL reset `search_path` to `<global_schema>, public` to prevent leak through pool reuse.

**MT.004** — WHEN a JMS message is published, THE SYSTEM SHALL include the tenant id under the header `tenantId`.

---

## Error model (ProblemDetail RFC 7807) (`error-model` v1.0.0)

**EM.001** — WHEN an HTTP endpoint returns an error, THE SYSTEM SHALL respond with media_type `application/problem+json`.

**EM.002** — WHEN a `CodedException` is thrown, THE SYSTEM SHALL map its `code` to (category, http_status, title) via `ProblemDetailFactory` (D-069).

**EM.003** — WHILE building a `ProblemDetail`, THE SYSTEM SHALL include `code`, `category`, `correlationId`, and `timestamp` under the `error` extension field.

**EM.004** — IF a thrown `code` is not declared in `error-model.arch.json`, THEN THE SYSTEM SHALL fall back to `internal_error.unhandled` HTTP 500 (factory graceful degrade).

---

## Events (JMS contract + delivery) (`events` v1.0.0)

**EV.001** — WHEN an event is published, THE SYSTEM SHALL use a destination name declared in `events.modules[*].events[*].name` (referenced via `EventDestinations` constants, D-070).

**EV.002** — WHEN an event consumer receives a message, THE SYSTEM SHALL check `processed_events` for the eventId before any side effect (idempotency, D-070).

**EV.003** — WHEN an event is emitted from within a transactional path, THE SYSTEM SHALL write to `outbox_event` in the same transaction (outbox pattern).

**EV.004** — WHEN a JMS consumer fails 3 times in a row, THE SYSTEM SHALL route the message to the DLQ matching `neuroassist-niv.dlq.<event-name>`.

---

## Persistence conventions (`persistence` v1.0.0)

**PS.001** — WHEN a JPA entity is generated, THE SYSTEM SHALL use a UUID primary key sourced from `uuid_generate_v7()`.

**PS.002** — WHEN a root-aggregate table is declared, THE SYSTEM SHALL include the 4 audit columns (`criado_em`, `criado_por_usuario_id`, `atualizado_em`, `atualizado_por_usuario_id`).

**PS.003** — IF a foreign key targets a different schema, THEN THE SYSTEM SHALL declare it as `logical_fk` (UUID without REFERENCES) and validate referential integrity in the application service.

**PS.004** — IF a column ends with `_snapshot`, THEN THE SYSTEM SHALL reject mutations to that column once the aggregate reaches `status IN ('CONFIRMADA','FATURADA','CANCELADA')`.

**PS.005** — WHEN a DDL block is authored, THE SYSTEM SHALL annotate the target schema in the first-line comment `-- schema: <schema>`.

---

## Cross-references

- Versioned decisions: [`arch/decisions/`](../../arch/decisions/) (D-061 snapshot)
- Narrative docs: [`shared/rbac/`](shared/rbac/), [`shared/modelo-dados/`](shared/modelo-dados/),
  [`shared/contratos/`](shared/contratos/), [`shared/multi-empresa.md`](shared/multi-empresa.md)
- ArchUnit cross-aspect tests: `src/test/java/.../architecture/CrossAspectArchTest.java` (D-067)
- Drift detection: `/be-architect-drift-check` (D-055/D-056)
