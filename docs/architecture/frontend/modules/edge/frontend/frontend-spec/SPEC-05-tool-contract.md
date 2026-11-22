# SPEC-05 — Module Contract — edge (EDGE) Frontend

> Content of `libs/edge/src/lib/edge.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. Permission keys equal the BE authority constants
> (INV-EDGE-7, D-639). Sources: `frontend/04-frontend-architecture-direction.md` §7,
> BE api-contract §9 (authority→endpoint matrix).

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'edge';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'edge',
  title: 'Edge Device',
  icon: 'router',                 // Material Symbols (self-hosted @font-face)
  section: 'care',
  order: 30,
  // EDGE contributes NO standalone top-level destination: its routes are patient-scoped and reached
  // in context (Home card, onboarding wizard, phone-activation). The entries below are contextual
  // descriptors surfaced by NavigationService when a patient is in scope.
  entries: [
    { label: 'Edge device', route: '/patients/:patientId/device',      requires: 'edge.device.read', contextual: true },
    { label: 'Pair device', route: '/patients/:patientId/device/pair', requires: 'edge.device.pair', contextual: true },
  ],
};
```

Menu/visibility is derived from the permission map by `NavigationService`, never built ad hoc in a
component. The always-visible **topbar `DeviceStatusBadge`** is not a menu entry — it is a Shell-hosted
presentational fed by `DeviceFacade` (SPEC-06 §2, doc 02 §3.2.B).

## 2. `MODULE_PERMISSION_MAP` (BE-canonical authorities, INV-EDGE-7)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'edge.device.enroll':     { label: 'Enroll device',    justification: 'Create an EdgeDevice in awaiting_claim and mint its pairing code — CLINIC_COORDINATOR (api-contract §2.1).' },
  'edge.device.pair':       { label: 'Pair device',      justification: 'Pairing intent held by the enrolling coordinator; gates the "Pair device" affordance (§2.5, op-name parity D-639).' },
  'edge.device.read':       { label: 'Read device',      justification: 'Read device status/connectivity for the badge, Home card and pairing poll — CAREGIVER + CLINIC_COORDINATOR (§2.2, §2.3).' },
  'edge.device.activate':   { label: 'Reactivate device', justification: 'Return a deactivated device to paired with a fresh credential — CLINIC_COORDINATOR (§2.4).' },
  'edge.device.deactivate': { label: 'Deactivate device', justification: 'Reversible soft-disable of a paired device — CLINIC_COORDINATOR (§2.6).' },
  'edge.device.unpair':     { label: 'Unpair device',    justification: 'Break the device↔patient binding and drop the cached catalog — CLINIC_COORDINATOR (§2.7).' },
  'edge.device.revoke':     { label: 'Revoke device',    justification: 'Terminal credential kill — CAREGIVER + CLINIC_COORDINATOR (§2.8, INV-EDGE-6).' },
};
```

> Reconciliation (gap G-EDGE-1): the vision keys `edge.device.view` and `edge.heartbeat.view` are
> **superseded** by the BE authority strings above. Reading device status is `edge.device.read`;
> there is **no** `edge.heartbeat.view` — `edge.heartbeat.record` is a **device-token** authority
> (minted on the `edge.device` identity token, api-contract §5), never a dashboard menu/guard key
> (ADR-014). `edge.catalog.read` is likewise device-token-only. The FE permission map holds only the
> human device-management authorities (§9 CAREGIVER / CLINIC_COORDINATOR rows).
>
> **SAFETY-GEST-1 (no new key).** The `libs/edge` station-liveness sender (SPEC-06 §5) posts the
> heartbeat on the **`edge.device` identity token** under the existing device-token authority
> `edge.heartbeat.record` — it does **not** introduce a dashboard permission. Reading detection state on
> the caregiver surfaces stays gated by the unchanged `edge.device.read`. The permission map above is
> unchanged by this amendment.

Every gate goes through `AccessDecisionService.can(<authority>)`; guards consume its output and MUST
NOT hardcode `return true` (carry-forward `guard:stub-permissive`). The `edge.device` identity token
is never evaluated by a dashboard guard (ADR-014); a patient-session token never carries an `edge.*`
authority (ACS INV), so a patient device can never reach an EDGE management endpoint.

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'edge.patient-phone-pairing': { defaultState: true,  justification: 'Screen 07 device portion — Android/Chromium phone as an edge instance (ADR-014, PLAT-001).' },
  'edge.device-lifecycle':      { defaultState: true,  justification: 'Lightweight re-pair / unpair / deactivate / revoke on the device-status page.' },
};
```

## 4. RBAC-of-UI rule

Action affordances are hidden/disabled by authority, not by role inspection: the "Pair device" CTA is
hidden WHILE the session lacks `edge.device.pair`; Unpair / Deactivate / Revoke are each hidden or
disabled WHILE the session lacks the matching `edge.device.{unpair|deactivate|revoke}`. The device
status badge and Home card require `edge.device.read`. Defense-in-depth only — the BE enforces every
authority regardless (api-contract §9, INV-EDGE-7).

## Criterios de aceite (EARS)

- WHILE the session lacks `edge.device.pair`, THE SYSTEM SHALL hide the "Pair device" action.
- WHILE the session lacks `edge.device.read`, THE SYSTEM SHALL hide the edge-device card and the device-status page.
- WHILE the session lacks `edge.device.unpair`, THE SYSTEM SHALL disable the unpair action on the device.
- WHILE the session lacks `edge.device.revoke`, THE SYSTEM SHALL disable the revoke action on the device.
- THE SYSTEM SHALL evaluate every EDGE action through `AccessDecisionService.can(<authority>)` and SHALL NOT evaluate a role inline in a component.
- THE SYSTEM SHALL treat the edge-device identity token as a device identity and SHALL NOT evaluate it as a caregiver authority in any dashboard guard.
