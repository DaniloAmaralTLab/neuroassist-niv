# SPEC-03 — View Models — edge (EDGE) Frontend

> View-models are TypeScript `record`-style read-only shapes exposed from `DeviceFacade` signals.
> VMs carry only data the template renders; gating booleans come from `AccessDecisionService`.
> Facades MUST NOT fabricate missing fields as `null` fillers — a field absent from the BE wire
> record is modelled explicitly, not invented (carry-forward `fe-facade:fabricated-null-fields`).
> Liveness is **read**, never derived: `status`, `lastSyncAt`, `detectionState` and its siblings are
> stored exactly as the server reports them (ADR-005). **Detection state is a second, distinct liveness
> axis** (BE ADR-005 / product decision SAFETY-GEST-1): connectivity answers "is the station reachable?",
> detection state answers "is it actually detecting?". The two are rendered as **separate** signals — a
> connected station can still be *not detecting* — and neither is ever computed client-side. Sources:
> `frontend/03-domain-framing-frontend.md` §2–§5, `frontend/05-state-and-data-flow.md`,
> BE api-contract §2.3 / §3.1, BE edge-service ADR-005.

## 1. `DeviceStatusVM` (Topbar badge + Home card + status page)

```ts
type DeviceConnectivity = 'online' | 'offline';          // BE connectivity (meaningful WHILE paired)
type DeviceLifecycleState =
  'awaiting_claim' | 'paired' | 'deactivated' | 'revoked';   // BE lifecycleState (closed set)
type DetectionState =                                    // BE detectionState (api-contract §2.3/§3.1)
  'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';   // absent on the wire ⇒ UNKNOWN
type DetectionReason =                                   // optional BE detectionReason (null unless set)
  'HIDDEN' | 'CAMERA_DENIED' | 'MODEL_FAILED' | 'LOW_FPS';

interface EdgeDeviceVM {
  id: string;
  patientId: string;
  lifecycleState: DeviceLifecycleState;
  status: DeviceConnectivity | null;        // from BE `connectivity`; null WHILE lifecycleState != paired
  lastSyncAt: string | null;                // from BE `lastHeartbeatAt` (ISO); null before first beat
  detectionState: DetectionState;           // from BE `detectionState`; absent wire value ⇒ 'UNKNOWN' (never 'RUNNING')
  detectionStateSince: string | null;       // from BE `detectionStateSince` (ISO); null before first beat
  detectionReason: DetectionReason | null;  // from BE `detectionReason`; null unless the station reported one
  engineVersion: string | null;             // from BE `engineVersion` (detection engine) — NOT the G-EDGE-2 agent `version`
  lastDetectingAt: string | null;           // from BE `lastDetectingAt` (ISO); last beat that reported RUNNING
  version: string | null;                   // G-EDGE-2: NO BE field yet — modelled explicitly absent
  pairedAt: string | null;
}
interface DeviceStatusVM {
  device: EdgeDeviceVM | null;              // null → render "status unavailable" (never a false "online")
  badge: 'online' | 'offline' | 'unavailable';   // derived: online|offline WHILE paired; else unavailable
  detection: 'detecting' | 'not_detecting' | 'offline' | 'unavailable';  // derived detection axis (see §1.1 matrix)
  detectionReason: DetectionReason | null;  // surfaced WHILE detection = 'not_detecting'
  lastSyncRelative: string | null;          // display-only computed() over lastSyncAt (relative time)
  lastDetectingRelative: string | null;     // display-only computed() over lastDetectingAt (relative time)
  loading: boolean;
  canRead: boolean;                         // AccessDecisionService.can('edge.device.read')
}
```

- `badge` is `'online'`/`'offline'` **only** WHILE `lifecycleState = 'paired'` and `status` is set;
  for `awaiting_claim`/`deactivated`/`revoked`/absent reads it is `'unavailable'` — the FE never shows
  a defaulted "online" (doc 03 §5, ADR-005).
