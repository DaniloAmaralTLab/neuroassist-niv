<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

## Stack

- **Language / framework:** Java 21 / Spring Boot (framework standard, ADR-001
  backend-jvm-java inherited from the handoff; hexagonal per
  `../../adr/ADR-001-hexagonal-architecture.md`).
- **Build / deps:** Gradle (Kotlin DSL).
- **Persistence:** PostgreSQL via Spring Data JPA; schema-per-tenant.
- **Migrations:** Flyway, applied **centrally** by `neuroassist-niv-migrations` (MIG)
  across the global and per-tenant schemas.
- **Security:** Spring Security as the authorization server (JWT issuer) and resource
  server; framework-native username/password authentication for the pilot.

## Service Boundary

**Single service** (`acs-service`), one bounded context: identity and access. This
is the default decomposition (see local ADR on service boundary) and it is the
correct unit here — ACS is the platform's authorization server and must not be split,
because caregiver identity, roles, links, patient-session lifecycle and the JWT
issuer/blacklist are one cohesive invariant surface. Within the project's modular-
monolith direction (shared ADR-002, placeholder), ACS is realised as its own
deployable/service with its own package root. The `Patient` aggregate (PAT) and the
edge device identity (EDGE) remain **outside** ACS and are referenced by id.

## Package Organization

Java — package root `com.neuroassist.acs`:

```
src/main/java/com/neuroassist/acs/
+-- api/              REST controllers, DTOs, mappers (auth, caregivers, links,
|                     patient-sessions, tenants-ops); @PreAuthorize = RoleAuthorityPolicy
+-- application/      use-case services (@Transactional): Authenticate,
|                     RegisterCaregiver, DeactivateCaregiver, LinkPatient,
|                     UnlinkPatient, ProvisionSession, RevokeSession, OnboardTenant
+-- domain/           aggregates (Tenant, Caregiver, PatientSession), value objects
|                     (TenantId, Authority), RoleAuthorityPolicy, ports (interfaces):
|                     CaregiverRepository, PatientSessionRepository, TenantRepository,
|                     TokenIssuer, TokenBlacklist, AuditPort
+-- infrastructure/   JPA adapters (global + per-tenant), Spring Security / JWT issuer,
                      blacklist adapter, HIST audit client (Feign/REST), config
```

Dependency rule: `domain` imports nothing from outside; `application` depends on
`domain`; `api` and `infrastructure` depend inward. Spring, JPA and the HIST client
exist only in `infrastructure`/`api`.

## Hub Service Dependencies

This project does **not** integrate the TechLab AI hub (P3 `techlab-ai-sync` is
`skipped`; `ai.hasAi = false`). ACS therefore has **no hub-service dependency**.

Intra-project relationships (all sync REST — messaging disabled):

- **ACS → HIST** — audit every grant/revoke/link/deactivate (sync REST).
- **ACS → MIG** — schema ownership; migrations authored by ACS, applied by MIG.
- **All services → ACS** — every resource server validates ACS-issued JWTs and trusts
  the tenant scope/authorities (ACS is the authorization server). GWY fronts ACS.
- **EDGE device identity** is owned by `edge-service`; ACS validates but does not mint
  it.

## External Integrations

- **None external in the MVP.** ACS uses framework-native authentication; no external
  OAuth/SSO IdP, no third-party identity provider (pilot has a single caregiver —
  see local ADR on auth; revisit on institutional expansion).
- No message broker, no external PII processor. Internal network only (OPS-002); TLS
  mandatory outside localhost (TECH-006).

## Async vs Sync Decisions

- **All synchronous.** `stack.messaging.enabled = false`: authentication, link
  management, session provisioning/revocation and audit writes to HIST are all
  synchronous REST/HTTPS. This fits the low volume (1 patient, 1 caregiver) and keeps
  the authorization server simple and immediately consistent.
- **Revocation is synchronous and immediate** by design (SEC-001): the blacklist entry
  is written in the same transaction boundary as the revoke action; there is no async
  propagation delay tolerated for an access-ending action.
- **Reassessment trigger:** if the audit write-path to HIST becomes a latency or
  coupling concern, or if patient/edge volume grows, introduce a broker (e.g.
  RabbitMQ) for `*Audited` events — this is an explicit future decision, not an
  implicit upgrade.
