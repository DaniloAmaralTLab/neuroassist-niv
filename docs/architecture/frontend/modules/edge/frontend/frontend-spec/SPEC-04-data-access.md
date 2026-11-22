# SPEC-04 — Data Access — edge (EDGE) Frontend

> `Component → DeviceFacade (signals) → EDGE_DEVICE_PORT (Http/Mock adapter) → HttpClient via
> access-http-base → edge-service`. The HTTP adapter is the only holder of `HttpClient`; the facade
> exposes `signal<T>` private + `.asReadonly()`. Every call carries the bearer token + correlation id
> via the interceptor; tenant scope is derived server-side from the JWT claim, never from
> `X-Tenant-Id` (api-contract §0.1, INV-EDGE-1). Base path is the **gateway** prefix `/edge`, not
> `/api/v1` (carry-forward `http-adapter:wrong-prefix`). Sources: BE
> `../../../../backend/services/edge-service/contracts/api-contract.md`,
> `frontend/05-state-and-data-flow.md`.

## 1. Master resource table

The FE **caregiver dashboard** consumes **only** the human device-management endpoints
(api-contract §2). The device-token endpoints `/edge/catalog` (§4), `/edge/.well-known/jwks.json`
(§5) and `/edge/device-tokens/introspect` (§6) are exercised by resource servers, never by the
dashboard — they are out of FE scope.

**Exception — `/edge/heartbeat` (§3) is sent by `libs/edge`, not the dashboard (SAFETY-GEST-1).** In the
Patient-Mode **station** runtime (not the caregiver dashboard), `libs/edge` owns the **single**
`POST /edge/heartbeat` sender (the `StationLivenessService` / `StationLivenessPort` — SPEC-06 §5),
authenticated by the `edge.device` identity token (authority `edge.heartbeat.record`), carrying the
detection state GEST pushes in-process. GEST invents no second heartbeat sender (GEST SPEC-06 §2.1,
INV-GEST-8). The wire body for that call is §3.1 below. No other EDGE surface sends a heartbeat.

| Resource | Endpoint (BE-canonical) | Service | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| EdgeDevice | `POST /edge/devices`, `GET /edge/devices`, `GET /edge/devices/{id}`, `POST /edge/devices/{id}/activation`, `DELETE /edge/devices/{id}`, `DELETE /edge/devices/{id}/pairing`, `DELETE /edge/devices/{id}/credential` | `EdgeDeviceApiService` | `DeviceFacade` | enroll, list, get, reactivate, deactivate, unpair, revoke | no |

Cache strategy = read the device on each navigation into a screen that shows it, plus a refresh on
topbar-badge mount (one device per patient, tiny read — `frontend/05 §3`). A `tenant-context` change
invalidates any future EDGE state. Liveness is **pull**: the FE reads the server's heartbeat
projection; it introduces no client-side poll loop or socket unless a later SPEC justifies it, and any
cadence lives server-adjacent (ADR-005). **The FE never claims the pairing code** — `POST
/edge/devices/pair` (§2.5) is the station's call, authenticated by `X-Pairing-Code`; the dashboard
enrolls (§2.1), displays the code, then polls `GET /edge/devices/{id}` until `lifecycleState = paired`.

## 2. Adapter default (carry-forward, Learning ev=7) — HTTP

`edge.providers.ts` MUST default the adapter to **`http`** because `edge-service` now exists (its
api-contract is published). `EdgeDeviceHttpAdapter` is based at `${ACCESS_HTTP_BASE}/edge`;
`EdgeDeviceMockAdapter` serves fixtures in the same wire shape via the same mappers. A providers spec
MUST prove the default is `http`, not mock
(`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`).

> Supersedes the vision (`frontend/04 §8`, `frontend/05 §2`) which set the default to `mock` while
> `edge-service` was unarchitected. That pre-condition is resolved: the edge-service api-contract
> exists, so the default flips to `http` (G-EDGE-3). `MockAdapter` remains available only under an
> explicit mock provider for tests / offline dev.

## 3. Wire records (mirror BE 1:1) and mappers

```ts
// mirror of GET /edge/devices/{id} (api-contract §2.3)
interface EdgeDeviceWire {
  id: string; tenantId: string; patientId: string;
  lifecycleState: 'awaiting_claim' | 'paired' | 'deactivated' | 'revoked';
  connectivity: 'online' | 'offline' | null;      // null WHILE lifecycleState != paired (§2.3)
  lastHeartbeatAt: string | null; pairedAt: string | null;
  detectionState?: 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';  // §2.3 (ADR-005); absent ⇒ map to 'UNKNOWN'
  detectionStateSince: string | null;             // §2.3 — ISO; null before first beat
  detectionReason: 'HIDDEN' | 'CAMERA_DENIED' | 'MODEL_FAILED' | 'LOW_FPS' | null;  // §2.3 — null unless reported
  engineVersion: string | null;                   // §2.3 — detection-engine version (NOT the G-EDGE-2 agent `version`)
  lastDetectingAt: string | null;                 // §2.3 — ISO; last beat that reported RUNNING
  enrolledBy: string; credentialId: string | null;
  catalogFetchedAt: string | null; createdAt: string; updatedAt: string;
  // NOTE: no `version` field in the BE contract (G-EDGE-2) — the mapper models version as absent.
}
// mirror of GET /edge/devices (§2.2) — reduced row (NO detectionReason / engineVersion on list rows)
interface EdgeDeviceRowWire {
  id: string; patientId: string;
  lifecycleState: EdgeDeviceWire['lifecycleState'];
  connectivity: EdgeDeviceWire['connectivity'];
  lastHeartbeatAt: string | null; pairedAt: string | null;
  detectionState?: EdgeDeviceWire['detectionState'];        // §2.2 — absent ⇒ 'UNKNOWN'
  detectionStateSince: string | null;                       // §2.2
  lastDetectingAt: string | null;                           // §2.2
}
// request body of POST /edge/heartbeat (§3.1) — SENT by libs/edge's StationLivenessService only
interface HeartbeatRequestWire {
  deviceId: string;
  detectionState?: 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE';  // OMITTED ⇒ BE records UNKNOWN, never RUNNING (INV-EDGE-9)
  detectionStateSince: string | null;                                   // ISO of the current state
  reason: 'HIDDEN' | 'CAMERA_DENIED' | 'MODEL_FAILED' | 'LOW_FPS' | null;  // optional; wire field is `reason` (not `detectionReason`)
  engineVersion: string | null;
}
// response of POST /edge/heartbeat (§3.1) — may carry a rotated edge.device token
interface HeartbeatResultWire {
  deviceId: string; connectivity: 'online'; detectionState: string;
  refreshedToken?: string;                           // present WHILE within the refresh window (api-contract §3.1, G1)
}
// mirror of POST /edge/devices response (§2.1) — the enroll result that carries the one-time code
interface EnrollResultWire {
  id: string; tenantId: string; patientId: string;
  lifecycleState: 'awaiting_claim'; connectivity: null;
  pairingCode: string; pairingCodeExpiresAt: string;
  enrolledBy: string; createdAt: string;
}
```

