## [FE-EDGE-007] EdgeDeviceApiService — enroll, list, get, reactivate, deactivate, unpair, revoke

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeDeviceApiService` implements `EDGE_DEVICE_PORT` with all 7 operations against `/edge/devices`, each carrying the bearer token via the access-http-base interceptor and returning the wire record types defined in FE-EDGE-008.

**Context / Problem statement:**
- SPEC-04 §1 defines the resource table; §4 defines the semantics (pessimistic writes, no optimistic updates).
- Tenant scope is derived server-side from the JWT claim — NEVER from an `X-Tenant-Id` header (INV-EDGE-1).
- The dashboard NEVER calls `/edge/devices/pair` (station-side), `/edge/heartbeat`, `/edge/catalog`, or the JWKS/introspect endpoints — those are out of FE scope (SPEC-04 §1).
- Request body for `enroll` is `{ patientId }` only — carry-forward `http-adapter:request-body-field-whitelist` warns against adding extra fields.
- Bloqueia: FE-EDGE-009

**Approach (execution path):**
1. Inject `HttpClient` from `@neuroassist/shared/access-http-base` (not from Angular's root).
2. Implement `enroll(patientId)` → `POST /edge/devices` body `{ patientId }`, returns `EnrollResultWire`.
3. Implement `list(patientId?)` → `GET /edge/devices`, returns `EdgeDeviceRowWire[]`.
4. Implement `get(deviceId)` → `GET /edge/devices/{id}`, returns `EdgeDeviceWire`.
5. Implement `reactivate(deviceId)` → `POST /edge/devices/{id}/activation` (no body), returns `EdgeDeviceWire`.
6. Implement `deactivate(deviceId)` → `DELETE /edge/devices/{id}` (no body), returns `EdgeDeviceWire`.
7. Implement `unpair(deviceId)` → `DELETE /edge/devices/{id}/pairing` (no body), returns `void`.
8. Implement `revoke(deviceId)` → `DELETE /edge/devices/{id}/credential` (no body), returns `void`.
9. Pipe each response through the error-normalize interceptor (SPEC-07 §1) — no manual `.catch` per method.

**Non-goals:**
- Do not add `X-Tenant-Id` header (INV-EDGE-1).
- Do not call `/edge/devices/pair` (station-only endpoint).
- No auto-retry on mutations (SPEC-07 §4).

**Layer(s):**
frontend / Data access — `libs/edge/data-access/src/lib/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§1, §3, §4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Data access lib**
- 🔲 `libs/edge/data-access/src/lib/edge-device-api.service.ts` (all 7 operations)

**Tests**
- 🔲 `npx nx test edge-data-access` PASS
- 🔲 `npx nx lint edge-data-access` PASS

**Milestone:**
Wave 2 / P2 Data Access

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P2

**Acceptance criteria:**
- `enroll` sends `POST /edge/devices` with body `{ patientId }` and no extra fields.
- None of the 7 methods calls `HttpClient` with `/api/v1` prefix — base path is `/edge`.
- `revoke` and `unpair` send no request body.
- None of the 7 methods adds `X-Tenant-Id`.
- `/edge/devices/pair`, `/edge/heartbeat`, `/edge/catalog` endpoints do NOT appear in the service.
- `npx nx test edge-data-access` PASS

**Dependencies:**
- FE-EDGE-005 (HTTP adapter and EDGE_DEVICE_PORT token)
- FE-EDGE-008 (wire types must exist before service is typed)

**Data impact:**
Nenhum

**API / Contract impact:**
- Implements api-contract §2.1–§2.8; excludes §3–§6 (device-token paths)

**Testing / Evidence required:**
- HttpClientTestingModule intercepted calls verify path and body for all 7 operations.

**Risks / Notes:**
- `deactivate` uses `DELETE /edge/devices/{id}` (not `/deactivation`) — verify against api-contract §2.6 to avoid a path typo.
