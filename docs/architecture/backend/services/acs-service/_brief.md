# ACS — Structured Brief (source for Specs / Backlog / Scaffold)

> Module: **ACS — Caregivers and Access** · Service: `acs-service` · Project: NeuroAssist NIV
> Stack: `java` (Java 21 / Spring Boot, hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled

1. **Canonical name / prefix:** `acs-service` (canonical `acs`) / prefix `ACS`.

2. **Problem it solves:** NeuroAssist NIV needs one authority that governs who may
   access the platform and on whose behalf. ACS owns caregiver identity, roles and
   authorities, caregiver↔patient links, and the patient-with-session actor, and it
   is the JWT issuer every other module trusts — the foundation of the multi-tenant
   model (tenant = care unit).

3. **Personas:** primary = **Family Caregiver** (`CAREGIVER`, logs in, manages links,
   provisions/revokes patient sessions); secondary = **Clinic Coordinator**
   (`CLINIC_COORDINATOR`, top role within a tenant), **Patient-with-session** (no
   login, CONV/GEST only), **platform-ops** (tenantless service client, onboards
   tenants).

4. **MVP scope (minimum viable):** caregiver registration + framework-native
   authentication + tenant-scoped JWT issuance; role/authority model; caregiver↔patient
   link management; patient-session lifecycle (provision / revoke, non-expiring,
   least-authority — ADR-012 Option C); immediate revocation via reused JWT blacklist
   (SEC-001); tenant registry onboarded via `platform-ops`.

5. **Out of MVP scope:** human `PLATFORM_ADMIN` / cross-tenant super-user (ADR-011);
   external OAuth/SSO IdP; edge **device** identity issuance (owned by EDGE);
   self-service patient credentials; dedicated LGPD mechanisms (deferred under
   internal-network-only, OPS-002).

6. **Mandatory external integrations:** none external in the MVP (framework-native
   auth, no third-party IdP, no broker). Internal-network only (OPS-002); TLS outside
   localhost (TECH-006).

7. **TechLab AI services depended on:** none (`ai.hasAi = false`; P3 hub sync
   skipped). Messaging disabled, so no event dependency on other modules; intra-project
   relationships are sync REST — ACS → HIST (audit), ACS → MIG (migrations), and all
   resource servers → ACS (JWT validation). ACS references PAT (`Patient`) and EDGE
   (device id) by id.

8. **Anchor domain event:** **PatientSessionProvisioned** (a caregiver granting a
   patient the ability to communicate), with its terminal counterpart
   **PatientSessionRevoked**.

## Source ADRs (handoff `_inbox/adr/`) material to this module

- ADR-012 — patient identity model, persistent session (Option C, accepted).
- ADR-011 — tenant-onboarding authority (keep `platform-ops`, no `PLATFORM_ADMIN`).
- ADR-003 — multi-tenancy schema-per-tenant · ADR-004 — hexagonal · ADR-001 — Java/Spring.
- Constraint SEC-001 (revocation mechanism) · SEC-002 / REG-001 (LGPD) · OPS-002
  (internal network) · TECH-006 (TLS).

## Known generator pitfalls applied proactively (Learning Layer)

- Authority-string drift (D-535 / ACS test-token): controller `@PreAuthorize` strings
  must equal `RoleAuthorityPolicy` constants; canonical `acs.<resource>.<action>`
  verbs fixed in doc 03 (`create`, `deactivate`, `authenticate`, `link`, `unlink`,
  `provision`, `revoke`, `onboard`), all state-changing verbs on POST/DELETE.