- `detection` is a **second, derived axis** computed from `status` + `detectionState` (never a client
  timer): a station that is `online` but not `RUNNING` is shown as *connected, NOT detecting* — distinct
  from offline and from a false "online". The derivation is fixed by the §1.1 matrix.
- `detectionState` absent from the wire is modelled as `'UNKNOWN'` and is **never** rendered as
  detecting (mirrors BE INV-EDGE-9, "absent ⇒ UNKNOWN, never RUNNING").
- `engineVersion` is the **detection-engine** version carried on the heartbeat (BE §2.3); it is NOT the
  agent `version` tracked by G-EDGE-2, which the current BE api-contract still omits.
- `version` is exposed only WHERE the BE supplies it; see G-EDGE-2 (the current BE api-contract has no
  `version` field). The card renders version WHERE present and omits the line otherwise — it does not
  print `null` or a placeholder.

### 1.1 Detection vs connectivity — rendered-state matrix

Connectivity dominates: an **offline** station is "offline" regardless of the last reported detection
state (a dead station cannot be detecting). WHILE online, detection state decides the second signal.

| `device` | `status` (connectivity) | `detectionState` | `badge` | `detection` | Caregiver surface |
|---|---|---|---|---|---|
| null / read failed | — | — | `unavailable` | `unavailable` | "status unavailable" (neutral, Retry) |
| paired | `online` | `RUNNING` | `online` | `detecting` | "detecting" (healthy) |
| paired | `online` | `PAUSED` / `DEGRADED` / `UNAVAILABLE` / `UNKNOWN` | `online` | `not_detecting` | "connected, NOT detecting" + reason (amber warning) |
| paired | `offline` | any (ignored) | `offline` | `offline` | "offline" (amber warning) |
| not paired | `null` | any (ignored) | `unavailable` | `unavailable` | "status unavailable" |

- The `not_detecting` surface is an **amber warning**, never the EVNT full-screen alarm (reserved for
  `HELP_REQUESTED`); escalation of a prolonged lapse is owned server-side by EDGE→EVNT (BE ADR-005), not
  the FE. The FE only renders the state honestly.
