# 04 — Frontend Architecture Direction — edge (EDGE)

## 1. Stack

- **Angular 21**, **Nx 22.x**, **TypeScript strict**.
- **RxJS 7.8 + Signals** (Signals for state; RxJS only at the HTTP edge).
- **Design system:** Angular **CDK** primitives (no `@angular/material` components) + **Tailwind v4
  CSS-first** (oklch tokens, dark default) via `@neuroassist/shared/ui-tokens`; icons via Material
  Symbols (self-hosted `@font-face`, see `design-system-tokens.md`).
- **Tests:** Jest (unit), Playwright (`apps/edge-e2e`).
- **English-only** (ADR-018) — no i18n framework.

## 2. App boundary

`apps/edge/` is a thin host; its `app.routes.ts` does only
`loadChildren: () => import('@neuroassist/edge').then(m => m.EdgeModule)`. The real entry is the
module-as-library `libs/edge` with importPath **`@neuroassist/edge`** (shared ADR-006). The Shell
`neuroassist-niv-web` registers EDGE by importing `@neuroassist/edge` in
`config/module-descriptors.ts` and populating `MODULE_DESCRIPTORS` with `EDGE_MODULE_DESCRIPTOR`.
Additionally — because device connectivity must be **always visible** (§3.2.B) — the Shell topbar
consumes EDGE's `DeviceStatusBadge` (from `libs/edge/ui`) fed by the EDGE `DeviceFacade`; this is the
one eager-presentational surface, while pairing/lifecycle features remain lazy.

## 3. Library organization (Nx tags)

| Library | `type:` | Purpose |
|---|---|---|
| `libs/edge` (entry) | `type:app` | Entry: module + contract + routes + permission-map + feature-flags + bootstrap + nav.config + descriptor + `provideEdge`. |
| `libs/edge/access` | `type:domain` | `canPairDeviceGuard`, `canViewDeviceGuard` (consume `AccessDecisionService`). |
| `libs/edge/data-access` | `type:data-access` | `EDGE_DEVICE_PORT` + Http/Mock adapters + `DeviceFacade` (signals) + `EdgeDeviceWire` mapper. |
| `libs/edge/feature-device-pairing` | `type:feature` | Pairing panel: onboarding step 3 + phone-activation device portion (`idle → pairing → paired`). |
| `libs/edge/feature-device-status` | `type:feature` | Home edge-device card + device lifecycle (re-pair / unpair). |
| `libs/edge/ui` | `type:ui` | `DeviceStatusBadge` (online/offline + last-sync) — presentational, reused by the topbar. |
| `libs/edge/integration` | `type:domain` | `EdgeShellIntegrationService` + topbar badge contribution. |
| `libs/edge/navigation` | `type:domain` | Breadcrumb / menu state. |

Boundary: `scope:edge` → `scope:edge` + `scope:shared` only (`nx-boundaries.md`).

## 4. Hub / shared library dependencies

`@neuroassist/shared/{auth-session, tenant-context, access-decision, access-http-base, contracts,
ui-components, ui-feedback, ui-tokens, observability, error-model}`.
Direction per `nx-boundaries.md`: `data-access` → `contracts` + `access-http-base` + `error-model`;
`access` → `access-decision` + `auth-session`; `ui` → `shared/ui-*`; `feature` → all of the module's
own libs + `shared/*`.

## 5. Routing strategy

- Shell → `@neuroassist/edge` via `loadChildren` (`EDGE_ROUTES`).
- Sub-routes via `loadComponent` (lazy per feature):
  - `/patients/:patientId/device/pair` → `feature-device-pairing`,
    `canActivate: [authGuard, canPairDeviceGuard]` (reused as the onboarding device step and the
    phone-activation device portion)
  - `/patients/:patientId/device` → `feature-device-status`,
    `canActivate: [authGuard, canViewDeviceGuard]`
- The topbar `DeviceStatusBadge` is **not** routed — it is a Shell-hosted presentational fed by the
  EDGE facade (always visible).
- Menu/visibility derived by `NavigationService` from `edge.permission-map.ts`.

## 6. State strategy

- **Signals-first** in the facade: private `signal<EdgeDevice[]>()` + public `.asReadonly()`; derived
  `deviceForPatient`, `isOnline`, `lastSyncRelative` via `computed()`.
- **No NgRx, no manual `BehaviorSubject`** as source of truth. RxJS appears only wrapping `HttpClient`
  calls, immediately converted to signals in the facade.
- The pairing feature holds its transient `pairing` state in a feature-local
  `signal<DevicePairingVM['pairing']>`; nothing is persisted until the claim confirms.
- Liveness is **read**, not derived: the facade stores the server-reported `status`/`lastSyncAt`; a
  display-only relative-time `computed()` is fine, but "offline" is never synthesized client-side
  (ADR-005).

## 7. Tool/module contract strategy (`edge.contract.ts`)

```
MODULE_KEY = 'edge'
ModuleMenuMetadata: { title: 'Edge Device', icon: 'router', order, section: 'care' }
permissions: ['edge.device.view', 'edge.device.pair', 'edge.device.unpair', 'edge.heartbeat.view']
featureFlags: { patientPhonePairing: { defaultState: true },   // Screen 07 device portion (Android/Chromium)
                deviceUnpair:        { defaultState: true } }   // lightweight lifecycle
```

Permissions are consumed by `AccessDecisionService`. Authorities use the canonical English
`edge.<resource>.<action>` scheme (D-639), mirroring the BE `edge-service` authorities once it is
architected, and matching the ACS/PAT convention. The `edge.device` **identity token** is distinct from
these authorities and is never a menu/guard key. Patient-session tokens never carry an `edge.*`
authority (ACS INV-3), so a patient device can never reach an EDGE management endpoint.

## 8. Ports & adapters (`provideEdge`)

```
provideEdge({ adapter: 'http' | 'mock' })   // DEFAULT 'mock' — edge-service NOT yet architected
  EDGE_DEVICE_PORT → EdgeDeviceHttpAdapter | EdgeDeviceMockAdapter
```

The HTTP adapter bases at `${ACCESS_HTTP_BASE}/edge`, types the response as `EdgeDeviceWire` mirroring
the (future) Java record, and `.pipe(map(toEdgeDevice))` into the domain/VM shape. The `MockAdapter`
serves fixtures in the same wire shape through the same mapper. **Carry-forward**
(`scaffold:mock-adapter-default`): the default is `mock` *because the BE does not exist yet* — and must
be flipped to `http` the moment `edge-service` specs land; a providers spec must prove the intended
default, so the default never silently diverges from the BE reality.
