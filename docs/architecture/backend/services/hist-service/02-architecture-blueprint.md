<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV

## System Boundary

HIST is a single Spring Boot service inside the modular monolith deployment
(`../../adr/ADR-002-modular-monolith.md`) exposing two cohesive surfaces over sync REST:

- **Write surface** — `POST /audit`: the append-only ingest for all producers.
- **Read surface** — `GET /history/...`: patient-scoped timeline queries for DASH.

HIST owns the immutable store. It does **not** own live delivery (EVNT), cross-patient
aggregation (DASH), or any domain state beyond the audit trail itself. It never calls back
into producers; it is a pure sink + read model.

## External Actors and Systems

| Actor / System | Direction | Interaction |
|---|---|---|
| ACS, PAT, EDGE, EVNT, GEST | Inbound (write) | `POST {hist.baseUrl}/audit` sync REST, TLS outside localhost, service-client auth |
| DASH (and caregiver dashboard via DASH) | Inbound (read) | `GET /history` patient-scoped queries |
| ACS (identity provider) | Dependency | JWT validation via JWKS / introspection for reader auth; service-client identity for writers |
| `neuroassist-niv-migrations` (MIG) | Dependency | Applies HIST's Flyway migrations across `neuroassist_global` + each `t_<tenantId>` |
| PostgreSQL | Dependency | Append-only audit storage |
| API Gateway (GWY) | Edge | Routes external traffic; injects `X-Correlation-Id` when absent |

No message broker (messaging disabled). No TechLab AI (`ai.hasAi = false`).

## End-to-End Flows

**Golden path — audit append (write):**

1. A producer commits a state-changing use case within its request boundary.
2. Before returning success, the producer calls `POST {hist.baseUrl}/audit` with the
   shared envelope (`correlationId` = inbound `X-Correlation-Id`).
3. HIST validates the envelope, normalizes producer divergences (discriminator name,
   `source`, `tenantId` presence, versioning — see doc 03), and resolves the storage
   scope (tenant vs global).
4. HIST appends one immutable record, upserting on the idempotency key (ADR-003) so a
   retry is a no-op returning the existing record.
5. HIST returns `201 Created` (or `200` on idempotent replay).

**Alternative — unknown action / higher payloadVersion:** HIST stores the raw envelope and
flags it rather than rejecting (contract note repeated by all producers — audit must not
lose records).

**Alternative — audit-write failure (producer side):** governed by the project failure
policy (ADR-005): prod hard `502 audit-unavailable` on the write path; dev profile
log-only; with the ACS access-ending carve-out reconciled.

**Golden path — history read:** DASH calls `GET /history?patientId=...&period=...`; HIST
authorizes the caregiver's tenant + patient scope and returns the ordered, human-readable
timeline (events, alarms, confirmations, feedback/edits, escalation attempts incl.
detection lapses).

## Internal Boundaries

Hexagonal under `com.neuroassist.hist` (`../../adr/ADR-001-hexagonal-architecture.md`):

- **api** — REST controllers/DTOs for `/audit` (write) and `/history` (read); envelope
  adapter that reconciles producer shapes; no infrastructure import.
- **application** — use cases `AppendAuditRecord`, `QueryPatientHistory`;
  `TenantContextHolder.require()` first line for tenant-scoped operations; idempotency
  orchestration.
- **domain** — `AuditRecord` aggregate (immutable), value objects (`AuditAction`/
  `AuditEventType`, `ActorRef`, `SubjectRef`, `CorrelationId`, `IdempotencyKey`), the
  `AuditTrailPort` and `HistoryReadPort` interfaces, invariants.
- **infrastructure** — append-only JPA persistence, idempotent upsert, Spring Security
  with `TenantContextFilter` inside the `SecurityFilterChain`, global-schema vs
  per-tenant routing.

Dependency rule: `domain` imports nothing outward; `application` depends on `domain`; the
entry (api) and `infrastructure` depend inward.

## Cross-cutting Concerns

- **Security** — resource-server JWT (ACS JWKS) for reader auth; service-client identity
  for producer writes; `X-Tenant-Id` header never trusted — tenant is derived from the
  authenticated principal / envelope under `TenantContextFilter`
  (Learning: filter ordered after Spring Security, `@Order(LOWEST_PRECEDENCE - 10)`).
- **Observability** — `correlationId` is the spine: every record carries it, enabling
  end-to-end incident reconstruction across producers. HIST is the de-facto audit log of
  the whole platform.
- **Multi-tenancy** — schema-per-tenant (`../../adr/ADR-003-multi-tenancy.md`);
  tenant-scoped facts in `t_<tenantId>`, global-schema facts (GEST) located per ADR-004.
- **Availability (blast radius)** — HIST is a **synchronous dependency of every write
  path**; its availability target bounds the write availability of ACS/PAT/EDGE/EVNT/GEST
  (ADR-005). This is called out explicitly, not assumed away.
- **LGPD/compliance** — immutable health-adjacent audit data; retention vs erasure is
  reconciled in ADR-006 without breaking immutability.
