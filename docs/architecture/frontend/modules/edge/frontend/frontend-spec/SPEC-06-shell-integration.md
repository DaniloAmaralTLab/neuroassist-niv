# SPEC-06 — Shell Integration — edge (EDGE) Frontend

> How EDGE plugs into the `neuroassist-niv-web` shell: module descriptor, integration service (incl.
> the always-visible topbar badge contribution), and bootstrap lifecycle. Sources:
> `frontend/02-architecture-blueprint.md` §4, `frontend/04-frontend-architecture-direction.md` §2,
> shared ADR-006 (module-entry-as-library).

## 1. `edge.descriptor.ts` — Shell descriptor (fallback + registration)

```ts
export const EDGE_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: MODULE_KEY,                         // 'edge'
  menu: MODULE_MENU_METADATA,              // SPEC-05 §1 (contextual, patient-scoped)
  loadChildren: () => import('@neuroassist/edge').then(m => m.EdgeModule),
  routeBase: '/patients/:patientId/device',
  permissions: Object.keys(MODULE_PERMISSION_MAP),
  featureFlags: MODULE_FEATURE_FLAGS,
  topbarContribution: 'DeviceStatusBadge',  // the one eager presentational (doc 02 §3.2.B)
};
```

The shell registers EDGE by importing `@neuroassist/edge` in `config/module-descriptors.ts` and
pushing `EDGE_MODULE_DESCRIPTOR` into `MODULE_DESCRIPTORS`. The descriptor is the shell's fallback
source for menu/permission metadata if the lazy chunk has not loaded yet. Because device connectivity
must be **always visible**, the descriptor also declares the topbar badge contribution — the single
eager-presentational surface, while pairing/lifecycle features stay lazy.

## 2. `EdgeShellIntegrationService` (`libs/edge/integration`, `type:domain`)

Responsibilities:

- **Topbar badge:** contribute `DeviceStatusBadge` (from `libs/edge/ui`) to the Shell topbar, fed by
  `DeviceFacade`'s server-derived `status`/`lastSyncRelative`. The badge is always visible and never
  hidden behind a submenu (Principle 2.6 / §3.2.B); it refreshes on mount and on each navigation.
- **Breadcrumbs:** feed `BreadcrumbItem[]` to the shell `NavigationService`
  (`Care → Edge device → {patient}`; `Care → Edge device → {patient} → Pair device`).
- **Menu visibility:** EDGE contributes contextual, patient-scoped destinations only; it emits no
  standalone top-level sidebar entry.
- **Audit hand-off:** forward pair / unpair / deactivate / revoke UI actions and status transitions to
  `@neuroassist/shared/observability` so HIST consumes them downstream (EDGE does not render history —
  doc 02 §2).
- It holds no `HttpClient` and no business state; it observes facade signals.

## 3. `edge.bootstrap.ts` — lifecycle

```ts
export const edgeBootstrap: ModuleBootstrap = {
  init(ctx) {
    // 1. read active tenant from @neuroassist/shared/tenant-context (EDGE never writes it)
    // 2. mount the topbar DeviceStatusBadge bound to DeviceFacade and trigger the first status read
    // 3. register EDGE breadcrumbs with the shell NavigationService
  },
  destroy(ctx) {
    // 1. unmount the topbar badge and unregister EDGE breadcrumbs
    // 2. clear module-local DeviceFacade signals (device read-model, pairing draft)
    // 3. a tenant switch during the session invalidates any future EDGE state (bootstrap-flow)
  },
};
```

`init` never performs login (owned by `@neuroassist/shared/auth-session`) and never writes the active
tenant. `destroy` must leave no dangling subscriptions and must clear EDGE signals so a later re-entry
starts clean and never shows a stale device status.

## 4. `tool-descriptors.ts` fallback

If the shell renders its topbar/sidebar before the EDGE lazy chunk resolves, it uses the static
`EDGE_MODULE_DESCRIPTOR.menu` + `topbarContribution` as the fallback so the device-status badge slot
is reserved (no CLS) and the contextual entries resolve without eager-loading the feature libraries.

## 5. `StationLivenessService` — the single station heartbeat sender (SAFETY-GEST-1)

> Product decision **SAFETY-GEST-1** (BE edge-service ADR-005; GEST frontend SPEC-06 §2.1): **`libs/edge`
> is the one and only heartbeat sender**. It already holds the station identity — it minted/holds the
> `edge.device` token and owns the `POST /edge/heartbeat` call, the periodic cadence and the
> refresh-token rotation. A second sender inside GEST would race two senders on the same credential and
> refreshed token — rejected. This service runs in the **Patient-Mode station** runtime, not the
> caregiver dashboard; the dashboard surfaces (badge/card/status page) only *read* the device projection.

