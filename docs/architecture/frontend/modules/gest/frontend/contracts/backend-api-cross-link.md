# Backend API Cross-link — gest (GEST) Frontend ↔ gest-service / evnt-service / edge-service

> Sources of truth (the FE references, never redefines):
> - `../../../../../backend/services/gest-service/contracts/api-contract.md` (support-check, engines)
> - `../../../../../backend/services/evnt-service/contracts/api-contract.md` (gesture-report ingest)
> - `../../../../../backend/services/edge-service/contracts/api-contract.md` (offline catalog, device identity)
> GEST's network boundary is **three device-token calls**. This file records the endpoint ↔ identity
> mapping, the authority reconciliation, and the gaps the FE specs carry.

## 1. Endpoint ↔ identity ↔ FE consumer map

| BE endpoint | Verb | Owner | Authority | Identity | FE Service.method | FE surface |
|---|---|---|---|---|---|---|
| `/evnt/gesture-reports` | POST | EVNT §2.1 | `evnt.event.ingest` | **`edge.device`** | `GestureReportApiService.report` | the ONE write — on recognition (durable queue) |
| `/gest/capabilities/support-check` | POST | GEST §3.3 | `gest.capability.read` | **`edge.device`** | `CapabilityApiService.checkSupport` | the detectable gate at catalog-load (INV-GEST-7) |
| `/gest/engines` | GET | GEST §2.1 | `gest.engine.read` | **`edge.device`** | `CapabilityApiService.listEngines` | resolve/display the running `engineVersion` |
| `/edge/catalog` | GET | EDGE §4.1 | `edge.catalog.read` | **`edge.device`** | `EdgeCatalogApiService.read` | the active command set (offline cache) |

**Every** call carries the station's `edge.device` token via the **device-token interceptor variant**
of `access-http-base` — **not** the caregiver session bearer. `deviceId`/`patientId`/`tenantId` are
taken by the backends from the token claims, never from a body (EVNT INV-EVNT-6).

### Endpoints GEST does NOT call

- `POST /gest/capabilities`, `POST /gest/engines`, `.../deprecate`, `.../retire` — admin writes
  (caregiver authority); GEST-FE is read-only against the registry.
- `POST /edge/heartbeat` is sent by **`libs/edge`'s single station-liveness sender** (it holds the
  `edge.device` token + refresh), not by GEST. Since SAFETY-GEST-1 the beat carries the station's
  `detectionState` (`RUNNING|PAUSED|DEGRADED|UNAVAILABLE` + `reason` + `engineVersion`, EDGE §3.1);
  GEST only **publishes** its mapped state (SPEC-03 §7) into that sender via `StationLivenessPort`
  (SPEC-06 §2.1) — an in-process call, **not** a fourth GEST egress. Two heartbeat senders are
  explicitly avoided (INV-GEST-8).
