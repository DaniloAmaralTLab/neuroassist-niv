# SPEC-06 — Shell Integration — acs (ACS) Frontend

> How ACS plugs into the `neuroassist-niv-web` shell: module descriptor, integration service, and
> bootstrap lifecycle. Sources: `frontend/02-architecture-blueprint.md` §4,
> `frontend/04-frontend-architecture-direction.md` §2, shared ADR-006 (module-entry-as-library).

## 1. `acs.descriptor.ts` — Shell descriptor (fallback + registration)

```ts
export const ACS_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: MODULE_KEY,                         // 'acs'
  menu: MODULE_MENU_METADATA,              // SPEC-05 §1
  loadChildren: () => import('@neuroassist/acs').then(m => m.AcsModule),
  routeBase: '/access',                    // caregiver surfaces; /ops/tenants is host-gated
  permissions: Object.keys(MODULE_PERMISSION_MAP),
  featureFlags: MODULE_FEATURE_FLAGS,
};
```

The shell registers ACS by importing `@neuroassist/acs` in `config/module-descriptors.ts` and
pushing `ACS_MODULE_DESCRIPTOR` into `MODULE_DESCRIPTORS`. The descriptor is the shell's fallback
source for menu/permission metadata if the lazy chunk has not loaded yet.

## 2. `AcsShellIntegrationService` (`libs/acs/integration`, `type:domain`)

Responsibilities:

- **Breadcrumbs:** feed `BreadcrumbItem[]` to the shell `NavigationService`
  (`Access → Caregivers`; `Access → Patient sessions → {patient}`; `Ops → Tenants`, host-only).
- **Menu visibility:** emit the `Tenants (ops)` entry only while `opsHostGuard` resolves
  `onAdminHost = true`; otherwise contribute only the two caregiver destinations.
- **Audit hand-off:** forward provision/revoke/register UI actions to
  `@neuroassist/shared/observability` so HIST can consume them downstream (ACS does not render
  history — `frontend/02` §2).
- It holds no `HttpClient` and no business state; it observes facade signals and the ops-host flag.

## 3. `acs.bootstrap.ts` — lifecycle

```ts
export const acsBootstrap: ModuleBootstrap = {
  init(ctx) {
    // 1. read active tenant from @neuroassist/shared/tenant-context (ACS never writes it)
    // 2. compute onAdminHost from ACS_OPS_HOST (SPEC-05 §4) and publish ops-menu visibility
    // 3. register ACS breadcrumbs with the shell NavigationService
  },
  destroy(ctx) {
    // 1. unregister ACS breadcrumbs / menu entries
    // 2. clear module-local facade signals (caregiver list, patient sessions)
    // 3. a tenant switch during the session invalidates any future ACS cache (bootstrap-flow)
  },
};
```

`init` never performs login (owned by `@neuroassist/shared/auth-session`) and never writes the
active tenant. `destroy` must leave no dangling subscriptions and must clear ACS signals so a later
re-entry starts clean.

## 4. `tool-descriptors.ts` fallback

If the shell renders its sidebar before the ACS lazy chunk resolves, it uses the static
`ACS_MODULE_DESCRIPTOR.menu` as the fallback descriptor so the "Access" section and its entries
appear without eager-loading the feature libraries.

## Criterios de aceite (EARS)

- WHEN the shell boots, THE SYSTEM SHALL register `ACS_MODULE_DESCRIPTOR` and expose the "Access" menu section from the fallback descriptor without eager-loading ACS feature libraries.
- WHEN ACS `init` runs, THE SYSTEM SHALL register the ACS breadcrumbs with the shell NavigationService.
- WHILE `onAdminHost = false`, THE SYSTEM SHALL contribute only the Caregivers and Patient-sessions destinations and SHALL NOT emit the Ops breadcrumb or menu entry.
- WHEN ACS `destroy` runs, THE SYSTEM SHALL unregister its breadcrumbs and clear module-local facade signals.
- WHEN a provision, revoke, or register action completes, THE SYSTEM SHALL forward the action to `@neuroassist/shared/observability` and SHALL NOT call `console.log`.
