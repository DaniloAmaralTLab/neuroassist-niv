# Backend API Cross-Link — dash (DASH) Frontend

> DASH has **no backend** (BE `services/dash-service/adr/ADR-001`): no `/dash/**` route, no schema, no
> `dash.*` authority. This cross-link therefore maps the DASH **composition** to the **owning modules'**
> backend contracts, and records the two resolved ownership decisions (INT and `entry`). It defines no new
> endpoint and redefines no BE contract (NÃO fazer: redefine BE contracts).

## 1. DASH owns no endpoint

`dash-service` is **not built**. The home overview is composed in the browser from four already-specified
reads, each served by its owning module through the GWY gateway with the caregiver's ACS JWT:

| Overview region | Owning backend contract | Endpoint (owner-served, not called by DASH) | Authority |
|---|---|---|---|
| Day KPIs + recent events | `backend/services/hist-service/contracts/api-contract.md` §2 | `GET /hist/patients/{patientId}/history` | `hist.history.read` |
| Device health | `backend/services/edge-service/contracts/api-contract.md` | `GET /edge/devices/{id}` | `edge.device.read` |
| Alarm / monitoring + routine notices | `backend/services/evnt-service/contracts/api-contract.md` §11 | `GET /evnt/patients/{id}/active-alarm` (polled) | `evnt.event.read` |
| Detection-lapse (OPEN) | `backend/services/evnt-service/adr/ADR-006-detection-lapse-alerting.md` | `GET /evnt/patients/{patientId}/detection-lapses` via EVNT `LapseAlertFacade` (INT-DASH-1) | `evnt.detection-lapse.read` |
| Command catalog | `backend/services/pat-service/contracts/api-contract.md` | `GET /pat/patients/{id}/commands` | `pat.command.read` |

DASH reads these **only** through each module's FE public `index.ts` seam (SPEC-04 §1), never by issuing
HTTP from `libs/dash`.

## 2. Authority union (BE-canonical, D-639)

The DASH permission map (SPEC-05 §2) is exactly the union of the authorities above:
`{ hist.history.read, evnt.event.read, evnt.detection-lapse.read, edge.device.read, pat.command.read }`. These are copied verbatim
from the owning modules' BE authority constants; DASH adds **no** `dash.*` key and invents none ahead of a
(non-existent) BE. Patient identity is a shell/ACS context value (INV-6), already link- and tenant-scoped
server-side — not a DASH authority.

## 3. INT items (FE exports to add in the owning libs — not BE changes)

INT items are **frontend** export requests; they add **no** backend endpoint and change **no** BE authority.

- **INT-DASH-1 (EVNT).** Add an OPEN-detection-lapse read-only signal/VM to `@neuroassist/evnt`'s `index.ts`
  (e.g. `AlarmFacade.openDetectionLapses` + `detectionState`), fed by EVNT's existing detection-lapse read
  (EVNT backend ADR-006; EDGE raises the lapse after the 120 s server window, EDGE backend ADR-005). The FE
  authority is `evnt.detection-lapse.read` (EVNT api-contract). This export is ALREADY PLANNED by the SAFETY-GEST-1
  EVNT FE amendment — `LapseAlertFacade` (FE-EVNT-027/028) — and the EDGE detection fields by FE-EDGE-028/029:
  INT-DASH-1 = consume those (dependency), never a parallel export. DASH does **not** call EVNT's HTTP.
- **INT-DASH-2 (HIST, optional).** Expose `loadedAt` on `PeriodSummaryVM` so DASH can read an upstream
  read-time for HIST freshness instead of tracking its own tick (SPEC-03 §3). Authority unchanged.

These are logged for `/fe-architect-backlog` as cross-module issues against EVNT and HIST respectively.

## 4. `entry` screen ownership (owner = SHELL)

`screens/entry` (`/entry`) is a static brand/login moment with **no operational data** (BE ADR-001
inspection: `writes: (none)`). Resolved ownership (orchestrator default, **revisable**):

- **Owner: the app shell / ACS boundary** — not DASH. The DASH **promote** phase promotes `entry` as a
  **shell route** whose single call-to-action drives the **ACS login flow**, landing on `/home` (SPEC-06
  §4, FE `adr/ADR-005` §5). DASH registers no `entry` route (SPEC-01 §5).
- Revisit trigger: if a shell/ACS module later owns authentication surfaces explicitly, `entry` moves there
  with no change to DASH.

## 5. BE revisit triggers (recorded, not acted on here)

BE ADR-001 keeps `dash-service` revisable: (1) measured clinic-scale fan-out cost, (2) a new requirement for
caregiver-owned preference data (and even then prefer ACS). If triggered, a single `GET /dash/home-overview`
would apply the **exact** fail-safe aggregation of ADR-002, and DASH would read it behind a
`DASH_OVERVIEW_PORT` (`${ACCESS_HTTP_BASE}/dash`, default `http`, flag `dash.bff.enabled`). Not in scope now.
