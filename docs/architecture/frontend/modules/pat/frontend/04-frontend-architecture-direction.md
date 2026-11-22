# 04 — Frontend Architecture Direction — pat (PAT)

## 1. Stack

- **Angular 21**, **Nx 22.x**, **TypeScript strict**.
- **RxJS 7.8 + Signals** (Signals for state; RxJS only at the HTTP edge).
- **Design system:** Angular **CDK** primitives (no `@angular/material` components) + **Tailwind v4
  CSS-first** (oklch tokens, dark default) via `@neuroassist/shared/ui-tokens`; icons via Material
  Symbols (self-hosted `@font-face`, see `design-system-tokens.md`).
- **Tests:** Jest (unit), Playwright (`apps/pat-e2e`).
- **English-only** (ADR-018) — no i18n framework.

## 2. App boundary

`apps/pat/` is a thin host; its `app.routes.ts` does only
`loadChildren: () => import('@neuroassist/pat').then(m => m.PatModule)`. The real entry is the
module-as-library `libs/pat` with importPath **`@neuroassist/pat`** (shared ADR-006). The Shell
`neuroassist-niv-web` registers PAT by importing `@neuroassist/pat` in
`config/module-descriptors.ts` and populating `MODULE_DESCRIPTORS` with `PAT_MODULE_DESCRIPTOR`.

## 3. Library organization (Nx tags)

| Library | `type:` | Purpose |
|---|---|---|
| `libs/pat` (entry) | `type:app` | Entry: module + contract + routes + permission-map + feature-flags + bootstrap + nav.config + descriptor + `providePat`. |
| `libs/pat/access` | `type:domain` | `canManageCatalogGuard` (consumes `AccessDecisionService`). |
| `libs/pat/data-access` | `type:data-access` | `PATIENT_PORT`, `COMMAND_PORT`, `GESTURE_TYPE_PORT` + Http/Mock adapters + signal facades + `<X>Wire` mappers. |
| `libs/pat/feature-command-catalog` | `type:feature` | List + editor + per-command calibration + inline gesture-type registration + live test (promoted Calibration screen). |
| `libs/pat/feature-patient-registry` | `type:feature` | Patient registration (onboarding patient step). |
| `libs/pat/integration` | `type:domain` | `PatShellIntegrationService`. |
| `libs/pat/navigation` | `type:domain` | Breadcrumb / menu state. |
| `libs/pat/ui` (optional) | `type:ui` | PAT-local presentational components. |

Boundary: `scope:pat` → `scope:pat` + `scope:shared` only (`nx-boundaries.md`).

## 4. Hub / shared library dependencies

`@neuroassist/shared/{auth-session, tenant-context, access-decision, access-http-base, contracts,
ui-components, ui-feedback, ui-tokens, observability, error-model}`.
Direction per `nx-boundaries.md`: `data-access` → `contracts` + `access-http-base` +
`error-model`; `access` → `access-decision` + `auth-session`; `ui` → `shared/ui-*`;
`feature` → all of the module's own libs + `shared/*`.

## 5. Routing strategy

- Shell → `@neuroassist/pat` via `loadChildren` (`PAT_ROUTES`).
- Sub-routes via `loadComponent` (lazy per feature):
  - `/patients/:patientId/commands` → `feature-command-catalog`,
    `canActivate: [authGuard, canManageCatalogGuard]`
  - `/patients/register` → `feature-patient-registry`,
    `canActivate: [authGuard, canManageCatalogGuard]` (reused as the onboarding patient step)
- Menu/visibility derived by `NavigationService` from `pat.permission-map.ts`.

## 6. State strategy

- **Signals-first** in each facade: private `signal<T>()` + public `.asReadonly()`.
- Derived state via `computed()` (e.g. `totalEmergency`, `gestureDescription`); side effects isolated
  in the data-access adapters.
- **No NgRx, no manual `BehaviorSubject`** as source of truth. RxJS appears only wrapping
  `HttpClient` calls, immediately converted to signals in the facade.
- The command editor holds its draft in a feature-local `signal<CommandEditorVM['form']>`; nothing is
  persisted until save (prototype parity: "changes only take effect once saved").

## 7. Tool/module contract strategy (`pat.contract.ts`)

```
MODULE_KEY = 'pat'
ModuleMenuMetadata: { title: 'Patients & Commands', icon: 'tune', order, section: 'care' }
permissions: ['pat.patient.view', 'pat.patient.create',
              'pat.command.view', 'pat.command.create', 'pat.command.edit', 'pat.command.remove',
              'pat.gesture-type.view', 'pat.gesture-type.create']
featureFlags: { liveGestureTest: { defaultState: true },      // webcam live-test affordance
                compoundGestures: { defaultState: true } }     // optional second primitive
```

Permissions are consumed by `AccessDecisionService`. Authorities mirror the ACS
`acs.<resource>.<action>` scheme as `pat.<resource>.<action>`; patient-session tokens never carry a
`pat.*` authority (ACS INV-3), so a patient device can never reach a PAT endpoint.

## 8. Ports & adapters (`providePat`)

```
providePat({ adapter: 'http' | 'mock' })   // DEFAULT 'http' — pat-service exists
  PATIENT_PORT       → PatientHttpAdapter      | PatientMockAdapter
  COMMAND_PORT       → CommandHttpAdapter      | CommandMockAdapter
  GESTURE_TYPE_PORT  → GestureTypeHttpAdapter  | GestureTypeMockAdapter
```

HTTP adapters base at `${ACCESS_HTTP_BASE}/pat`, type the response as `<X>Wire` mirroring the Java
record, and `.pipe(map(toX))` into the domain/VM shape. The `MockAdapter` serves fixtures in the same
wire shape through the same mappers. A providers spec must prove the default resolves to the HTTP
adapter (carry-forward `scaffold:mock-adapter-default`, 7 prior occurrences).
