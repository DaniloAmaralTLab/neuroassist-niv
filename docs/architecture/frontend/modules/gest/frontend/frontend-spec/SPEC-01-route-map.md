# SPEC-01 — Route Map — gest (GEST) Frontend

> Module **GEST — Gesture Detection (Edge)** · Entry lib `@neuroassist/gest`
> (`libs/gest`, shared ADR-006) · Host: the **Patient-Mode station shell** (host app undecided, G1).
> Sources: `frontend/04-frontend-architecture-direction.md` §5, `frontend/02-architecture-blueprint.md` §4,
> `frontend/05-state-and-data-flow.md` §6. BE authorities are canonical in
> `../../../../../backend/services/gest-service/contracts/api-contract.md` §1 and the EVNT / EDGE
> api-contracts.

GEST is **not** a caregiver dashboard module — it is the **on-device detection runtime of the
patient station**. It exposes two lazy sub-routes: a near-headless **runtime** route (the detection
loop; the patient never navigates) and an **on-station status** route (the operator/caregiver
physically at the station glances at detector health). Both routes are gated by the **station
identity** — the `edge.device` token minted by EDGE — **not** by a caregiver ACS JWT or an
`AccessDecisionService.can('gest.*')` guard. There is **no** top-level sidebar destination and no
breadcrumb for the runtime (the patient does not read a UI).

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/station/runtime` | `StationRuntimePageComponent` | `libs/gest/feature-station-runtime` | `stationIdentityGuard` | "Station detection" | — (background runtime, no breadcrumb) |
| `/station/status` | `StationStatusPageComponent` | `libs/gest/feature-station-status` | `stationIdentityGuard` | "Detection status" | [Station, Detection status] |

- `stationIdentityGuard` (`libs/gest/access`) authorises both routes by the **station identity**: it
  requires a valid, unrevoked `edge.device` token (from EDGE, carried by the device-token
  interceptor). It is **not** `AccessDecisionService.can(...)` and **never** hardcodes `return true`
  (carry-forward `guard:stub-permissive:hardcoded-return-true`). On an absent / expired / revoked
  (401 / unpaired) station identity it routes to the "station unpaired — re-pair in EDGE" state and
  **never** renders a faked "watching" runtime (INV-GEST-6, doc 02 §3 edge case).
- The runtime route has **no breadcrumb** and is mounted by the Patient-Mode host in the background;
  the patient performs only the gesture (doc 01 §3). The status route is the single navigable surface
  and is the operator-at-the-station view (doc 05 §6).

## 2. Authority reconciliation (vision → BE, mandatory)

The vision (`frontend/02 §3` golden path C, `frontend/04 §7`, `frontend/05 §6`) sketched the guard
authorities **`gest.runtime.read`**, **`gest.runtime.control`** and **`gest.diagnostics.read`**.
**None of these exist in the backend** — the `gest-service` api-contract declares only
`gest.engine.read/create/retire` and `gest.capability.read/create/retire` (§1.1), and the station
runtime is **FE-local with no BE authority** (handoff M2: "no `gest.runtime.*` / `gest.diagnostics.*`
authorities; station runtime is FE-local"). They are reconciled as follows (see
`contracts/backend-api-cross-link.md` §2):

| Vision authority | Status | Reconciliation |
|---|---|---|
| `gest.runtime.read` | **DROPPED** | The runtime + on-station status are gated by the **station identity** (`stationIdentityGuard`, the `edge.device` token), not a caregiver authority. There is no BE `gest.runtime.*` resource. |
| `gest.runtime.control` | **DROPPED** | Start/stop of the detection loop is the station's own lifecycle (bootstrap, §SPEC-06), driven by the `edge.device` identity — never a caregiver authority. |
| `gest.diagnostics.read` | **DROPPED / re-mapped** | There is **no** BE GEST "diagnostics" read endpoint. The on-station status surface reads station-local signals + the **detectable gate** via `POST /gest/capabilities/support-check` (authority **`gest.capability.read`**, carried by the `edge.device` token — INT-GEST-ACS-1) and `gest.engine.read`. The **remote caregiver** liveness signal is **EDGE's** (`edge.device.read` on EDGE's `DeviceStatusBadge`), **not** a GEST endpoint (reconciliation §SPEC-09, SAFETY). |

> The only real BE GEST authorities the station token carries are `gest.capability.read` and
> `gest.engine.read` (both on the `edge.device` machine token, INT-GEST-ACS-1). They authorise the
> support-check **call**; they are **not** evaluated by any `AccessDecisionService` caregiver guard.
> GEST therefore contributes **no** caregiver authority-gated menu entry (SPEC-05 §2). WHERE a future
> caregiver-facing GEST screen is added, it MUST use `gest.capability.read` / `gest.engine.read`
> exactly (D-639, never `.view`).

## 3. Lazy-loading topology

```
Patient-Mode station shell (host TBD — G1; e.g. apps/gest thin host, type:app)
  module-descriptors → import('@neuroassist/gest')  [loadChildren → GEST_ROUTES]
    /station/runtime  → loadComponent feature-station-runtime/StationRuntimePageComponent
                        canActivate: [stationIdentityGuard]   (edge.device identity)
    /station/status   → loadComponent feature-station-status/StationStatusPageComponent
                        canActivate: [stationIdentityGuard]
  (no eager surface; both features are lazy. GEST contributes no topbar/sidebar entry.)
```

## Criterios de aceite (EARS)

- WHEN the Patient-Mode host navigates to `/station/runtime` with a valid `edge.device` station identity, THE SYSTEM SHALL mount the detection runtime without a breadcrumb and SHALL NOT require any caregiver `gest.*` authority.
- WHEN the operator navigates to `/station/status` with a valid `edge.device` station identity, THE SYSTEM SHALL render the on-station detection-status surface.
- IF the station identity is absent, expired, or reported revoked/unpaired, THEN THE SYSTEM SHALL route to the station-unpaired state and SHALL NOT render a running detection runtime.
- THE SYSTEM SHALL gate the runtime and status routes by the `edge.device` station identity and SHALL NOT evaluate `gest.runtime.read`, `gest.runtime.control`, or `gest.diagnostics.read` (no such backend authority exists).
- THE SYSTEM SHALL load every GEST feature route lazily via `loadComponent` and SHALL NOT eager-bundle a feature library into the host shell.
- THE SYSTEM SHALL expose no caregiver sidebar destination and no runtime breadcrumb, and SHALL render the detection-status surface as the module's only navigable view.
