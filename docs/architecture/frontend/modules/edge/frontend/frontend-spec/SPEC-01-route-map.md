# SPEC-01 — Route Map — edge (EDGE) Frontend

> Module **EDGE — Edge Device Integration** · Entry lib `@neuroassist/edge`
> (`libs/edge`, shared ADR-006) · Shell `neuroassist-niv-web`.
> Sources: `frontend/04-frontend-architecture-direction.md` §5, `frontend/02-architecture-blueprint.md` §4,
> `frontend/05-state-and-data-flow.md` §6. BE authorities are canonical in
> `../../../../backend/services/edge-service/contracts/api-contract.md` §9.

EDGE exposes two **patient-scoped** feature routes plus one always-visible, non-routed surface (the
topbar `DeviceStatusBadge`). The Shell lazy-loads `@neuroassist/edge` via `loadChildren`; every
sub-route is lazy via `loadComponent`. EDGE contributes **no** standalone top-level sidebar
destination — its surfaces are reached in patient context (the Home edge-device card, the
shell-orchestrated onboarding wizard step 3, and the phone-activation screen) and the badge is
rendered by the Shell topbar. The pairing panel component is the same artifact in all three places;
only its routed host differs.

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/patients/:patientId/device` | `EdgeDeviceStatusPageComponent` | `libs/edge/feature-device-status` | `authGuard`, `canReadDeviceGuard` | "Edge device" | [Care, Edge device, {patient}] |
| `/patients/:patientId/device/pair` | `DevicePairingPageComponent` | `libs/edge/feature-device-pairing` | `authGuard`, `canPairDeviceGuard` | "Pair device" | [Care, Edge device, {patient}, Pair] |

- `authGuard` is the shared session guard (`@neuroassist/shared/auth-session`). On an absent/expired
  session it redirects to the shell login route (never renders the EDGE surface) — carry-forward of
  `guard:unauth-redirect:session-absent-must-go-to-login`.
- `canReadDeviceGuard` (`libs/edge/access`) consumes `AccessDecisionService.can('edge.device.read')`
  — it **never** hardcodes `return true` (carry-forward `guard:stub-permissive:hardcoded-return-true`).
  Renamed from the vision's `canViewDeviceGuard`; the authority is `edge.device.read` (BE-canonical),
  **not** the superseded `edge.device.view` / `edge.heartbeat.view` (G-EDGE-1).
- `canPairDeviceGuard` (`libs/edge/access`) consumes `AccessDecisionService.can('edge.device.pair')`.
  The routed enroll-to-pair action additionally requires `edge.device.enroll` on the backend call
  (`POST /edge/devices`, §2.1) — the enrolling CLINIC_COORDINATOR holds both; `edge.device.pair` is
  the op-name-parity constant reserved for the pairing intent (api-contract §2.5, D-639).

The **device-identity** token (`edge.device`, carried by the station/phone agent for GEST) is never a
route guard key — dashboard guards read only caregiver `edge.*` authorities (ADR-014 / ADR-005). The
device-facing authorities `edge.heartbeat.record` and `edge.catalog.read` are **never** FE concerns
(no dashboard screen calls `/edge/heartbeat` or `/edge/catalog`).

## 2. Embedded (non-routed) surfaces

```
Shell neuroassist-niv-web (scope:web)
  topbar → DeviceStatusBadge (libs/edge/ui) fed by DeviceFacade   ← always visible, §3.2.B, NOT routed
  Home   → EdgeDeviceCardComponent (feature-device-status)        ← rendered in the Home dashboard grid
  Onboarding wizard (shell-orchestrated) step 3 "Edge device"
         → DevicePairingPanelComponent (feature-device-pairing)   ← embedded, not a route of its own
  Screen 07 patient-phone activation, device portion
         → DevicePairingPanelComponent (mode = 'phone')           ← embedded beside the ACS session portion
```

## 3. Lazy-loading topology

```
Shell neuroassist-niv-web (scope:web)
  config/module-descriptors.ts → import('@neuroassist/edge')  [loadChildren → EDGE_ROUTES]
    /patients/:patientId/device       → loadComponent feature-device-status/EdgeDeviceStatusPageComponent
    /patients/:patientId/device/pair  → loadComponent feature-device-pairing/DevicePairingPageComponent
  (topbar DeviceStatusBadge is a presentational contributed eagerly from libs/edge/ui — the single
   eager surface; feature libs stay lazy.)
```

## 4. Route → authority mapping (BE-canonical, INV-EDGE-7)

| Route / action | UI action gated | BE authority (`RoleAuthorityPolicy`) |
|---|---|---|
| `/patients/:patientId/device` | read device status / list | `edge.device.read` |
| `/patients/:patientId/device/pair` | begin pairing (enroll + claim) | `edge.device.pair` (+ `edge.device.enroll` on `POST /edge/devices`) |
| device-status page → Unpair | unpair device | `edge.device.unpair` |
| device-status page → Deactivate | deactivate device | `edge.device.deactivate` |
| device-status page → Reactivate | reactivate device | `edge.device.activate` |
| device-status page → Revoke | terminal credential kill | `edge.device.revoke` |

> Reconciliation (gap G-EDGE-1, see `contracts/backend-api-cross-link.md`): the FE vision used
> `edge.device.view` and `edge.heartbeat.view`. The BE contract is the source of truth, so this and
> all downstream specs use `edge.device.read` for reading device status (there is **no**
> `edge.heartbeat.view`; heartbeat is a device-token authority, never a dashboard key). INV-EDGE-7
> requires the FE decision keys to equal the BE authority constants.

## Criterios de aceite (EARS)

- WHEN a caregiver navigates to `/patients/{patientId}/device`, THE SYSTEM SHALL render the edge-device status page for that patient.
- IF the session is absent or expired on any EDGE route, THEN THE SYSTEM SHALL redirect to the login route and SHALL NOT render any EDGE device surface.
- IF `canReadDeviceGuard` denies `/patients/{patientId}/device`, THEN THE SYSTEM SHALL redirect to the forbidden route and SHALL NOT load the device-status feature library.
- IF `canPairDeviceGuard` denies `/patients/{patientId}/device/pair`, THEN THE SYSTEM SHALL redirect to the forbidden route and SHALL NOT load the device-pairing feature library.
- THE SYSTEM SHALL load every EDGE feature route lazily via `loadComponent` and SHALL NOT eager-bundle a feature library into the shell.
- THE SYSTEM SHALL render the topbar device-status badge without a route and SHALL NOT eager-load the pairing or status feature libraries to show it.
