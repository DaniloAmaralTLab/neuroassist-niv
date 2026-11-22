# SPEC-06 — Shell Integration — gest (GEST) Frontend

> How GEST plugs into the **Patient-Mode station shell**: module descriptor, integration service, and
> bootstrap lifecycle (start/stop the detection runtime, acquire the Wake Lock). The host app that
> mounts GEST (and co-mounts CONV) in Patient Mode is **undecided — gap G1**; GEST exposes a clean
> descriptor + bootstrap and does not decide the host. Sources:
> `frontend/02-architecture-blueprint.md` §4, `frontend/04-frontend-architecture-direction.md` §2,
> shared ADR-006 (module-entry-as-library).

## 1. `gest.descriptor.ts` — Shell descriptor (fallback + registration)

```ts
export const GEST_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: MODULE_KEY,                          // 'gest'
  menu: MODULE_MENU_METADATA,               // SPEC-05 §1 (station context, no caregiver sidebar)
  loadChildren: () => import('@neuroassist/gest').then(m => m.GestModule),
  routeBase: '/station',
  permissions: Object.keys(MODULE_PERMISSION_MAP),   // [] in v1 (station-identity gated — SPEC-05 §2)
  featureFlags: MODULE_FEATURE_FLAGS,
  identity: 'edge.device',                  // this module is gated by the station identity, not a caregiver JWT
};
```

The Patient-Mode host registers GEST by importing `@neuroassist/gest` and pushing
`GEST_MODULE_DESCRIPTOR` into its `MODULE_DESCRIPTORS`. The descriptor declares `identity: 'edge.device'`
so the host wires the device-token interceptor (not the caregiver bearer) for GEST's egress. **Which
host app provides Patient Mode is G1** (referenced by EDGE ADR-005 / ADR-012 §3.2.B, ADR-014) — not
GEST's to decide.

## 2. `GestShellIntegrationService` (`libs/gest/integration`, `type:domain`)

Responsibilities:

- **Runtime wiring:** connect `libs/gest/detection` (worker recognitions) → `ReportFacade`
  (enqueue/report) → EVNT; connect `CatalogFacade` (EDGE catalog + support-check) → the detectable
  gate. Holds no `HttpClient` and no business state; observes facade signals.