- `/evnt` caregiver read/confirm/feedback/subscription paths — those are EVNT-FE / DASH, not GEST.
- GEST-FE never calls PAT directly at runtime (catalog comes from EDGE's cache — ADR-005).

## 2. Authority reconciliation (vision → BE; BE is canonical)

| # | Gap | FE handling |
|---|---|---|
| G-GEST-1 | The vision named guard authorities `gest.runtime.read`, `gest.runtime.control`, `gest.diagnostics.read` (`frontend/02 §3` path C, `frontend/04 §7`, `frontend/05 §6`). **None exist in the backend** (GEST api-contract §1.1 declares only `gest.engine.*` / `gest.capability.*`). | **DROPPED.** The runtime + on-station status are gated by the **station identity** (`stationIdentityGuard`, the `edge.device` token), not a caregiver authority. There is no BE `gest.runtime.*` / `gest.diagnostics.*` resource. WHERE a future caregiver screen is added it MUST use `gest.capability.read` / `gest.engine.read` exactly (D-639). (SPEC-01 §2, SPEC-05 §2.) |
| G-GEST-2 (INT-GEST-ACS-1, **OPEN**) | The `edge.device` token today is minted with `["edge.heartbeat.record","edge.catalog.read"]` (+ EVNT gesture-report right, EDGE §5/G5). The station's GEST reads need `gest.capability.read` + `gest.engine.read`. | FE handles the gate honestly: WHILE the token lacks `gest.capability.read`, support-check returns `403` and the FE marks every command's gate **unverified**, never silently detectable (SPEC-07 §3). **INT issue handed to ACS/EDGE** — add both authorities to the `edge.device` token set. GEST owns no minting. |
| G-GEST-3 | The vision set the adapter default while `gest-service` BE was "not yet architected" (doc 06 G2). | **Resolved:** `gest-service` (support-check) and `evnt-service` (report) both exist → `gest.providers.ts` defaults to **`http`**; a providers spec proves it (`scaffold:mock-adapter-default`). (SPEC-04 §2.) |
| G-GEST-4 (INT-GEST-PAT-1, **OPEN**) | The compound-gesture **inter-primitive window** has no owner field: PAT's `min/maxGestureDurationMs` is a duration, not the inter-primitive gap (handoff M1 R2 / BE integration-contracts §4). | FE reads `min/maxGestureDurationMs` from EDGE's catalog and enforces the window as specified; the distinct `compoundWindowMs` is a **PAT** follow-up. The FE does not invent a value — it uses the duration bounds and records the gap. |
| G-GEST-5 | Supported-primitive ⇄ `GestureType` mapping GEST must publish for PAT's "not yet detectable" marker is unspecified (doc 06 G5). | The FE consumes `support-check` per `code` (GEST §3.3) and computes `detectable` station-side (AND over a compound's primitives); publishing a FE-owned mapping table is **not** needed — GEST-service's registry is the source. |
| SAFETY-GEST-1 (**CLOSED by design**, user decision 2026-11-20) | EDGE connectivity ≠ "detection actively running"; a backgrounded station may appear online while degraded, or be suspended. | **Resolved:** the EDGE heartbeat now carries `detectionState` (EDGE ADR-005 / EVNT ADR-006); the station runtime is its source (SPEC-03 §7), reports an immediate beat on every transition (SPEC-06 §3.1), and EDGE raises a lapse to EVNT after 120 s of non-`RUNNING`/silence → caregivers alerted/escalated. Residual honest hole: a powered-off/suspended phone cannot emit `PAUSED`, but the stopped heartbeat still trips the lapse (SPEC-09 §4). |

## 3. Error contract

BE `ProblemDetail` `type` slugs across the three services are mapped in `SPEC-07-error-handling.md`
(EVNT §2, GEST §3, EDGE §4). The FE maps by `type` slug (not HTTP status), preserves
`detail` + `correlationId`, and never shows a raw body. `401`/`403` on any device-token call → the
blocking **station-unpaired** state (re-pair in EDGE); the report queue stops, never loops a dead token.

## 4. Invariants referenced (declared once; cited here, not redefined)

- **GEST FE (doc 03 §5):** INV-GEST-1 (exactly-once; `reportId` reused), INV-GEST-2 (no partial
  compound), INV-GEST-3 (threshold honours sensitivity), INV-GEST-4 (privacy — no frame/landmark
  egress), INV-GEST-5 (`occurredAt` is capture time; `>24h` expired, never re-stamped), INV-GEST-6
  (honest detection state), INV-GEST-7 (detectable gate), INV-GEST-8 (honest upstream reporting —
  `detectionState` on the EDGE heartbeat; SAFETY-GEST-1).
- **EVNT:** INV-EVNT-4 (`(deviceId, reportId)` idempotency), INV-EVNT-6 (device id/patient/tenant from
  token claims, not body).
- **EDGE:** INV-EDGE-2 (device token carries no management authority), INV-EDGE-4 (device endpoints
  require `paired`), INV-EDGE-5 (offline-first catalog).
- **GEST BE:** INV-GEST-3/4 (global, non-PII, advisory registry; GEST BE §1.2 station-auth decision).
