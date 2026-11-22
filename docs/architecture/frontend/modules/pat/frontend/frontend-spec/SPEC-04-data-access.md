# SPEC-04 — Data Access — pat (PAT) Frontend

> `Component → Facade (signals) → <X>_PORT (adapter) → HttpClient via access-http-base → pat-service`.
> Adapters are the only holders of `HttpClient`; facades expose `signal<T>` private + `.asReadonly()`.
> Every call carries the bearer token and an `X-Correlation-Id` via the interceptor; tenant context is
> derived server-side from the JWT `tenantId` claim and PAT never sends `X-Tenant-Id` as authority
> (api-contract §0.1, INV-PAT-1). Base path is the **gateway** prefix `/pat`, not `/api/v1`
> (carry-forward `http-adapter:wrong-prefix`). Sources: BE
> `../../../../../backend/services/pat-service/contracts/api-contract.md`,
> `frontend/05-state-and-data-flow.md`.

## 1. Master resource table

| Resource | Endpoint (BE-canonical) | Service | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| Patient | `POST /pat/patients`, `GET /pat/patients`, `GET /pat/patients/{id}` | `PatientHttpAdapter` (`PATIENT_PORT`) | `PatientFacade` | register, list, get | no |
| Command | `POST /pat/patients/{patientId}/commands`, `GET /pat/patients/{patientId}/commands`, `GET /pat/commands/{id}`, `PATCH /pat/commands/{id}`, `DELETE /pat/commands/{id}` | `CommandHttpAdapter` (`COMMAND_PORT`) | `CommandFacade` | listByPatient, get, create, calibrate, retire | no |
| GestureType | `GET /pat/gesture-types`, `GET /pat/gesture-types/{id}`, `POST /pat/gesture-types` | `GestureTypeHttpAdapter` (`GESTURE_TYPE_PORT`) | `GestureTypeFacade` | list, get, register | session-lived |

Cache strategy = call the API on each navigation into the catalog (v1, tiny pilot volume; `frontend/05`
§3). Gesture types are fetched alongside the catalog and kept in the facade for the editor session
only. A `tenant-context.switchTo(...)` invalidates any future PAT state. The BE offers `ETag` /
`If-None-Match` → `304` conditional refresh on the two catalog reads (api-contract §3.3.1, ADR-004);
PAT FE v1 does **not** consume it (no cache to validate) — it is reserved for the edge/detection
clients and for a later PAT cache SPEC (gap G4).

## 2. Adapter default (carry-forward, Learning ev=7)

`pat.providers.ts` MUST default the adapter to **`http`** because `pat-service` exists. The
`HttpAdapter`s are based at `${ACCESS_HTTP_BASE}/pat`; each `MockAdapter` serves fixtures in the same
wire shape via the same mappers. A providers spec MUST prove the default resolves to the HTTP adapter,
not mock (`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`, 7 prior occurrences:
INTG, JRNY, SALE, CAMP, MENT, …).

## 3. Wire records (mirror BE 1:1) and mappers

```ts
// mirror of GET/POST /pat/patients (api-contract §1)
interface PatientWire { id: string; tenantId: string; label: string;
                        deviceId: string | null; status: 'active' | 'inactive';
                        createdBy: string; createdAt: string; updatedAt?: string; }

// mirror of the resolved gesture primitive inside a command read (§2.2/§2.4)
interface GesturePrimitiveWire { id: string; code: string; displayName: string; }

// mirror of GET /pat/.../commands + PATCH /pat/commands/{id} (§2.2/§2.4 shape)
interface CommandWire { id: string; patientId: string; tenantId?: string; label: string;
                        urgency: 'emergency' | 'routine'; sensitivity: 'low' | 'medium' | 'high';
                        primaryPrimitive: GesturePrimitiveWire;
                        secondaryPrimitive: GesturePrimitiveWire | null;
                        minGestureTimeMs: number; maxGestureTimeMs: number;
                        status: 'active' | 'retired';
                        createdBy?: string; createdAt?: string; updatedAt?: string; }

// mirror of GET /pat/gesture-types item (§3.1)
interface GestureTypeWire { id: string; code: string; displayName: string; description?: string; }
```

