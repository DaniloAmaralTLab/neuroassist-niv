# Backend API Cross-link — edge (EDGE) Frontend ↔ `edge-service`

> Source of truth for all BE shapes and authorities:
> `../../../../backend/services/edge-service/contracts/api-contract.md`.
> The FE references the BE contract; it never redefines it. This file records the FE↔BE mapping and
> the reconciliation gaps the FE specs carry.

## 1. Endpoint ↔ FE consumer map

The FE dashboard consumes **only** the human device-management endpoints (api-contract §2). The
device-token endpoints are exercised by the edge agent / resource servers, not the dashboard.

| BE endpoint | Verb | Authority | FE Service.method | FE surface |
|---|---|---|---|---|
| `/edge/devices` | POST | `edge.device.enroll` | `EdgeDeviceApiService.enroll` | pairing panel — begin pairing (returns the one-time code) |
| `/edge/devices` | GET | `edge.device.read` | `EdgeDeviceApiService.list` | device read-model seed |
| `/edge/devices/{id}` | GET | `edge.device.read` | `EdgeDeviceApiService.get` | badge, Home card, pairing poll |
| `/edge/devices/{id}/activation` | POST | `edge.device.activate` | `EdgeDeviceApiService.reactivate` | device lifecycle — reactivate |
| `/edge/devices/{id}` | DELETE | `edge.device.deactivate` | `EdgeDeviceApiService.deactivate` | device lifecycle — deactivate |
| `/edge/devices/{id}/pairing` | DELETE | `edge.device.unpair` | `EdgeDeviceApiService.unpair` | device lifecycle — unpair |
| `/edge/devices/{id}/credential` | DELETE | `edge.device.revoke` | `EdgeDeviceApiService.revoke` | device lifecycle — revoke (terminal) |
| `/edge/devices/pair` | POST | `edge.device.pair` (code-authenticated) | **station only — NOT an FE call** | the station claims the code; the dashboard polls `GET /edge/devices/{id}` to `paired` |
| `/edge/heartbeat` | POST | `edge.heartbeat.record` (device token) | `StationLivenessService` (libs/edge, SPEC-06 §5) | **SAFETY-GEST-1:** the Patient-Mode station's single heartbeat sender (NOT the dashboard); carries detection state GEST pushes in-process |
| `/edge/catalog` | GET | `edge.catalog.read` (device token) | — (edge agent) | not an FE concern |
| `/edge/.well-known/jwks.json` | GET | public | — (resource servers) | not an FE concern |
| `/edge/device-tokens/introspect` | POST | service-client | — (resource servers / GWY) | not an FE concern |
| `/edge/health` | GET | public | — (ops / GWY) | not an FE concern |

## 2. Reconciliation gaps (FE specs carry these; BE contract is canonical)

| # | Gap | FE handling |
|---|---|---|
| G-EDGE-1 | Vision authority names `edge.device.view` / `edge.heartbeat.view` differ from BE (`edge.device.read`; no heartbeat-view authority). | FE uses `edge.device.read` for all status reads everywhere (INV-EDGE-7). `edge.heartbeat.record` / `edge.catalog.read` are **device-token** authorities, never dashboard keys (ADR-014). The guard `canViewDeviceGuard` is renamed `canReadDeviceGuard`. |
| G-EDGE-2 | The vision/BA data model exposes `EdgeDevice.version` (shown on Home); the BE api-contract has **no** `version` field (it carries `lifecycleState`, `connectivity`, `lastHeartbeatAt`, `credentialId`, `catalogFetchedAt`). | FE models `version` as explicitly absent (carry-forward `fe-facade:fabricated-null-fields`); the card renders the version line only WHERE the BE supplies it. Vision `status`→BE `connectivity`, vision `lastSyncAt`→BE `lastHeartbeatAt`. Raise a BE follow-up to add `version` if Home must show it. |
| G-EDGE-3 | The vision set the adapter default to `mock` while `edge-service` was unarchitected. | Resolved: the edge-service api-contract now exists, so `edge.providers.ts` defaults to **`http`** (SPEC-04 §2); a providers spec proves the default (`scaffold:mock-adapter-default`). |
| G-EDGE-4 | The FE pairing panel has no single "pair" call: pairing is **enroll (dashboard) + claim (station)**. The vision implied one FE "pair" action. | FE enrolls (`POST /edge/devices`, `edge.device.enroll`), shows the one-time code, then polls `GET /edge/devices/{id}` to `paired`. The claim (`POST /edge/devices/pair`) is the station's, authenticated by `X-Pairing-Code`. `edge.device.pair` is the pairing-intent constant held by the enrolling coordinator (D-639). |
| G-EDGE-5 | EDGE/ACS seam on Screen 07: who owns what. | EDGE owns only the **device-pairing** portion (enroll + claim + status). ACS owns `PatientSession` provision/revoke (`feature-patient-sessions`). They are distinct steps on the same screen (ADR-012 / SEC-001). A patient-session token never carries an `edge.*` authority. |
| G-EDGE-6 | **Detection state (SAFETY-GEST-1, BE ADR-005).** The heartbeat and device read now carry `detectionState` / `detectionStateSince` / `detectionReason` / `engineVersion` / `lastDetectingAt`; `detectionState` is a second liveness axis distinct from `connectivity`. | FE renders detection distinct from connectivity (SPEC-03 §1.1 matrix: online+RUNNING = detecting; online+not-RUNNING = connected-not-detecting+reason; offline = offline). The mapper substitutes `UNKNOWN` WHILE `detectionState` is absent and never fabricates `RUNNING` (BE **INV-EDGE-9**). `libs/edge` is the single `POST /edge/heartbeat` sender (SPEC-06 §5); GEST adds no second sender (INV-GEST-8). `engineVersion` (detection engine) is distinct from the still-absent G-EDGE-2 agent `version`. |

## 3. Error contract

BE `ProblemDetail` `type` slugs are mapped 1:1 in `SPEC-07-error-handling.md` §2. The FE maps by
`type` slug (not HTTP status), preserves `detail` + `correlationId`, and never shows a raw body. The
device-token-path slugs `invalid-pairing-code` and `catalog-unavailable` are not FE dashboard
surfaces (SPEC-07 §2).

## 4. Invariants referenced (declared once in BE; cited here, not redefined)

INV-EDGE-1 (tenant from JWT claim; `X-Tenant-Id` never trusted), INV-EDGE-2 (device token carries no
management/`acs.*`/`pat.*` authority; no cross-actor endpoint), INV-EDGE-3 (pairing code single-use,
hashed, returned once), INV-EDGE-4 (device endpoints require `paired`), INV-EDGE-5 (offline-first
catalog — BE/agent concern), INV-EDGE-6 (revoke is terminal; no reinstatement), INV-EDGE-7 (controller
`@PreAuthorize` strings equal the authority constants; FE decision keys equal them too), INV-EDGE-9
(absent `detectionState` ⇒ `UNKNOWN`, never `RUNNING` — the FE mirrors this, never rendering an absent
state as detecting). INV-GEST-8 (GEST routes liveness through the single EDGE sender; no second heartbeat).