- WHILE `detection = 'not_detecting'`, the surface shows `detectionReason` WHERE present (e.g. "camera
  blocked", "low frame rate") and falls back to a generic "not detecting" line when the reason is null.

## 2. `DevicePairingVM` (onboarding step 3 + phone-activation device portion)

```ts
interface DevicePairingVM {
  mode: 'station' | 'phone';                // 'phone' carries the PLAT-001 (Android/Chromium) note
  existingDevice: EdgeDeviceVM | null;      // if present → show "already paired", offer no second pair
  pairing: 'idle' | 'pairing' | 'paired' | 'error';   // ephemeral until the server confirms 'paired'
  pairingCode: string | null;               // from POST /edge/devices (enroll); shown once, never re-read
  pairingCodeExpiresAt: string | null;      // countdown; the code is single-use + short-TTL (BE §2.1)
  canPair: boolean;                         // AccessDecisionService.can('edge.device.pair')
  platformSupported: boolean;               // phone mode: Android/Chromium check (PLAT-001)
  error: string | null;                     // reason code: device_pairing_failed | platform_unsupported | …
}
```

- UI events: `pairRequested` (enroll + show code → `pairing='pairing'`), `devicePaired` (server read
  reports `paired` → `pairing='paired'`), `pairingFailed` (claim timeout / `device-not-claimable` /
  platform unsupported → `pairing='error'`), `retryRequested`.
- Invariant: `pairing='paired'` is set **only** after a device read returns `lifecycleState='paired'`
  — never optimistically (SPEC-04 §4; a false "paired" would hand a lead a non-working detector).
- `pairingCode` is held transiently for display only; it is never persisted and never re-fetched
  (BE returns it exactly once — §2.1, INV-EDGE-3).

## 3. `DeviceLifecycleVM` (re-pair / unpair / deactivate / revoke)

```ts
interface DeviceLifecycleVM {
  device: EdgeDeviceVM;
  canUnpair: boolean;                       // AccessDecisionService.can('edge.device.unpair')
  canDeactivate: boolean;                   // AccessDecisionService.can('edge.device.deactivate')
  canReactivate: boolean;                   // AccessDecisionService.can('edge.device.activate')
  canRevoke: boolean;                       // AccessDecisionService.can('edge.device.revoke')
  pendingAction: 'none' | 'unpair' | 'deactivate' | 'reactivate' | 'revoke';
  confirming: boolean;                      // destructive action behind an explicit confirm
  submitting: boolean;                      // request in flight
}
```

- A `revoked` device never offers Reactivate — revoke is terminal; returning to service requires a new
  enroll + pair (INV-EDGE-6). Reactivate is offered only WHILE `lifecycleState = 'deactivated'`.

## 4. VM ↔ wire mapping

Each VM is produced by a `to<X>(wire)` mapper over an `<X>Wire` type that mirrors the BE record shape
1:1 (carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`). Mappers live in
`libs/edge/data-access`; wire types mirror the BE JSON bodies (SPEC-04 §3). The vision data model's
`status`/`lastSyncAt` names map to the BE's `connectivity`/`lastHeartbeatAt` (G-EDGE-2). The mapper
carries `detectionState` / `detectionStateSince` / `detectionReason` / `engineVersion` /
`lastDetectingAt` through 1:1 and substitutes `'UNKNOWN'` WHILE `detectionState` is absent on the wire
— it never fabricates `'RUNNING'`.

## Criterios de aceite (EARS)

- WHILE `DeviceStatusVM.loading` is true, THE SYSTEM SHALL render the badge skeleton and SHALL NOT render a connectivity value.
- WHILE a device `lifecycleState` is `paired` and `status` is `online`, THE SYSTEM SHALL render the online badge.
- WHILE a device `lifecycleState` is `paired` and `status` is `offline`, THE SYSTEM SHALL render the offline badge in the amber warning state and SHALL NOT escalate it to an alarm.
- WHILE `DeviceStatusVM.device` is null, THE SYSTEM SHALL render the status-unavailable state and SHALL NOT render a defaulted online badge.
- WHILE a device has no `version` field from the backend, THE SYSTEM SHALL omit the version line and SHALL NOT render a placeholder version value.
- WHILE `DevicePairingVM.pairing` is `pairing`, THE SYSTEM SHALL display the pairing code and its expiry and SHALL NOT display a paired confirmation.
- IF a device read returns `lifecycleState` paired, THEN THE SYSTEM SHALL set the pairing state to paired and SHALL NOT mark it paired before the server read confirms it.
- WHILE a patient already has a paired device, THE SYSTEM SHALL show the existing device and SHALL NOT offer a second pair action.
- WHILE a device `lifecycleState` is `revoked`, THE SYSTEM SHALL hide the reactivate action.
- IF a backend wire record omits an optional field, THEN THE SYSTEM SHALL model it as explicitly absent and SHALL NOT fabricate a placeholder value.
- WHILE a paired device is online and its `detectionState` is `RUNNING`, THE SYSTEM SHALL render the detecting state on the device surface.
- WHILE a paired device is online and its `detectionState` is `PAUSED`, `DEGRADED`, `UNAVAILABLE` or `UNKNOWN`, THE SYSTEM SHALL render the connected-but-not-detecting warning with its detection reason and SHALL NOT render it as detecting.
- WHILE a device is offline, THE SYSTEM SHALL render the offline state and SHALL NOT render a detecting state regardless of the last reported detection state.
- WHILE a device read omits `detectionState`, THE SYSTEM SHALL treat the detection state as unknown and SHALL NOT render it as detecting.
- THE SYSTEM SHALL render detection state as a signal distinct from connectivity and SHALL NOT compute detection state from a client-side timer.
