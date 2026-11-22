# SPEC-03 — Caregiver registration and patient links (sub-feature)

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Specify caregiver lifecycle (register / deactivate) and the caregiver↔patient
authorization edge (link / unlink) — the identity data on which authority checks depend.

## Escopo

- **In:** `RegisterCaregiver`, `DeactivateCaregiver`, `LinkPatient`, `UnlinkPatient`;
  global `caregiver_identity_lookup` maintenance; tenant-scoped uniqueness.
- **Out:** authentication (SPEC-06), patient aggregate (PAT).

## Decisões técnicas

- Login → tenant resolution via global `caregiver_identity_lookup` (data-model §2.2),
  reconciling the credential-placement TODO (doc 05) by keeping only routing keys global.
- Soft deactivation (row retained) — data-lifecycle (doc 05).

## Implementação

- `RegisterCaregiver`: insert into per-tenant `caregiver` (status `active`) + global
  `caregiver_identity_lookup` (username, tenant_id, caregiver_id) atomically; role from
  `{caregiver, clinic_coordinator}`.
- `DeactivateCaregiver`: set `status = deactivated`; keep row and lookup entry (login gate
  checks status).
- `LinkPatient`/`UnlinkPatient`: insert/delete `caregiver_patient_link`; unique
  `(caregiver_id, patient_id)`.

## Casos de borda

- Global username collision → `409 username-taken` (INV-6).
- Deactivating/acting cross-tenant → `404` (no cross-tenant disclosure).
- Duplicate link → `409 link-exists`; unlink of missing link → `404`.

## Critérios de aceite (EARS)

- WHEN a caller with `acs.caregiver.create` registers a caregiver, THE SYSTEM SHALL create it in the caller's tenant with `status = active` and a matching global identity-lookup entry (INV-1, INV-6).
- IF the username already exists globally, THEN THE SYSTEM SHALL respond `409 username-taken`.
- WHEN a caller with `acs.caregiver.deactivate` deactivates a caregiver of their tenant, THE SYSTEM SHALL set `status = deactivated` and retain the row.
- WHEN a caller with `acs.patient-link.link` links a same-tenant patient, THE SYSTEM SHALL create the edge; IF it already exists, THEN THE SYSTEM SHALL respond `409`.
- IF the target of a caregiver/link operation belongs to another tenant, THEN THE SYSTEM SHALL respond `404`.
