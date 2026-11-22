# SPEC-02 — Component Hierarchy — edge (EDGE) Frontend

> Standalone-first, OnPush mandatory. Smart components consume `DeviceFacade` (signals);
> presentational components receive `input()`s and emit `output()`s and hold no HttpClient.
> Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/03-domain-framing-frontend.md` §2,
> `frontend/04-frontend-architecture-direction.md` §3. SPEC-02 is prose (no EARS section).

## 1. `feature-device-pairing` (onboarding step 3 · phone-activation device portion · route /pair)

```
DevicePairingPageComponent             (smart · OnPush)   route /patients/:patientId/device/pair
│  reads:  deviceFacade.pairingVm()         Signal<DevicePairingVM>
│          accessDecision.can('edge.device.pair')  → canPair
├── DevicePairingPanelComponent        (presentational)   ← the one artifact reused in the wizard
│     input:  vm: DevicePairingVM                            step 3 and in Screen 07 (mode='phone')
│     output: pairRequested   (user clicks "Pair device" / "Pair mobile phone")
│     output: retryRequested  (user retries after error)
│   ├── PairingCodeDisplayComponent    (presentational)   input: code: string; expiresAt: string
│   │       (shows the single-use pairing code + countdown so the station can claim it)
│   ├── PairingProgressComponent       (presentational)   input: pairing: 'idle'|'pairing'|'paired'|'error'
│   ├── ExistingDeviceNoticeComponent  (presentational)   input: existingDevice  (shown instead of a
│   │       second "Pair" when the patient already has a paired device — no reset simulation)
│   └── DeviceStatusBadge              (libs/edge/ui)      input: status; lastSyncRelative
└── PlatformUnsupportedNoticeComponent (presentational)   input: visible  (phone mode, PLAT-001)
```

The panel never renders a "paired" state until the facade reports `pairing = 'paired'` from the
server read (pessimistic — SPEC-04 §4). In `mode = 'phone'` it additionally gates on an
Android/Chromium platform check (PLAT-001) surfaced via `PlatformUnsupportedNoticeComponent`.

## 2. `feature-device-status` (Home edge-device card · device lifecycle · route /device)

```
EdgeDeviceStatusPageComponent          (smart · OnPush)   route /patients/:patientId/device
│  reads:  deviceFacade.statusVm()          Signal<DeviceStatusVM>
│          deviceFacade.lifecycleVm()       Signal<DeviceLifecycleVM>
│          accessDecision.can('edge.device.unpair')     → canUnpair
│          accessDecision.can('edge.device.deactivate') → canDeactivate
│          accessDecision.can('edge.device.revoke')     → canRevoke
├── EdgeDeviceCardComponent            (presentational)   ← reused in the Home dashboard grid
│     input:  vm: DeviceStatusVM
│       renders: status badge, version (WHERE present), "synced N ago"; amber WHILE offline
│   └── DeviceStatusBadge              (libs/edge/ui)
├── DeviceLifecycleActionsComponent    (presentational)
│     input:  canUnpair, canDeactivate, canReactivate, canRevoke, device
│     output: unpairRequested / deactivateRequested / reactivateRequested / revokeRequested
└── ConfirmDialogComponent             (shared ui-components) — confirm before every destructive action
      (unpair / deactivate / revoke are behind an explicit confirm; SPEC-04 §4, SPEC-07)
```

## 3. `libs/edge/ui` — `DeviceStatusBadge` (presentational, reused by the Shell topbar)

```
DeviceStatusBadge                      (presentational · OnPush)
  input:  status: 'online' | 'offline' | 'unavailable'
  input:  lastSyncRelative: string | null      // "3 min ago"; display-only computed (never liveness)
    online      → success token + "Device online"
    offline     → warning/amber token + "Device offline"      (never a danger/alarm — EVNT only)
    unavailable → ink-faint neutral + "Status unavailable"    (never a defaulted "online")
```

The badge holds no logic: `isOnline` and `lastSyncRelative` are computed in `DeviceFacade`; the badge
renders them. It reserves its layout slot to avoid CLS on a status change (doc 02 §5).

## 4. Component rules (all features)

- Every component is `standalone: true`, `changeDetection: OnPush`.
- No component imports `HttpClient`; all server access is through `DeviceFacade` (SPEC-04).
- No component evaluates a role inline; gating booleans come from `AccessDecisionService.can(...)`.
- No component synthesizes `online`/`offline` from a client timer; liveness is read from the facade's
  server-derived `status` (ADR-005, carry-forward `edge:fe-infers-liveness`).
- Presentational components are pure: inputs in, outputs out, no injected facade.
- Accessibility carry-forwards (Learning): the pairing-code region carries an accessible name and is
  announced on state change (`fe-component:a11y-live-region`); destructive triggers return focus after
  an in-flight action (`fe-component:modal-focus-return`); "synced N ago" renders via a relative-time
  pipe, never `toFixed` (`fe-component:kpi-decimal-format`).
- Styling via Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`); dark is
  default; no hardcoded colour/spacing (see `contracts/design-tokens.md`).
