# 04 — Frontend Architecture Direction — acs (ACS)

## 1. Stack

- **Angular 21**, **Nx 22.x**, **TypeScript strict**.
- **RxJS 7.8 + Signals** (Signals for state; RxJS only at the HTTP edge).
- **Design system:** Angular **CDK** primitives (no `@angular/material` components) + **Tailwind v4
  CSS-first** (oklch tokens, dark default) via `@neuroassist/shared/ui-tokens`; icons via Material
  Symbols (self-hosted `@font-face`, see `design-system-tokens.md` pitfalls).
- **Tests:** Jest (unit), Playwright (`apps/acs-e2e`).
- **English-only** (ADR-018) — no i18n framework.

## 2. App boundary

`apps/acs/` is a thin host; its `app.routes.ts` does only
`loadChildren: () => import('@neuroassist/acs').then(m => m.AcsModule)`. The real entry is the
library `libs/acs/shell-entry` with importPath **`@neuroassist/acs`** (shared ADR-006). The Shell
`neuroassist-niv-web` registers ACS by importing `@neuroassist/acs` in
`config/module-descriptors.ts` and populating `MODULE_DESCRIPTORS` with `ACS_MODULE_DESCRIPTOR`.

## 3. Library organization (Nx tags)

| Library | `type:` | Purpose |
|---|---|---|
| `libs/acs/shell-entry` | `type:app` | Entry: module + contract + routes + permission-map + feature-flags + bootstrap + nav.config + descriptor. |
| `libs/acs/access` | `type:domain` | `opsHostGuard`, `canManageAccessGuard` (consume `AccessDecisionService`). |
| `libs/acs/data-access` | `type:data-access` | `CaregiverApiService`, `PatientSessionApiService`, `TenantAdminApiService` + signal facades. |
| `libs/acs/feature-caregivers` | `type:feature` | Caregiver list + invite (Screen 05). |
| `libs/acs/feature-patient-sessions` | `type:feature` | Activate / revoke (Screen 07). |
| `libs/acs/feature-tenant-admin` | `type:feature` | Ops-only tenant creation (ADR-011). |
| `libs/acs/integration` | `type:domain` | `AcsShellIntegrationService`. |
| `libs/acs/navigation` | `type:domain` | Breadcrumb / menu state. |
| `libs/acs/ui` (optional) | `type:ui` | ACS-local presentational components. |

Boundary: `scope:acs` → `scope:acs` + `scope:shared` only (`nx-boundaries.md`).

## 4. Hub / shared library dependencies

`@neuroassist/shared/{auth-session, tenant-context, access-decision, access-http-base, contracts,
ui-components, ui-feedback, ui-tokens, observability, error-model}`.
Direction per `nx-boundaries.md`: `data-access` → `contracts` + `access-http-base` +
`tenant-context` + `error-model`; `access` → `access-decision` + `auth-session`;
`ui` → `shared/ui-*`; `feature` → all of the module's own libs + `shared/*`.

## 5. Routing strategy

- Shell → `@neuroassist/acs` via `loadChildren` (`ACS_ROUTES`).
- Sub-routes via `loadComponent` (lazy per feature):
  - `/access/caregivers` → `feature-caregivers`, `canActivate: [authGuard, canManageAccessGuard]`
  - `/access/patient-sessions` → `feature-patient-sessions`, `canActivate: [authGuard, canManageAccessGuard]`
  - `/ops/tenants` → `feature-tenant-admin`, `canActivate: [authGuard, opsHostGuard]`
- Menu/visibility derived by `NavigationService` from `acs.permission-map.ts` — the ops route never
  appears in the caregiver's daily sidebar.

## 6. State strategy

- **Signals-first** in each facade: private `signal<T>()` + public `.asReadonly()`.
- Derived state via `computed()`; side effects isolated in the data-access services.
- **No NgRx, no manual `BehaviorSubject`** as source of truth (shared ADR-002 reserved /
  angular-standalone-signals). RxJS appears only wrapping `HttpClient` calls, immediately converted
  to signals in the facade.

## 7. Tool/module contract strategy (`acs.contract.ts`)

```
MODULE_KEY = 'acs'
ModuleMenuMetadata: { title: 'Access', icon: 'group', order, section: 'admin' }
permissions: ['acs.caregiver.view', 'acs.caregiver.invite', 'acs.caregiver.role.edit',
              'acs.session.provision', 'acs.session.revoke', 'acs.tenant.create']
featureFlags: { tenantAdmin: { defaultState: false },      // enabled only on the admin host
                patientSessions: { defaultState: true } }
```

Permissions are consumed by `AccessDecisionService`; `tenant.create` additionally requires the
`opsHostGuard` (network restriction, ADR-011) on top of the RBAC decision.
