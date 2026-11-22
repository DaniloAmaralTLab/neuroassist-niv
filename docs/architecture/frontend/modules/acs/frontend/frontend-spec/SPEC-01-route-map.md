# SPEC-01 — Route Map — acs (ACS) Frontend

> Module **ACS — Caregivers and Access** · Entry lib `@neuroassist/acs`
> (`libs/acs/shell-entry`, ADR-006) · Shell `neuroassist-niv-web`.
> Sources: `frontend/04-frontend-architecture-direction.md` §5, `frontend/02-architecture-blueprint.md` §4,
> `frontend/05-state-and-data-flow.md` §6. BE authorities are canonical in
> `../../../../backend/services/acs-service/contracts/api-contract.md` §7.

ACS exposes two navigation surfaces inside the caregiver shell plus one host-restricted ops
surface. The Shell lazy-loads `@neuroassist/acs` via `loadChildren`; every sub-route is lazy via
`loadComponent`. The ops route is **never** present in the caregiver's daily sidebar — it is
emitted only when `opsHostGuard` resolves `onAdminHost = true`.

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/access` | `AcsRootComponent` (redirect → `caregivers`) | `libs/acs/shell-entry` | `authGuard` | "Access" | [Access] |
| `/access/caregivers` | `CaregiverListPageComponent` | `libs/acs/feature-caregivers` | `authGuard`, `canManageAccessGuard` | "Caregivers" | [Access, Caregivers] |
| `/access/caregivers/new` | `RegisterCaregiverPageComponent` | `libs/acs/feature-caregivers` | `authGuard`, `canManageAccessGuard` | "Register caregiver" | [Access, Caregivers, New] |
| `/access/patient-sessions` | `PatientSessionsPageComponent` | `libs/acs/feature-patient-sessions` | `authGuard`, `canManageAccessGuard` | "Patient sessions" | [Access, Patient sessions] |
| `/access/patient-sessions/:patientId` | `PatientSessionsPageComponent` | `libs/acs/feature-patient-sessions` | `authGuard`, `canManageAccessGuard` | "Patient sessions — {patient}" | [Access, Patient sessions, {patient}] |
| `/ops/tenants` | `TenantAdminPageComponent` | `libs/acs/feature-tenant-admin` | `authGuard`, `opsHostGuard` | "Tenants (ops)" | [Ops, Tenants] |

- `authGuard` is the shared session guard (`@neuroassist/shared/auth-session`). On an absent/expired
  session it redirects to the shell login route (never renders the ACS surface) — carry-forward of
  the Learning signal `guard:unauth-redirect:session-absent-must-go-to-login`.
- `canManageAccessGuard` (`libs/acs/access`) consumes `AccessDecisionService.can(...)` — it **never**
  hardcodes `return true` (carry-forward of `guard:stub-permissive:hardcoded-return-true`). It
  allows the caregiver surfaces when the session holds any of the ACS management authorities
  (`acs.caregiver.create`, `acs.patient-link.link`, `acs.patient-session.provision`, or the
  read-equivalent authenticated access).
- `opsHostGuard` (`libs/acs/access`) gates `/ops/tenants` on the admin host/network (ADR-011,
  Option 1 — network restriction, not a human role). Off-host it blocks the route **and** the
  ops breadcrumb/menu entry (SPEC-06). The host-detection mechanism is specified in SPEC-05 §4.

## 2. Lazy-loading topology

```
Shell neuroassist-niv-web (scope:web)
  config/module-descriptors.ts  → import('@neuroassist/acs')  [loadChildren → ACS_ROUTES]
    /access            → loadComponent AcsRootComponent (redirect → caregivers)
    /access/caregivers → loadComponent feature-caregivers/CaregiverListPageComponent
    /access/caregivers/new → loadComponent feature-caregivers/RegisterCaregiverPageComponent
    /access/patient-sessions[/:patientId] → loadComponent feature-patient-sessions/PatientSessionsPageComponent
    /ops/tenants       → loadComponent feature-tenant-admin/TenantAdminPageComponent  [opsHostGuard]
```

## 3. Route → authority mapping (BE-canonical, INV-7)

| Route | UI action gated | BE authority (`RoleAuthorityPolicy`) |
|---|---|---|
| `/access/caregivers` | view list / links | authenticated caregiver (read) |
| `/access/caregivers/new` | register caregiver | `acs.caregiver.create` |
| `/access/patient-sessions` | provision | `acs.patient-session.provision` |
| `/access/patient-sessions` | revoke | `acs.patient-session.revoke` |
| `/ops/tenants` | onboard tenant | `acs.tenant.onboard` + `opsHostGuard` |

> Reconciliation note (gap G1, see `contracts/backend-api-cross-link.md`): the FE vision used the
> working names `acs.caregiver.invite` / `acs.session.revoke` / `acs.tenant.create`. The BE contract
> is the source of truth, so this and all downstream specs use the **BE authority strings**
> (`acs.caregiver.create`, `acs.patient-session.revoke`, `acs.tenant.onboard`). INV-7 requires the
> FE decision keys to equal the BE authority constants.

## Criterios de aceite (EARS)

- WHEN a caregiver navigates to `/access`, THE SYSTEM SHALL redirect to `/access/caregivers`.
- IF the session is absent or expired on any ACS route, THEN THE SYSTEM SHALL redirect to the login route and SHALL NOT render any ACS surface.
- IF `canManageAccessGuard` denies access to `/access/caregivers` or `/access/patient-sessions`, THEN THE SYSTEM SHALL redirect to the shell forbidden route and SHALL NOT load the feature component.
- WHILE the browser is not on the admin host, THE SYSTEM SHALL block navigation to `/ops/tenants` and SHALL omit the Ops breadcrumb and menu entry.
- WHEN `opsHostGuard` resolves `onAdminHost = true`, THE SYSTEM SHALL allow navigation to `/ops/tenants` and expose the Ops menu entry.
- THE SYSTEM SHALL load every ACS feature route lazily via `loadComponent` and SHALL NOT eager-bundle any feature library into the shell.
