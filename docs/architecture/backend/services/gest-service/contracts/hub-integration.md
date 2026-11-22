# GEST — Hub Integration

> Service: `gest-service` · Module **GEST** · Project: NeuroAssist NIV
> Transport: synchronous REST only (messaging disabled). GEST calls **ACS, PAT, HIST** and is
> **read-consumed** by PAT / DASH / the station. EARS guide: `../../../standards/ears-notation.md`.

## 1. ACS — identity (required)

| Concern | Detail |
|---|---|
| JWKS | GEST is an ACS resource server; it validates JWKS-trusted JWTs at `${ACS_JWKS_URI}` (e.g. `http://localhost:8081/acs/.well-known/jwks.json`). It mints nothing. |
| Introspection | On **write** paths only, GEST calls `POST /acs/auth/introspect` to reject revoked `jti`. Reads are advisory global data and are **not** revocation-sensitive. |
| Feign client | `AcsClient` (`url_prop: acs.base-url`), ports `TokenValidationPort`, `AcsIntrospectionPort`. |

EARS:

- WHEN GEST receives a write request, THE SYSTEM SHALL validate the token signature via JWKS and SHALL introspect the `jti` with ACS; IF the `jti` is revoked, THEN THE SYSTEM SHALL respond `401`.

## 2. PAT — gesture-type vocabulary (required at write time)

| Concern | Detail |
|---|---|
| Call | `GET /pat/gesture-types` (read-only) to confirm a `gestureTypeCode` exists before a capability declare (INV-GEST-1). |
| When | **Declare path only** (`POST /gest/capabilities`). **Never** on the read / `support-check` hot path. |
| Fallback | Fail **closed**: `503 pat-vocabulary-unavailable` (+ `Retry-After`) if PAT is unreachable at declare (api-contract §3.4). An unvalidated code must never enter the registry. |
| Feign client | `PatGestureTypeClient` (`url_prop: pat.base-url`, e.g. `http://localhost:8082`), port `GestureVocabularyPort`. |

EARS:

- WHEN an admin declares a capability, THE SYSTEM SHALL confirm the `gestureTypeCode` via `GET /pat/gesture-types`; IF absent, THEN THE SYSTEM SHALL respond `400 gesture-type-code-unknown`.
- THE SYSTEM SHALL NOT call PAT on any read or `support-check` request (reads are served purely from GEST's global store).

## 3. HIST — audit sink (required)

| Concern | Detail |
|---|---|
| Call | Each GEST write posts the shared audit envelope (`event-contracts.md` §1) to HIST at `POST {hist.baseUrl}/audit`; `hist.base-url` / `HIST_BASE_URL` **MUST include the `/hist` segment** (dev `http://localhost:8083/hist`, D-640) and the service-client JWT **MUST carry `hist.audit.record`** (INT-GEST-ACS-002). |
| Policy | **All four GEST facts are hard-502** under HIST ADR-005 (`../../hist-service/adr/ADR-005-audit-write-failure-policy.md`; fail-closed within the request): if HIST fails, the registry mutation is rolled back and the client receives `502 audit-unavailable` — a declaration that cannot be audited must not persist. No best-effort/durable-retry degrade (GEST has no access-ending or safety facts). |
| Feign client | `HistAuditClient` (`url_prop: hist.base-url`), port `HistAuditPort`. |

EARS:

- WHEN a GEST write succeeds in the domain layer, THE SYSTEM SHALL record the audit fact to HIST in the same transaction; IF HIST is unavailable, THEN THE SYSTEM SHALL roll back and respond `502 audit-unavailable` (hard-502, HIST ADR-005).

## 4. Consumers of GEST (no dependency back)

| Consumer | Reads | Purpose |
|---|---|---|
| **Station** (`gest-ui`, `edge.device` token) | `POST /gest/capabilities/support-check` (primary), `GET /gest/capabilities?engineVersion=` | the "detectable" gate (INV-GEST-7) at catalog-load |
| **PAT / DASH** (caregiver JWT / service-client) | `GET /gest/capabilities`, `support-check` | surface INV-PAT-6 "not yet detectable" to the caregiver (INT-GEST-PAT-2) |

GEST **does not** call PAT/DASH/EDGE/EVNT back; the detection → event path (`POST /evnt/gesture-reports`)
bypasses GEST entirely. EDGE and EVNT have **no dependency in either direction** with GEST.
