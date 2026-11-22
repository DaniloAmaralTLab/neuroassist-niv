<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Identity and authority model

## Status
aceita

## Contexto
NeuroAssist NIV has heterogeneous actors that must never be conflated: a caregiver
(human login), a patient who operates only the communication runtime, a platform
operator that onboards tenants, and the edge device that reports gestures. Project
decision ADR-012 (handoff, accepted) chose **Option C** — the patient-with-session is
a first-class actor of its own, distinct from the caregiver and from the device.
Project decision ADR-011 (accepted) keeps tenant onboarding on the `platform-ops`
service client with no human `PLATFORM_ADMIN`. ACS must realise these decisions in a
concrete identity/authority model, and a known generator pitfall (authority strings
diverging between controller and policy, D-535) must be designed out from the start.

## Decisão
ACS models **four identity types**, with ACS owning two of them in isolated tables:
1. **Caregiver** (human, login, tenant-scoped JWT) — roles `CAREGIVER` /
   `CLINIC_COORDINATOR`.
2. **Patient-with-session** (ADR-012 Option C) — provisioned by a caregiver, its own
   table isolated from `caregiver`, authorities restricted to `conv.*` / `gest.*`,
   inheriting nothing from the caregiver.
3. **platform-ops** (service client, tenantless, ADR-011) — sole tenant-onboarding
   authority; no human `PLATFORM_ADMIN`.
4. **Edge device token** — owned by EDGE; ACS validates but does not mint it.

Authorities follow the canonical convention `acs.<resource>.<action>` sourced from a
single `RoleAuthorityPolicy`; controllers' `@PreAuthorize` strings MUST be those exact
constants. `caregiver.tenant_id` is `NOT NULL`; no application path yields a
null-tenant context.

## Consequências
- Positive: least authority by construction — a leaked patient device cannot reach
  management scope; the audit trail distinguishes patient, caregiver, device and
  platform actions.
- Positive: single source of authority strings removes the 403-drift pitfall between
  controller and policy.
- Positive: aligns ACS with the accepted project decisions (ADR-011, ADR-012) and the
  existing production service.
- Negative / trade-off: a fourth identity type (patient-session) adds an issuance/
  revocation path and audit surface to maintain. Accepted because patient-with-session
  is a first-class product actor, not an edge case (ADR-012 rationale). Mitigation:
  keep its tables isolated so the model can be reversed by removal, not by unwinding
  `caregiver`.
