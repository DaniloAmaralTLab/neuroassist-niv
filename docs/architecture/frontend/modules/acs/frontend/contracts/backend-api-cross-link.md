# Backend API Cross-link — acs (ACS) Frontend ↔ `acs-service`

> Source of truth for all BE shapes and authorities:
> `../../../../backend/services/acs-service/contracts/api-contract.md`.
> The FE references the BE contract; it never redefines it. This file records the FE↔BE mapping and
> the reconciliation gaps the FE specs carry.

## 1. Endpoint ↔ FE consumer map

| BE endpoint | Verb | Authority | FE Service.method | FE surface |
|---|---|---|---|---|
| `/acs/caregivers` | POST | `acs.caregiver.create` | `CaregiverApiService.register` | Screen 05 register form |
| `/acs/caregivers/{id}` | DELETE | `acs.caregiver.deactivate` | `CaregiverApiService.deactivate` | caregiver row |
| `/acs/caregivers/me` | GET | authenticated | `CaregiverApiService.me` | caregiver list seed |
| `/acs/caregivers/{id}/links` | POST | `acs.patient-link.link` | `CaregiverApiService.link` | links cell |
| `/acs/caregivers/{id}/links/{patientId}` | DELETE | `acs.patient-link.unlink` | `CaregiverApiService.unlink` | links cell |
| `/acs/caregivers/{id}/links` | GET | authenticated | `CaregiverApiService.links` | links cell |
| `/acs/patient-sessions` | POST | `acs.patient-session.provision` | `PatientSessionApiService.provision` | Screen 07 provision |
| `/acs/patient-sessions/{id}` | DELETE | `acs.patient-session.revoke` | `PatientSessionApiService.revoke` | Screen 07 revoke |
| `/acs/patient-sessions/{id}` | GET | authenticated | `PatientSessionApiService.get` | Screen 07 row |
| `/acs/ops/tenants` | POST | `acs.tenant.onboard` | `TenantAdminApiService.onboard` | Ops wizard |
| `/acs/auth/login` | POST | public | (owned by `@neuroassist/shared/auth-session`) | — |
| `/acs/.well-known/jwks.json` | GET | public | (resource servers; not an ACS FE concern) | — |
| `/acs/auth/introspect` | POST | service-client | (service-to-service; not an ACS FE concern) | — |

## 2. Reconciliation gaps (FE specs carry these; BE contract is canonical)

| # | Gap | FE handling |
|---|---|---|
| G1 | Vision authority names (`acs.caregiver.invite`, `acs.session.revoke`, `acs.tenant.create`) differ from BE (`acs.caregiver.create`, `acs.patient-session.revoke`, `acs.tenant.onboard`). | FE uses the **BE authority strings** everywhere (INV-7). |
| G2 | Vision Screen 05 is an **email invite**; BE exposes **register** (`username`+`password`+`role`), with no invite endpoint. | FE implements register; email-invite UX stays an aspiration pending a BE invite endpoint. |
| G3 | No `GET /acs/caregivers` list-all endpoint (only `me` + `links`). | Roster cannot be fully populated; `caregiver-list` flag defaults off; page seeds from `me`/links with a degraded banner until the endpoint lands. |
| G4 | No role-PATCH endpoint; vision `roleChanged` / `acs.caregiver.role.edit` has no BE backing. | Role-edit UI event and permission are out of the MVP contract until BE adds it. |
| G5 | Ops-host detection mechanism was unspecified. | Resolved in SPEC-05 §4 as a served-from-host origin allowlist (`ACS_OPS_HOST`). |
| G6 | No dedicated `last_caregiver_block` BE slug. | FE blocks client-side (SPEC-03 invariant); BE surfaces as `forbidden`/`validation-error`. |

## 3. Error contract

BE `ProblemDetail` `type` slugs are mapped 1:1 in `SPEC-07-error-handling.md` §2. The FE maps by
`type` slug (not HTTP status), preserves `detail` + `correlationId`, and never shows a raw body.

## 4. Invariants referenced (declared once in BE; cited here, not redefined)

INV-1 (tenant set from caller), INV-2/INV-3 (patient-session JWT scoped to `conv.*`/`gest.*`, no
`acs.*`), INV-4 (revoke terminal + blacklist), INV-5 (only platform-ops onboards), INV-6 (login→tenant
deterministic; global username), INV-7 (FE decision keys equal BE authority constants), SEC-001
(revocation reliably immediate, revoke always visible).