`StationLivenessService` (`libs/edge/integration`, `type:domain`) implements the in-process
`StationLivenessPort` that GEST injects:

```ts
// implemented by libs/edge; consumed in-process by GestShellIntegrationService (GEST SPEC-06 §2.1)
export interface StationLivenessPort {
  setDetectionState(state: DetectionStateEnum, reason: DetectionReason | null, engineVersion: string | null): void;
  beatNow(): void;   // immediate, out-of-cadence beat (used on every transition, incl. →hidden)
}
```

Responsibilities:

- **Single sender:** owns `POST /edge/heartbeat` (SPEC-04 §3.1 `HeartbeatRequestWire`) via the EDGE data
  adapter on the `edge.device` token; no other EDGE or GEST code sends a heartbeat.
- **State buffer:** `setDetectionState` stores the last pushed `detectionState` / `reason` /
  `engineVersion`; every subsequent beat (periodic or immediate) carries that last-pushed state. WHILE no
  state has been pushed, the beat omits `detectionState` (the BE records `UNKNOWN`, never `RUNNING`).
- **Token rotation:** on each heartbeat response carrying `refreshedToken`, it rotates the stored
  station token (SPEC-04 §3.1, G1) — GEST never touches the token.

### 5.1 Cadence & triggers (who sends, when)

- **Periodic.** The service sends on its own cadence, which MUST stay comfortably below EDGE's 120 s
  detection-lapse window — **≤ 30 s** — so a single dropped beat is not mistaken for a lapse. Each
  periodic beat carries the last-pushed detection state.
- **Immediate on transition.** On each `beatNow()` (GEST calls it on every `detectionState` transition
  RUNNING↔PAUSED↔DEGRADED↔UNAVAILABLE), the service sends an immediate beat so EDGE/EVNT learn the new
  state without waiting up to one cadence.
- **On `visibilitychange → hidden`.** When GEST calls `beatNow()` in the hidden handler (GEST SPEC-06
  §3.1), the service sends that final beat with **`fetch(…, { keepalive: true })`** so the request
  survives the tab being backgrounded or unloaded. `navigator.sendBeacon` is **not** used: it cannot
  carry the `edge.device` bearer `Authorization` header (it would force the token into the body/URL —
  rejected). Once the OS fully suspends the process, neither the beat nor the timer fires — that silence
  is itself the EDGE lapse (BE ADR-005 §3.2).

## Criterios de aceite (EARS)

- WHEN the shell boots, THE SYSTEM SHALL register `EDGE_MODULE_DESCRIPTOR` and reserve the topbar device-status badge slot without eager-loading the EDGE feature libraries.
- WHEN EDGE `init` runs, THE SYSTEM SHALL mount the topbar device-status badge, trigger the first status read, and register the EDGE breadcrumbs with the shell NavigationService.
- THE SYSTEM SHALL keep the topbar device-status badge visible on every dashboard screen and SHALL NOT hide it behind a submenu.
- WHEN EDGE `destroy` runs, THE SYSTEM SHALL unmount the badge, unregister its breadcrumbs, and clear module-local device signals.
- WHEN a pair, unpair, deactivate, or revoke action completes, THE SYSTEM SHALL forward the action to `@neuroassist/shared/observability` and SHALL NOT call `console.log`.
- THE SYSTEM SHALL provide a single station-liveness sender in `libs/edge` that implements `StationLivenessPort` and SHALL NOT open a second heartbeat sender.
- WHEN a consumer calls `setDetectionState`, THE SYSTEM SHALL carry the given detection state, reason and engine version on the next heartbeat and SHALL NOT report RUNNING when no state has been pushed.
- WHEN a consumer calls `beatNow`, THE SYSTEM SHALL send an immediate out-of-cadence heartbeat carrying the last pushed detection state.
- THE SYSTEM SHALL send the periodic station heartbeat on a cadence at or below thirty seconds so a single dropped beat is not mistaken for a detection lapse.
- WHEN the reported detection state transitions, THE SYSTEM SHALL send an immediate heartbeat carrying the new detection state in addition to the periodic cadence.
- WHEN the station transitions to hidden on visibilitychange, THE SYSTEM SHALL send the final heartbeat with a keepalive fetch and SHALL NOT use navigator.sendBeacon because it cannot carry the device bearer token.
- WHEN a heartbeat response carries a refreshed edge-device token, THE SYSTEM SHALL rotate the stored station token and SHALL NOT keep using the superseded token.
