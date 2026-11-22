# SPEC-01 — Route Map — pat (PAT) Frontend

> Module **PAT — Patients and Command Catalog** · Entry lib `@neuroassist/pat`
> (`libs/pat`, shared ADR-006) · Shell `neuroassist-niv-web`.
> Sources: `frontend/04-frontend-architecture-direction.md` §5, `frontend/02-architecture-blueprint.md` §4,
> `frontend/05-state-and-data-flow.md` §6. BE authorities are canonical in
> `../../../../../backend/services/pat-service/contracts/api-contract.md` §5.

PAT exposes one caregiver navigation surface inside the shell: the per-patient **command catalog**
(the promoted Calibration screen) plus the **patient registry** form (the onboarding patient step).
The Shell lazy-loads `@neuroassist/pat` via `loadChildren`; every sub-route is lazy via
`loadComponent`. The command **editor** (new / edit) is an in-page panel of the catalog page, not a
route — the draft is feature-local signal state and nothing persists until save (prototype parity,
`frontend/04` §6). PAT screens target the caregiver's desktop/laptop browser (`frontend/06` §3).

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/patients` | `PatRootComponent` (resolve active patient → redirect) | `libs/pat` (entry) | `authGuard` | "Patients & Commands" | [Care, Patients & Commands] |
| `/patients/register` | `PatientRegistrationPageComponent` | `libs/pat/feature-patient-registry` | `authGuard`, `canManageCatalogGuard` | "Register patient" | [Care, Patients & Commands, Register patient] |
| `/patients/:patientId/commands` | `CommandCatalogPageComponent` | `libs/pat/feature-command-catalog` | `authGuard`, `canManageCatalogGuard` | "Command catalog — {patient}" | [Care, Patients & Commands, {patient}] |

- `authGuard` is the shared session guard (`@neuroassist/shared/auth-session`). On an absent/expired
  session it redirects to the shell login route and never renders any PAT surface — carry-forward of
  the Learning signal `guard:unauth-redirect:session-absent-must-go-to-login`.
- `canManageCatalogGuard` (`libs/pat/access`) consumes `AccessDecisionService.can(...)` — it **never**
  hardcodes `return true` (carry-forward `guard:stub-permissive:hardcoded-return-true`, ev=6). It
  allows the catalog and registry surfaces when the session holds any PAT management authority
  (`pat.command.read`, `pat.command.create`, or `pat.patient.create`). A `patient-session` token
  carries only `conv.*` / `gest.*` authorities (ACS INV-3) and therefore never satisfies the guard —
  a patient device can never reach a PAT surface (INV-PAT-7).
- `PatRootComponent` resolves the active patient: with the single pilot patient it redirects to
  `/patients/:patientId/commands`; when no patient exists yet it redirects to `/patients/register`.
  A multi-patient picker is out of the MVP (see `contracts/backend-api-cross-link.md`, gap G3).

## 2. Lazy-loading topology

```
Shell neuroassist-niv-web (scope:web)
  config/module-descriptors.ts  → import('@neuroassist/pat')  [loadChildren → PAT_ROUTES]
    /patients                      → PatRootComponent (resolve → redirect)
    /patients/register             → loadComponent feature-patient-registry/PatientRegistrationPageComponent
    /patients/:patientId/commands  → loadComponent feature-command-catalog/CommandCatalogPageComponent
                                        └─ CommandEditor panel (in-page; new|edit; not a route)
```

## 3. Route → authority mapping (BE-canonical, INV-PAT-8)

| Route | UI action gated | BE authority (`RoleAuthorityPolicy`, api-contract §5) |
|---|---|---|
| `/patients/register` | register patient | `pat.patient.create` |
| `/patients/:patientId/commands` | read catalog | `pat.command.read` |
| `/patients/:patientId/commands` → New/Save | create command | `pat.command.create` |
| `/patients/:patientId/commands` → Edit/Save | calibrate command | `pat.command.calibrate` |
| `/patients/:patientId/commands` → Remove | retire command | `pat.command.retire` |
| `/patients/:patientId/commands` → + register type | register gesture-type | `pat.gesture-type.create` |

> Reconciliation note (gap G1, see `contracts/backend-api-cross-link.md`): the FE vision used the
> working names `pat.patient.view` / `pat.command.view` / `pat.command.edit` / `pat.command.remove` /
> `pat.gesture-type.view` / `pat.gesture-type.create`. The BE contract is the source of truth, so this
> and all downstream specs use the **BE authority strings** (`pat.patient.read`, `pat.command.read`,
> `pat.command.calibrate`, `pat.command.retire`, `pat.gesture-type.read`, `pat.gesture-type.create`).
> INV-PAT-8 requires the FE decision keys to equal the BE authority constants.

## Criterios de aceite (EARS)

- WHEN a caregiver navigates to `/patients` with a resolvable active patient, THE SYSTEM SHALL redirect to that patient's `/patients/:patientId/commands`.
- WHEN a caregiver navigates to `/patients` and no patient exists, THE SYSTEM SHALL redirect to `/patients/register`.
- IF the session is absent or expired on any PAT route, THEN THE SYSTEM SHALL redirect to the login route and SHALL NOT render any PAT catalog or registry surface.
- IF `canManageCatalogGuard` denies access to `/patients/:patientId/commands` or `/patients/register`, THEN THE SYSTEM SHALL redirect to the shell forbidden route and SHALL NOT load the feature component.
- IF a patient-session token reaches any PAT route, THEN THE SYSTEM SHALL deny the route because the token carries no `pat.*` authority (INV-PAT-7).
- THE SYSTEM SHALL load every PAT feature route lazily via `loadComponent` and SHALL NOT eager-bundle the catalog or registry library into the shell.
