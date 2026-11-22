# SPEC-04 — Data Access — acs (ACS) Frontend

> `Component → Facade (signals) → <Resource>ApiService (HttpClient via access-http-base) → acs-service`.
> API services are the only holders of `HttpClient`; facades expose `signal<T>` private +
> `.asReadonly()`. Every call carries `X-Tenant-Id` via the interceptor (derived from the JWT,
> never from the request — api-contract §0.1). Base path is the **gateway** prefix `/acs`, not
> `/api/v1` (carry-forward `http-adapter:wrong-prefix`). Sources: BE
> `../../../../backend/services/acs-service/contracts/api-contract.md`,
> `frontend/05-state-and-data-flow.md`.

## 1. Master resource table

| Resource | Endpoint (BE-canonical) | Service | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| Caregiver | `POST /acs/caregivers`, `DELETE /acs/caregivers/{id}`, `GET /acs/caregivers/me`, `GET /acs/caregivers/{id}/links` | `CaregiverApiService` | `CaregiverFacade` | register, deactivate, me, links, ~~list~~ (pending-BE, G3) | no |
| PatientSession | `POST /acs/patient-sessions`, `DELETE /acs/patient-sessions/{id}`, `GET /acs/patient-sessions/{id}` | `PatientSessionApiService` | `PatientSessionFacade` | provision, revoke, get | no |
| PatientLink | `POST /acs/caregivers/{id}/links`, `DELETE /acs/caregivers/{id}/links/{patientId}` | `CaregiverApiService` | `CaregiverFacade` | link, unlink | no |
| TenantAdmin | `POST /acs/ops/tenants` | `TenantAdminApiService` | `TenantAdminFacade` | onboard | no |

Cache strategy = call the API on each navigation (v1, tiny pilot volume; `frontend/05 §3`).
`tenant-context.switchTo(...)` invalidates any future ACS cache (bootstrap-flow rule).

## 2. Adapter default (carry-forward, Learning ev=7)

`acs.providers.ts` MUST default the adapter to **`http`** because `acs-service` exists.
`HttpAdapter` is based at `${ACCESS_HTTP_BASE}/acs`; `MockAdapter` serves fixtures in the same
wire shape via the same mappers. A providers spec MUST prove the default is `http`, not mock
(`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`).

## 3. Wire records (mirror BE 1:1) and mappers

```ts
// mirror of POST /acs/caregivers response
interface CaregiverWire { id: string; tenantId: string; username: string;
                          role: 'caregiver'|'clinic_coordinator'; status: 'active'|'deactivated'; }
interface PatientLinkWire { patientId: string; }
interface PatientSessionWire { id: string; patientId: string; deviceId: string;
                               status: 'active'|'revoked'; provisionedBy: string;
                               revokedBy: string | null; createdAt: string; revokedAt: string | null; }
interface TenantWire { id: string; type: 'family'|'clinic'; name: string; }
```

- Request bodies MUST send every field the BE requires — the mapper must not drop a newly-required
  field (carry-forward `http-adapter:request-body-field-whitelist:new-required-field-dropped`):
  register → `{ username, password, role }`; provision → `{ patientId, deviceId }`;
  onboard → `{ type, name }`.
- `toCaregiverRow`, `toPatientSessionRow`, `toTenantAdmin` convert wire → VM (SPEC-03 §5).

## 4. Operations — semantics

| Operation | Verb · path | Idempotent? | Optimistic? |
|---|---|---|---|
| register | `POST /acs/caregivers` | no | pessimistic (await 201, append row) |
| deactivate | `DELETE /acs/caregivers/{id}` | yes (soft) | pessimistic |
| provision | `POST /acs/patient-sessions` | no | pessimistic (await 201, prepend active) |
| revoke | `DELETE /acs/patient-sessions/{id}` | yes (BE idempotent, api-contract §4.2) | pessimistic by default (SEC-001); optimistic opt-in with rollback below |
| link / unlink | `POST`/`DELETE .../links` | link 409 if exists; unlink 404 if absent | pessimistic |
| onboard | `POST /acs/ops/tenants` | no | pessimistic |

**Optimistic revoke (opt-in only):** on click mark the row `revoked`, then reconcile with the
server. On error restore the prior `active` status and surface the error via `ui-feedback`. Because
SEC-001 requires revocation to be reliably immediate, the **default is pessimistic** (await the
server blacklist confirmation). Provision and register are always pessimistic.

## Criterios de aceite (EARS)

- THE SYSTEM SHALL route every ACS request through `@neuroassist/shared/access-http-base` based at `${ACCESS_HTTP_BASE}/acs` and SHALL NOT call `HttpClient` from any component.
- THE SYSTEM SHALL default the ACS data adapter to `http` and SHALL use `MockAdapter` only under an explicit mock provider.
- WHEN the caregiver confirms a revoke, THE SYSTEM SHALL send `DELETE /acs/patient-sessions/{id}` and await the server response before marking the row `revoked`.
- WHERE a SPEC opts into optimistic revoke, THE SYSTEM SHALL mark the row `revoked` on click and IF the server rejects the revoke, THEN THE SYSTEM SHALL restore the prior `active` status and surface the error.
- WHEN the caregiver submits the register form, THE SYSTEM SHALL send `{ username, password, role }` and SHALL NOT drop any required field.
- WHEN the caregiver provisions a session, THE SYSTEM SHALL send `{ patientId, deviceId }` to `POST /acs/patient-sessions`.
- WHEN a navigation enters the caregiver or patient-session surface, THE SYSTEM SHALL fetch fresh data and SHALL NOT serve a stale ACS cache.
- WHEN the active tenant changes via `tenant-context.switchTo`, THE SYSTEM SHALL invalidate any future ACS cache.
