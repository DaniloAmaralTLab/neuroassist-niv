# PAT — Integration Contracts

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Internal-network only; TLS outside localhost. All intra-project interactions are **sync REST**
> (messaging disabled). EARS guide: `../../../standards/ears-notation.md`.

PAT has **no external third-party systems** in the MVP. This document pins the
intra-project synchronous contracts: the two outbound calls PAT makes (ACS, HIST) and the
inbound read contracts PAT publishes to downstream modules (GEST, EDGE, EVNT, DASH, CONV).

---

## 1. Outbound — PAT → ACS (`acs-service`)

PAT is a pure **ACS resource server** (A1): it validates ACS-issued JWTs and never issues
tokens.

| Operation | Target | Auth | Purpose | Fallback |
|---|---|---|---|---|
| Fetch JWKS | `GET {acs.baseUrl}/acs/.well-known/jwks.json` | public | verify ACS JWT signatures | cache last-known key set; `401` if no key available |
| Blacklist-aware validation | `POST {acs.baseUrl}/acs/auth/introspect` | service client | revocation-aware check on **sensitive** reads/writes | on ACS outage, signature-valid unexpired tokens still pass; revocation check is best-effort and logged |

- Resolver: `acs-service` via REG (Eureka); `acs.base-url` property for the direct URL.
- **Standard validation** (signature + `exp` + authorities) is local via the cached JWKS on
  every request. **Introspection** is reserved for sensitive operations (catalog writes,
  patient deactivation) to honor revocation without a per-request round trip on reads.

EARS:

- THE SYSTEM SHALL verify every inbound JWT against the ACS JWKS before any authority check.
- WHERE a state-changing PAT operation is invoked, THE SYSTEM SHALL additionally call ACS `/acs/auth/introspect` and SHALL reject the request `401` if the token's `jti` is blacklisted.
- IF the ACS JWKS endpoint is unreachable, THEN THE SYSTEM SHALL use the last cached key set and SHALL NOT fail open to unsigned tokens.

## 2. Outbound — PAT → HIST (`hist-service`)

Audited domain actions (`PatientRegistered`, `CommandCalibrated`, …) over sync REST — see
`event-contracts.md` §1 for the envelope and the failure policy.

| Operation | Target | Auth | Purpose |
|---|---|---|---|
| Record audit | `POST {hist.baseUrl}/audit` | service client carrying `hist.audit.record`, `X-Correlation-Id` echoed | append-only audit of every PAT domain action |

- Resolver: `hist-service` via REG (`lb://hist-service/hist`); `hist.base-url` / `HIST_BASE_URL` for the direct URL and **MUST include the `/hist` segment** (dev `http://localhost:8083/hist`) so the literal `POST {hist.baseUrl}/audit` reaches `/hist/audit` (D-640). The service-client JWT **MUST carry `hist.audit.record`** (hist-service api-contract §1). Config/token tracked by **INT-PAT-006**.
- Failure policy resolved by HIST ADR-005 (`event-contracts.md` §1): `PatientDeactivated` is commit+durable-retry; all other PAT facts are hard-502 (`502 audit-unavailable`). Durable retry tracked by **PAT-026**.

## 3. Outbound — PAT → MIG (`neuroassist-niv-migrations`)

Not a runtime call. PAT **authors** Flyway scripts (`data-model.md` §5) that MIG applies
centrally to `neuroassist_global` and each `t_<tenantId>` schema. Reserved range `V0020+`
(G1 resolved in `data-model.md` §5).

---

## 4. Inbound — downstream modules → PAT (published read contracts)

PAT is the source of truth for the command catalog and the patient registry. Downstream
modules **pull** (ADR-004); PAT never pushes. All reads are the endpoints in
`api-contract.md`; this table is the consumer-facing summary.

| Consumer | Endpoint | Authority | Identity | Purpose |
|---|---|---|---|---|
| **GEST** (detection) | `GET /pat/patients/{patientId}/commands?status=active` | `pat.command.read` | detection **service client** (ADR-004 — never the patient-session token) | thresholds (primitives, window, sensitivity) to detect |
| **EDGE** (device agent) | `GET /pat/patients/{patientId}/commands?status=active` (+ `If-None-Match`) | `pat.command.read` | detection **service client** | load catalog onto the local agent; `304` on no change (§3.3.1) |
| | `GET /pat/gesture-types` (+ `If-None-Match`) | `pat.gesture-type.read` | service client | resolve/display primitive vocabulary |
| **EVNT** (events/alarms) | `GET /pat/commands/{commandId}` | `pat.command.read` | service client | `urgency` + `label` by command id to classify/craft the alarm |
| **DASH** (dashboard) | `GET /pat/patients`, `GET /pat/patients/{id}/commands`, `GET /pat/gesture-types` | `pat.patient.read`, `pat.command.read`, `pat.gesture-type.read` | **caregiver token** | review and calibration UI |
| **CONV** (speech tree) | `GET /pat/patients/{patientId}` | `pat.patient.read` | caregiver token or service client | associate communication content with the patient |

EARS — catalog distribution (ADR-004, G3):

- WHEN a detection module (GEST/EDGE) reads the catalog, THE SYSTEM SHALL authorize it by a `pat.command.read` authority held by a **service-client** identity and SHALL reject a `patient-session` token `403` (INV-PAT-7, ACS INV-3 preserved — the patient session never gains a `pat.*` authority).
- THE SYSTEM SHALL return an `ETag` on `GET .../commands` and `GET /pat/gesture-types`, and SHALL respond `304 Not Modified` to a matching `If-None-Match`, so the edge refreshes only on change (ADR-004).
- THE SYSTEM SHALL expose the active catalog with primitive codes resolved (`code`, `displayName`), so a detection agent loads thresholds without a second call.

> **Service-client identity (ADR-004 resolved):** the detection-side *service* (GEST/EDGE
> backend) presents an ACS-issued token whose `actorType` is a service/`platform` client and
> whose `authorities` include `pat.command.read` (and `pat.gesture-type.read`). This is the
> analogue of ACS's service-client introspection path. The exact ACS mechanism that mints a
> service-client token (client-credentials vs a provisioned service principal) is an ACS
> concern; PAT only requires that such a token carries `pat.command.read` and is **not** a
> `patient-session` token. TODO[architect]: confirm the service-client token-minting path
> with ACS at backlog/scaffold.

---

## 5. Resilience summary

| Dependency | Failure mode | PAT behavior |
|---|---|---|
| ACS JWKS | unreachable | use cached keys; never accept unsigned tokens |
| ACS introspect | unreachable | standard validation still applies; revocation check best-effort + logged |
| HIST | unreachable | hard-502 facts: `502 audit-unavailable` on write path (prod); `PatientDeactivated`: commit locally + enqueue idempotent durable retry (ADR-005); log-only degrade in dev profile |
| REG / Eureka | unreachable | fall back to configured `*.base-url` direct URLs |
