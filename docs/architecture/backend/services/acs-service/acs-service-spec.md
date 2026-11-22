---
service: acs-service
module: ACS
moduleName: Caregivers and Access
project: neuroassist-niv
stack: java
framework: spring-boot
packageRoot: com.neuroassist.acs
httpPort: 8081
multiTenancy: schema-per-tenant
messaging: disabled
hub: none
anchorEvent: PatientSessionProvisioned
status: specs
generatedBy: /be-architect-specs
---

# ACS — Service Spec (entry point)

**Module:** ACS — Caregivers and Access · **Service:** `acs-service` · **Stack:** Java 21 /
Spring Boot (hexagonal). ACS is the platform's **authorization server**: caregiver identity
and roles, caregiver↔patient links, the patient-with-session actor lifecycle, and the JWT
issuer + revocation blacklist. Foundation of the multi-tenant model (tenant = care unit).

## Document map

| Area | File |
|---|---|
| Brief | `_brief.md` |
| Vision | `01-architectural-vision.md` … `06-risks-gaps-assumptions.md` |
| ADRs (local) | `adr/ADR-001-service-boundary-single-service.md`, `adr/ADR-002-identity-and-authority-model.md`, `adr/ADR-003-session-revocation-jwt-blacklist.md` |
| Shared hexagonal ADR | `../../adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`) |
| Contracts | `contracts/api-contract.md`, `contracts/data-model.md`, `contracts/event-contracts.md`, `contracts/hub-integration.md`, `contracts/integration-contracts.md` |
| Events | `events/event-catalog.md` |
| Specs | `spec/backend/SPEC-01..10.md` |
| BDD | `tests/cucumber/*.feature`, `spec/backend/SPEC-08-bdd-test-scenarios.md` |
| Diagrams | `diagrams/c4-context.puml`, `diagrams/c4-container.puml`, `diagrams/c4-component.puml` |
| Local setup | `setup-local.md` |

## Invariants (declared once — cited as INV-n across specs)

| Id | Invariant |
|---|---|
| INV-1 | Every `Caregiver` belongs to exactly one tenant (`tenant_id NOT NULL`; no null-tenant path). |
| INV-2 | A `PatientSession` binds exactly one patient and was `provisionedBy` a caregiver of the **same** tenant. |
| INV-3 | A patient session carries only `conv.*`/`gest.*` authorities and inherits no caregiver/management authority. |
| INV-4 | A `revoked` session cannot be reactivated; revocation is immediate (blacklisted). |
| INV-5 | Tenants are created only via `platform-ops`; no human role onboards a tenant. |
| INV-6 | Caregiver login is unique and resolves a login → tenant deterministically. |
| INV-7 | Controller `@PreAuthorize` authorities are exactly the `RoleAuthorityPolicy` constants. |

## SPEC index

| SPEC | Theme |
|---|---|
| SPEC-01 | API surface |
| SPEC-02 | Patient session orchestration (core, anchor action) |
| SPEC-03 | Caregiver registration and patient links |
| SPEC-04 | Data model + migrations |
| SPEC-05 | Idempotency + concurrency |
| SPEC-06 | Security (identity, authority, JWT) |
| SPEC-07 | Observability + health |
| SPEC-08 | BDD test scenarios |
| SPEC-09 | Messaging architecture (synchronous) |
| SPEC-10 | Integrations |

## Next

`/be-architect-backlog neuroassist-niv ACS` — decompose these specs into atomic issues and
`plan-ACS.md`.