- **Honest status propagation:** surface the station's `detection` state (`running`/`paused`/
  `degraded`/`unavailable`) to the host and, via the **EDGE heartbeat** (reused, not a new GEST
  endpoint), to remote caregivers (SPEC-09 / reconciliation #4). GEST invents **no** liveness endpoint.
  It publishes its mapped `reportedDetectionState`/`reportedReason` (SPEC-03 §7) to the **single EDGE
  station-liveness sender** through the injected `StationLivenessPort` (§2.1) and is **not** a second
  heartbeat sender (INV-GEST-8, SAFETY-GEST-1).

### 2.1 `StationLivenessPort` — the seam to `libs/edge` (who sends the heartbeat)

**Decision (SAFETY-GEST-1): `libs/edge` owns the one and only heartbeat sender; GEST does not send it.**
`libs/edge` already holds the station identity — it minted/holds the `edge.device` token, handles
`POST /edge/heartbeat`, the periodic cadence and the refresh-token rotation (EDGE api-contract §3.1,
§5, G1). Adding a `POST /edge/heartbeat` call inside GEST would create **two senders** racing on the
same credential and the refreshed token — rejected. Instead GEST feeds its state in-process:

```ts
// provided by libs/edge's station-liveness service; injected into GestShellIntegrationService
export interface StationLivenessPort {
  // GEST pushes its mapped detection state; libs/edge carries it on the next heartbeat body
  setDetectionState(state: DetectionStateEnum, reason: DetectionReason | null, engineVersion: string | null): void;
  // request an immediate, out-of-cadence beat NOW (used on every transition, incl. →hidden)
  beatNow(): void;
}
```

This keeps GEST's network boundary at the **three device-token calls** of SPEC-04 — the detection-state
publication is an **in-process port call**, not a fourth GEST egress. `libs/edge` reads the last pushed
state on every periodic beat and sends an immediate beat on `beatNow()`.
- **Audit hand-off:** forward recognition / report-outcome / detection-state transitions to
  `@neuroassist/shared/observability` (schema-whitelisted — **never** frames, landmarks, or video;
  INV-GEST-4) so HIST consumes them downstream. Never `console.log`.

## 3. `gest.bootstrap.ts` — lifecycle (station runtime)

```ts
export const gestBootstrap: ModuleBootstrap = {
  init(ctx) {
    // 1. verify the station identity (edge.device token present + unrevoked); else → station-unpaired state
    // 2. load the active catalog (EDGE cache) + run support-check → compute detectable gate (INV-GEST-7)
    // 3. request camera (getUserMedia) + load the landmark model/WASM (worker); report honest states
    // 4. acquire the Screen Wake Lock and register the visibilitychange handler (SPEC-09)
    // 5. start the detection loop ONLY when camera=granted ∧ model=ready ∧ tab visible
    // 6. push the mapped reportedDetectionState (SPEC-03 §7) into StationLivenessPort.setDetectionState
    //    on every runtime-state change, and call beatNow() on each transition; the PERIODIC heartbeat
    //    is libs/edge's (single sender) — GEST never opens its own POST /edge/heartbeat
  },
  destroy(ctx) {
    // 1. stop the detection loop, terminate the worker, stop the MediaStream tracks (camera off)
    // 2. release the Screen Wake Lock and remove the visibilitychange handler
    // 3. flush/persist the durable report queue (never drop a pending report on teardown)
    // 4. clear module-local runtime/recognition signals; leave no dangling subscriptions
  },
};
```

`init` never performs caregiver login (GEST uses the `edge.device` identity, not `shared/auth-session`)
and never mints a token. `destroy` MUST turn the camera off (stop every `MediaStreamTrack`), terminate
the worker, and **persist** the durable queue so a pending help request survives a reload.

### 3.1 Heartbeat cadence & triggers (who sends, when)

- **Periodic.** `libs/edge` sends `POST /edge/heartbeat` on its own cadence (its concern, not GEST's),
  which MUST stay comfortably below EDGE's 120 s detection-lapse window (recommended ≤ 30 s) so a single
  dropped beat is not mistaken for a lapse. Each periodic beat carries the **last pushed**
  `reportedDetectionState`/`reportedReason`/`engineVersion`.
- **Immediate on transition.** On **every** change of `reportedDetectionState` (RUNNING↔PAUSED↔
  DEGRADED↔UNAVAILABLE), `GestShellIntegrationService` calls `StationLivenessPort.beatNow()` so EDGE
  learns the new state without waiting for the next period — a RUNNING→PAUSED edge must reach EDGE/EVNT
  fast, not up to one cadence late.
- **On `visibilitychange → hidden`.** GEST's visibility handler (registered in `init`, SPEC-09 §2.1),
  **in the same synchronous event turn**, sets `reportedDetectionState = PAUSED (HIDDEN)` and calls
  `beatNow()`. `libs/edge` sends that final beat with **`fetch(…, { keepalive: true })`** so the request
  survives the tab being backgrounded or unloaded. Honest limits: a `keepalive` fetch is best-effort and
  capped at ~64 KB (ample here) and, unlike a normal request, is not cancelled when the page hides;
  `navigator.sendBeacon` is **not** used because it cannot carry the `edge.device` bearer
  `Authorization` header (it would force the token into the body/URL — rejected). Once the OS **fully
  suspends** the process (device asleep/powered off), neither the beat nor the timer fires at all — see
  SPEC-09 §4 (the stopped heartbeat itself trips the EDGE lapse).

## 4. `tool-descriptors.ts` fallback

If the host renders before the GEST lazy chunk resolves, it uses the static
`GEST_MODULE_DESCRIPTOR.menu` as the fallback for the station-status entry; the near-headless runtime
is mounted by the host at Patient-Mode entry (no eager feature bundle).

## Criterios de aceite (EARS)

- WHEN the Patient-Mode host boots GEST `init` with a valid station identity, THE SYSTEM SHALL load the catalog, run the detectable gate, request the camera, load the model, acquire the Screen Wake Lock, and start the detection loop only when camera and model are ready and the tab is visible.
- IF the station identity is absent or revoked at `init`, THEN THE SYSTEM SHALL render the station-unpaired state and SHALL NOT start the detection loop.
- WHEN GEST `destroy` runs, THE SYSTEM SHALL stop the detection loop, terminate the worker, stop every camera track, release the Wake Lock, and persist the durable report queue.
- THE SYSTEM SHALL propagate the station's detection state to remote caregivers via the EDGE heartbeat and SHALL NOT invent a GEST liveness endpoint.
- WHEN GEST forwards an activity to observability, THE SYSTEM SHALL include only schema-whitelisted fields and SHALL NOT log a frame, a landmark array, or video, and SHALL NOT call `console.log`.
- THE SYSTEM SHALL route the station heartbeat through the single EDGE station-liveness sender and SHALL NOT open a second heartbeat sender from GEST.
- THE SYSTEM SHALL publish its mapped `detectionState` to the EDGE station-liveness port and SHALL NOT add a fourth network call from GEST.
- THE SYSTEM SHALL send the periodic heartbeat on a cadence below the EDGE detection-lapse window so a single dropped beat is not a lapse.
- WHEN the reported `detectionState` transitions, THE SYSTEM SHALL send an immediate heartbeat carrying the new `detectionState` in addition to the periodic cadence.
- WHEN the station transitions to hidden, THE SYSTEM SHALL send the final heartbeat with a keepalive fetch so it survives the tab being backgrounded.
