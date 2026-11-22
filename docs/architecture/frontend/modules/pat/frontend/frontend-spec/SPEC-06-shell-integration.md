# SPEC-06 — Shell Integration — pat (PAT) Frontend

> How PAT plugs into the `neuroassist-niv-web` shell: module descriptor, integration service, and
> bootstrap lifecycle. Sources: `frontend/02-architecture-blueprint.md` §4,
> `frontend/04-frontend-architecture-direction.md` §2, shared ADR-006 (module-entry-as-library).

## 1. `pat.descriptor.ts` — Shell descriptor (fallback + registration)

```ts
export const PAT_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: MODULE_KEY,                         // 'pat'
  menu: MODULE_MENU_METADATA,              // SPEC-05 §1
  loadChildren: () => import('@neuroassist/pat').then(m => m.PatModule),
  routeBase: '/patients',                  // caregiver command-catalog + registry surfaces
  permissions: Object.keys(MODULE_PERMISSION_MAP),
  featureFlags: MODULE_FEATURE_FLAGS,
};
```

The shell registers PAT by importing `@neuroassist/pat` in `config/module-descriptors.ts` and pushing
`PAT_MODULE_DESCRIPTOR` into `MODULE_DESCRIPTORS`. The descriptor is the shell's fallback source for
menu/permission metadata if the lazy chunk has not loaded yet.

## 2. `PatShellIntegrationService` (`libs/pat/integration`, `type:domain`)

Responsibilities:

- **Breadcrumbs:** feed `BreadcrumbItem[]` to the shell `NavigationService`
  (`Care → Patients & Commands → {patient}`; `… → New command | Edit "{label}"`;
  `Care → Patients & Commands → Register patient`). The patient name is resolved by `PatientFacade`.
- **Menu visibility:** contribute the "Patients & Commands" and "Register patient" destinations when
  the permission map grants them; never build the menu ad hoc in a component (`frontend/05` §6).
- **Onboarding hand-off:** when the shell-owned onboarding wizard drives the patient step, expose a
  completion signal so the wizard advances to the first-command step (rendered by
  `feature-command-catalog`); PAT contributes panels, not the wizard chrome (`frontend/06` gap).
- **Audit hand-off:** forward create / calibrate / retire / register UI actions to
  `@neuroassist/shared/observability` so HIST can consume them downstream (PAT does not render
  history — `frontend/02` §2).
- It holds no `HttpClient` and no business state; it observes facade signals.

## 3. `pat.bootstrap.ts` — lifecycle

```ts
export const patBootstrap: ModuleBootstrap = {
  init(ctx) {
    // 1. read active tenant from @neuroassist/shared/tenant-context (PAT never writes it)
    // 2. register PAT breadcrumbs with the shell NavigationService
    // 3. subscribe the integration service to the catalog/editor facade signals
  },
  destroy(ctx) {
    // 1. unregister PAT breadcrumbs / menu entries
    // 2. clear module-local facade signals (command catalog, gesture types, active patient)
    // 3. stop any live getUserMedia track still open in the editor (defence-in-depth, R5)
    // 4. a tenant switch during the session invalidates any future PAT cache (bootstrap-flow)
  },
};
```

`init` never performs login (owned by `@neuroassist/shared/auth-session`) and never writes the active
tenant. `destroy` must leave no dangling subscriptions, clear PAT signals so a later re-entry starts
clean, and ensure no webcam stream survives module teardown.

## 4. `tool-descriptors.ts` fallback

If the shell renders its sidebar before the PAT lazy chunk resolves, it uses the static
`PAT_MODULE_DESCRIPTOR.menu` as the fallback descriptor so the "Patients & Commands" section and its
entries appear without eager-loading the feature libraries.

## Criterios de aceite (EARS)

- WHEN the shell boots, THE SYSTEM SHALL register `PAT_MODULE_DESCRIPTOR` and expose the "Patients & Commands" menu section from the fallback descriptor without eager-loading the catalog or registry feature libraries.
- WHEN PAT `init` runs, THE SYSTEM SHALL register the PAT breadcrumbs with the shell NavigationService and resolve the active patient name.
- WHEN a command create, calibrate, retire, or gesture-type register action completes, THE SYSTEM SHALL forward the action to `@neuroassist/shared/observability` and SHALL NOT call `console.log`.
- WHEN PAT `destroy` runs, THE SYSTEM SHALL unregister its breadcrumbs, clear module-local facade signals, and stop any open webcam stream.
- WHEN the onboarding patient step completes, THE SYSTEM SHALL emit a completion signal so the shell wizard advances to the first-command step.