- `toEdgeDeviceVM`, `toEdgeDeviceRow`, `toPairingDraft` convert wire → VM (SPEC-03). The mapper maps
  BE `connectivity`→VM `status` and BE `lastHeartbeatAt`→VM `lastSyncAt`, carries `detectionState` /
  `detectionStateSince` / `detectionReason` / `engineVersion` / `lastDetectingAt` through, substitutes
  `'UNKNOWN'` WHILE `detectionState` is absent on the wire, derives the `DeviceStatusVM.detection` axis
  per SPEC-03 §1.1, and never invents `version`.
- Request bodies MUST send every field the BE requires and no more
  (carry-forward `http-adapter:request-body-field-whitelist:new-required-field-dropped`):
  enroll → `{ patientId }`; reactivate/deactivate/unpair/revoke carry no body.

## 4. Operations — semantics

| Operation | Verb · path | Idempotent? | Optimistic? |
|---|---|---|---|
| enroll | `POST /edge/devices` | no | pessimistic (await `201`, show pairing code, enter `pairing`) |
| list | `GET /edge/devices` | n/a (read) | — |
| get | `GET /edge/devices/{id}` | n/a (read) | — (drives pairing poll + badge/card) |
| reactivate | `POST /edge/devices/{id}/activation` | yes (BE §2.4 idempotent on `paired`) | pessimistic |
| deactivate | `DELETE /edge/devices/{id}` | yes (BE §2.6) | pessimistic |
| unpair | `DELETE /edge/devices/{id}/pairing` | yes (BE §2.7, 404 if absent) | pessimistic |
| revoke | `DELETE /edge/devices/{id}/credential` | yes (BE §2.8 idempotent revoke) | pessimistic |

**Pairing is pessimistic:** the panel shows `paired` only after a `GET /edge/devices/{id}` returns
`lifecycleState = paired`; the enroll `201` alone only yields the code + `awaiting_claim` state
(SPEC-03 §2). **Unpair / deactivate / revoke are pessimistic:** removing or killing a detector is
safety-relevant and must not drift — the FE awaits the server, then updates the device, behind an
explicit confirm. **Status reads** hold no write state. A later SPEC may opt a specific action into
optimistic update, documenting the rollback (restore the prior device snapshot, surface via
`ui-feedback`).

## Criterios de aceite (EARS)

- THE SYSTEM SHALL route every EDGE request through `@neuroassist/shared/access-http-base` based at `${ACCESS_HTTP_BASE}/edge` and SHALL NOT call `HttpClient` from any component.
- THE SYSTEM SHALL default the EDGE data adapter to `http` and SHALL use the mock adapter only under an explicit mock provider.
- WHEN the coordinator begins pairing, THE SYSTEM SHALL send `POST /edge/devices` with `{ patientId }` and SHALL display the returned pairing code once.
- WHILE a device is awaiting claim, THE SYSTEM SHALL poll the device read and SHALL mark it paired only when the read returns lifecycleState paired.
- THE SYSTEM SHALL NOT call the device pairing claim endpoint from the dashboard, which is authenticated by the station pairing code.
- WHEN the caregiver confirms an unpair, THE SYSTEM SHALL send `DELETE /edge/devices/{id}/pairing` and await the server response before removing the device.
- WHEN the caregiver confirms a revoke, THE SYSTEM SHALL send `DELETE /edge/devices/{id}/credential` and await the server response before marking the device revoked.
- WHEN a navigation enters an EDGE device surface or the topbar badge mounts, THE SYSTEM SHALL fetch the device read-model and SHALL NOT serve a stale EDGE cache.
- WHEN the active tenant changes via `tenant-context.switchTo`, THE SYSTEM SHALL invalidate any future EDGE state.
- THE SYSTEM SHALL read connectivity from the backend device projection and SHALL NOT infer online or offline from a client-side timer.
- THE SYSTEM SHALL send `POST /edge/heartbeat` only from the `libs/edge` station-liveness sender authenticated by the `edge.device` token and SHALL NOT send a heartbeat from the caregiver dashboard.
- THE SYSTEM SHALL mirror `detectionState`, `detectionStateSince`, `detectionReason`, `engineVersion` and `lastDetectingAt` from the device read and SHALL NOT fabricate a detection value when the backend omits it.
