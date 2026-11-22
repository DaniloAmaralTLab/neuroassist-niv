<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Module: **ACS — Caregivers and Access** · Service: `acs-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Intent

ACS is the **identity and access authority** of NeuroAssist NIV. It owns the human
and patient-side identities of the platform, the roles and authorities attached to
them, and the links that bind a caregiver to the patient(s) they are responsible
for. Every other backend module (EVNT, PAT, HIST, DASH, EDGE, CONV, TRN) trusts the
JWT that ACS issues and the tenant scope that ACS resolves; ACS is therefore the
foundation of the multi-tenant model (tenant = care unit: a family or a clinic).

## Problem Statement

NeuroAssist NIV serves patients with neurodegenerative diseases (ALS/MND) who have
lost conventional communication. Access to the platform must be governed precisely
because the data is sensitive health data (LGPD) and the actors are heterogeneous:

- a **caregiver** who logs in to the dashboard to configure commands, review history
  and respond to alarms;
- a **patient** who operates only the communication runtime (CONV) and reports
  gestures (GEST) from their own device, through a session that **never expires** and
  that only a caregiver can end;
- a **platform operator** (service credential) that onboards new tenants without any
  human "super-admin" role existing in the application.

Without a single authority that models these identities distinctly — and isolates
them from one another — the platform would either over-grant authority (a leaked
patient phone exposing caregiver scope) or under-model it (a patient action
indistinguishable from a device action in the audit trail). ACS exists to resolve
exactly this.

## Personas

- **Family Caregiver** (`CAREGIVER`) — primary. Logs in with username/password,
  receives a JWT, manages the patient link, and provisions/revokes the patient's
  session. Pilot: Jamilly Amaral, in a home environment.
- **Clinic Coordinator** (`CLINIC_COORDINATOR`) — secondary (institutional
  expansion). Top role **within** a tenant; manages caregivers of that tenant.
- **Patient with session** (`PatientSession` actor, ADR-012) — operates CONV/GEST
  only; has no login of their own and inherits no caregiver authority. Pilot: Márcio
  Amaral.
- **Platform operator** (`platform-ops`, service client, tenantless) — onboards
  tenants. Not a human application role (ADR-011); whoever controls the deployment
  host is trusted by topology.

## MVP Scope

1. Caregiver registration, authentication (framework-native username/password) and
   JWT issuance, scoped to exactly one tenant.
2. Role/authority model: `CAREGIVER`, `CLINIC_COORDINATOR` within a tenant;
   `platform-ops` as the sole tenant-onboarding authority.
3. Caregiver ↔ patient link management (link / unlink), scoped to the tenant.
4. **Patient-with-session** lifecycle (ADR-012, Option C): a caregiver provisions a
   non-expiring, revocable session bound to a patient; authorities restricted to
   `conv.tree.navigate` / `conv.node.select`.
5. Immediate session/token **revocation** via the reused stateless-JWT blacklist
   (SEC-001), triggered by a caregiver, audited in HIST.
6. Tenant registry (care unit) in the global schema, onboarded via `platform-ops`.

## Out of Scope

- A human `PLATFORM_ADMIN` role or cross-tenant super-user (ADR-011 keeps
  `platform-ops` as a service client only; migrating `caregiver.tenant_id` to
  nullable is explicitly rejected for the MVP).
- External OAuth/SSO identity provider (framework-native auth is sufficient for the
  single-user pilot; revisit on institutional expansion — see local ADR on auth).
- Edge **device** identity issuance (`client_credentials`) — owned by EDGE
  (`edge-service`); ACS only trusts/validates it, it does not mint it.
- Self-service patient credentials (password/PIN/QR of the patient's own) — the
  patient never authenticates themselves; the caregiver provisions the session.
- Dedicated LGPD mechanisms (consent flow, portability, anonymization) — deferred
  while the system runs on an internal network only (OPS-002); the legal obligation
  itself is not waived.

## Architectural Principles

- **Single authority, distinct identities.** Four identity types never overlap:
  caregiver (human), patient-session, platform-ops (service), edge device-token
  (owned by EDGE). ACS models caregiver and patient-session in **isolated tables**.
- **Least authority by construction.** The patient session is born with CONV/GEST
  authority only and inherits nothing from the caregiver; the leak of a patient phone
  never yields management scope.
- **Stateless tokens, explicit revocation.** JWTs are stateless; revocation is
  realised through the existing blacklist, not by shortening TTLs or inventing a new
  mechanism (reuse over invention — SEC-001).
- **Tenant isolation is an invariant, not a filter.** `caregiver.tenant_id` is
  `NOT NULL`; no application path produces a "null tenant" context.
- **Hexagonal.** Domain holds the identity/authority rules with zero framework
  imports; Spring Security, JPA and HIST live only in adapters (see
  `../../adr/ADR-001-hexagonal-architecture.md`).
- **Audit everything that grants or ends access.** Provision, revoke, link, unlink,
  deactivate are all recorded in HIST.

## Success Signals

- A caregiver authenticates and receives a tenant-scoped JWT; every downstream
  resource server accepts it and resolves the correct tenant schema.
- A provisioned patient session operates CONV/GEST indefinitely without
  re-authentication, and a caregiver-triggered revocation invalidates it immediately
  (next request rejected) with a matching HIST audit entry.
- No request ever reaches a resource server with a null or cross-tenant scope.
- Authority strings used in controllers match the `RoleAuthorityPolicy` constants
  one-for-one (no 403 drift between declared and enforced authorities).