- Request bodies MUST send every field the BE requires and send primitives as **ids**
  (carry-forward `http-adapter:request-body-field-whitelist:new-required-field-dropped`):
  - register patient → `{ label, deviceId? }`
  - create command → `{ label, urgency, sensitivity, primaryPrimitive, secondaryPrimitive, minGestureTimeMs, maxGestureTimeMs }`
  - calibrate command (PATCH, partial) → any subset of the create fields
  - register gesture-type → `{ code, displayName, description }`
- `toPatient`, `toCommandRow`, `toGestureType` convert wire → VM (SPEC-03 §4). `gestureDescription` is
  derived in the mapper from `primaryPrimitive.displayName` (+ `' + ' + secondaryPrimitive.displayName`).

## 4. Operations — semantics

| Operation | Verb · path | Idempotent? | Optimistic? |
|---|---|---|---|
| register patient | `POST /pat/patients` | no | pessimistic (await 201, advance wizard) |
| list patients | `GET /pat/patients` | yes (read) | n/a |
| get patient | `GET /pat/patients/{id}` | yes (read) | n/a (breadcrumb name) |
| list catalog | `GET /pat/patients/{patientId}/commands` | yes (read) | n/a (fetch on navigation) |
| get command | `GET /pat/commands/{id}` | yes (read) | n/a |
| create command | `POST /pat/patients/{patientId}/commands` | no | pessimistic (await 201, prepend row) |
| calibrate command | `PATCH /pat/commands/{id}` | no | pessimistic (await 200, replace row) |
| retire command | `DELETE /pat/commands/{id}` | yes (BE §2.5 idempotent) | pessimistic (await 204, drop from active list) |
| list gesture-types | `GET /pat/gesture-types` | yes (read) | n/a |
| register gesture-type | `POST /pat/gesture-types` | no | pessimistic (await 201, select in open slot) |

Create / calibrate / retire and gesture-type registration are **pessimistic by default**: catalog
correctness feeds the detection engine (GEST) and must not drift (`frontend/05` §4). A later SPEC may
opt a specific action into optimistic update; it must then document the rollback (restore the prior
list snapshot and surface the error via `ui-feedback`). Soft-deactivate / reactivate of a **patient**
(`DELETE /pat/patients/{id}`, `POST /pat/patients/{id}/activation`) have no prototype screen and are
out of the MVP FE surface (gap G2) — the authorities exist in the BE contract but PAT FE renders no
control for them.

## Criterios de aceite (EARS)

- THE SYSTEM SHALL route every PAT request through `@neuroassist/shared/access-http-base` based at `${ACCESS_HTTP_BASE}/pat` and SHALL NOT call `HttpClient` from any component.
- THE SYSTEM SHALL default the PAT data adapter to `http` and SHALL use a `MockAdapter` only under an explicit mock provider.
- WHEN a navigation enters the command catalog, THE SYSTEM SHALL fetch the patient's commands and the gesture-type list fresh and SHALL NOT serve a stale PAT cache.
- WHEN the caregiver saves a new command, THE SYSTEM SHALL send `{ label, urgency, sensitivity, primaryPrimitive, secondaryPrimitive, minGestureTimeMs, maxGestureTimeMs }` with primitives as gesture-type ids and SHALL NOT drop any required field.
- WHEN the caregiver saves a calibration edit, THE SYSTEM SHALL send a PATCH with the changed fields and await the server response before replacing the command row.
- WHEN the caregiver retires a command, THE SYSTEM SHALL send `DELETE /pat/commands/{id}`, await the `204`, and drop the command from the active catalog list.
- WHEN the caregiver registers a gesture type, THE SYSTEM SHALL send `{ code, displayName, description }` to `POST /pat/gesture-types` and select the returned type in the open gesture slot.
- WHEN the active tenant changes via `tenant-context.switchTo`, THE SYSTEM SHALL invalidate any future PAT catalog state.
