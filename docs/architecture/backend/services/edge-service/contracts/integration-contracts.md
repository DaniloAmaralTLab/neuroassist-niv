# EDGE — Integration Contracts

> Service: `edge-service` · Module **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> Internal-network only; TLS outside localhost. All intra-project interactions are **sync REST**
> (messaging disabled). EARS guide: `../../../standards/ears-notation.md`.

EDGE has **no external third-party systems** in the MVP. This document pins the intra-project
synchronous contracts: the outbound calls EDGE makes (PAT catalog pull, ACS JWKS + service-client
token, HIST audit, and the **EVNT detection-lapse escalation** — ADR-005/G6), the inbound contracts
EDGE publishes (device token + JWKS for resource servers; device status for the ACS session
provisioner), and the EVNT boundary EDGE only half-owns (G5 gesture report, G6 lapse escalation).

---

## 1. Outbound — EDGE → PAT (`pat-service`) — offline catalog pull (ADR-004, G2)

EDGE pulls the patient's command catalog and serves it offline (ADR-004). The pull carries a
**service-client identity**, never a device or patient-session token.

| Aspect | Value |
|---|---|
| Operation | `GET {pat.baseUrl}/pat/patients/{patientId}/commands?status=active` (+ `If-None-Match`) |
| Auth | **ACS-issued service-client JWT** for the `edge-service` principal (`actorType = service-client`, authorities `pat.command.read` + `pat.gesture-type.read`) |
| Secondary | `GET {pat.baseUrl}/pat/gesture-types` (+ `If-None-Match`) — resolve/display primitive vocabulary |
| Discovery | Eureka (REG) service id `pat-service`; `pat.base-url` for the direct URL |
| Caching | store `pat_etag` + payload in `cached_catalog`; send stored ETag as `If-None-Match`; treat `304` as "cache valid", `200` as "refresh + audit `CatalogRefreshed`" |
| Fallback | on PAT outage, serve the last `CachedCatalog` (INV-EDGE-5); never hard-fail the device read |

### 1.1 G2 resolution — the service-client credential EDGE holds

EDGE obtains an **ACS-issued service-client token** via ACS client-credentials for the `edge-service`
principal and caches it (refresh before expiry). This matches PAT's requirement exactly
(`../../pat-service/contracts/integration-contracts.md` §4 note): PAT authorizes the catalog pull by
a `pat.command.read` authority on a **service-client** token and rejects a `patient-session` token
`403` (PAT INV-PAT-7). EDGE therefore **never** uses the `edge.device` token or a patient-session
token to call PAT.

> **TODO[architect]:** the exact ACS minting path for a service-client token (client-credentials
> grant vs a provisioned service principal) is an ACS concern not yet fully specified; confirm it at
> backlog/scaffold against the live ACS contract. EDGE's side is fixed: a cached service-client JWT
> carrying `pat.command.read` + `pat.gesture-type.read`.

EARS:

- WHEN EDGE refreshes a device's catalog, THE SYSTEM SHALL call PAT with a service-client token holding `pat.command.read`, sending `If-None-Match` with the stored `pat_etag` (ADR-004).
- WHEN PAT responds `304 Not Modified`, THE SYSTEM SHALL keep the existing `CachedCatalog` and SHALL NOT audit a refresh.
- WHEN PAT responds `200`, THE SYSTEM SHALL replace the `CachedCatalog` payload + `pat_etag`, set `fetched_at = now()`, and audit `CatalogRefreshed` to HIST.
- IF PAT is unreachable, THEN THE SYSTEM SHALL serve the last `CachedCatalog` and SHALL NOT hard-fail the device's `GET /edge/catalog` (INV-EDGE-5).
- THE SYSTEM SHALL NOT call PAT with the `edge.device` token or a patient-session token (INV-EDGE-2; PAT INV-PAT-7).

## 2. Outbound — EDGE → ACS (`acs-service`) — trust anchor + service-client (G1, G2)

| Operation | Target | Auth | Purpose | Fallback |
|---|---|---|---|---|
| Fetch JWKS | `GET {acs.baseUrl}/acs/.well-known/jwks.json` | public | verify ACS caregiver/coordinator JWTs on EDGE human endpoints | cache last-known key set; `401` if no key available |
| Blacklist-aware validation | `POST {acs.baseUrl}/acs/auth/introspect` | service client | revocation-aware check on sensitive human ops (enroll/revoke) | on ACS outage, signature-valid unexpired tokens still pass; check best-effort + logged |
| Service-client token | ACS client-credentials for `edge-service` | — | obtain the `pat.command.read` service-client token (§1.1, G2) | cached token; retry with backoff |

EARS:

- THE SYSTEM SHALL verify every inbound caregiver/coordinator JWT against the ACS JWKS before any authority check, using cached keys if JWKS is briefly unreachable and never accepting unsigned tokens.
- WHERE a sensitive human operation is invoked (enroll, revoke), THE SYSTEM SHALL additionally honor ACS introspection and reject a blacklisted `jti` `401`.

## 3. Outbound — EDGE → HIST (`hist-service`) — audit sink

Audited domain actions (`DeviceEnrolled`, `DevicePaired`, `DeviceRevoked`, …) over sync REST — see
`event-contracts.md` §1 for the envelope and the failure policy.

| Operation | Target | Auth | Purpose |
|---|---|---|---|
| Record audit | `POST {hist.baseUrl}/audit` | service client carrying `hist.audit.record`, `X-Correlation-Id` echoed | append-only audit of every EDGE device-lifecycle action |

- Resolver: `hist-service` via REG (`lb://hist-service/hist`); `hist.base-url` / `HIST_BASE_URL` for the direct URL and **MUST include the `/hist` segment** (dev `http://localhost:8083/hist`) so the literal `POST {hist.baseUrl}/audit` reaches `/hist/audit` (D-640). The service-client JWT **MUST carry `hist.audit.record`** (hist-service api-contract §1). Config/token tracked by **INT-EDGE-009**.
- Failure policy resolved by HIST ADR-005 (`event-contracts.md` §1): `DeviceDeactivated`, `DeviceUnpaired`, `DeviceRevoked`, `DetectionLapseStarted`, `DetectionLapseResolved` are commit+durable-retry; all other EDGE facts are hard-502 (`502 audit-unavailable`). Durable retry tracked by **EDGE-035**.

## 4. Outbound (not a runtime call) — EDGE → MIG (`neuroassist-niv-migrations`)

EDGE **authors** Flyway scripts (`data-model.md` §5, reserved `V0030`–`V0032`) that MIG applies
centrally to `neuroassist_global` and each `t_<tenantId>` schema. No per-service Flyway runner.

---

## 5. Inbound — EDGE publishes (consumed by other modules)

EDGE is the **device authorization endpoint** and the device-status source of truth. Downstream
modules **pull**; EDGE never pushes (messaging disabled).

| Consumer | Surface | Identity | Purpose |
|---|---|---|---|
| **GWY / PAT / EVNT** (resource servers) | `GET /edge/.well-known/jwks.json` | public | verify `edge.device` token signatures so EDGE's key is trusted alongside ACS's (ADR-002, G1) |
| **GWY / resource servers** | `POST /edge/device-tokens/introspect` | service-client | revocation-aware validation of an `edge.device` token (immediate revoke — G1) |
| **ACS** (patient-session provisioner) | `GET /edge/devices/{deviceId}` | service-client / coordinator | confirm a device is `paired` before `POST /acs/patient-sessions` references its `deviceId` (G4) |
| **DASH** (dashboard) | `GET /edge/devices`, `GET /edge/devices/{id}` | caregiver token | render the device card + `DeviceStatusBadge` (online/offline, lifecycle) |
| **the edge station** | `POST /edge/devices/pair`, `POST /edge/heartbeat`, `GET /edge/catalog` | pairing code / `edge.device` token | claim, report liveness, read offline catalog |

### 5.1 G4 resolution — dual-credential coexistence (EDGE ⇄ ACS boundary)

ADR-012/014 require the `edge.device` token and the ACS patient-session token to coexist in the same
app. **EDGE owns only the first.** The hand-off:

1. EDGE enrolls + pairs the device → device `paired`, `edge.device` token minted (EDGE).
2. ACS provisions the patient-session (`POST /acs/patient-sessions`) referencing the same `deviceId`
   (ACS api-contract §4.1); the session token carries `conv.*` / `gest.*` only (ACS INV-3) — no
   `edge.*` authority, and the device token carries no `acs.*` / session authority (INV-EDGE-2).
3. The app holds both tokens: `edge.device` for heartbeat + catalog (+ EVNT report), patient-session
   for the CONV/GEST communication runtime.
4. On `revoke` / `unpair`, EDGE kills **only** the device credential and audits `DeviceRevoked` /
   `DeviceUnpaired` to HIST; the ACS session is revoked **separately** by ACS
   (`DELETE /acs/patient-sessions/{id}`) — out of EDGE scope. The HIST audit lets a coordinator know
   to also revoke the session.

EARS:

- WHEN a resource server validates an `edge.device` token, THE SYSTEM SHALL serve the active EDGE signing key(s) via `/edge/.well-known/jwks.json` so the signature validates (G1).
- WHERE a resource server needs revocation-aware validation of an `edge.device` token, THE SYSTEM SHALL expose `POST /edge/device-tokens/introspect` returning `active:false` for a revoked `credentialId` (G1, INV-EDGE-6).
- THE SYSTEM SHALL expose `GET /edge/devices/{deviceId}` reporting `lifecycleState` so the ACS session provisioner confirms `paired` before provisioning (G4); EDGE SHALL NOT mint, validate or revoke the patient-session token (ACS owns it).

## 6. EVNT boundary (EDGE's half only, EVNT not architected)

### 6.1 G5 — gesture report (station → EVNT, device token)

The edge station reports a recognized gesture to EVNT using its `edge.device` token. **The report
endpoint and payload belong to EVNT** (not yet architected). EDGE defines only its side:

- The `edge.device` token carries the EVNT gesture-report right and the device identity
  (`deviceId`, `patientId`, `tenantId`, `actorType = edge-device`) EVNT will trust via EDGE JWKS
  (§5) and may revoke-check via EDGE introspection (§5, G1).

> **TODO[architect]:** confirm the EVNT report authority string and payload when EVNT is architected;
> align the EVNT-report right EDGE embeds in the `edge.device` token with EVNT's authority namespace.

### 6.2 G6 — detection-lapse escalation (EDGE backend → EVNT, service-client) — ADR-005, SAFETY-GEST-1

A new **outbound, backend-to-backend** call distinct from §6.1. When the EDGE lapse sweep (SPEC-02)
opens a detection-lapse episode, **EDGE** (not the station) raises it to EVNT, which owns
alerting/escalation (EVNT ADR-005: push → SMS → voice). On recovery EDGE notifies EVNT to resolve.
EDGE specifies only its own side plus the **shape** of the contract it expects from EVNT; the
concrete EVNT endpoint is EVNT-owned (INT TODO below, EVNT specs amended next — **do not edit EVNT
here**).

| Aspect | EDGE's side (fixed) |
|---|---|
| Raise operation (expected shape) | `POST {evnt.baseUrl}/evnt/detection-lapses` — EDGE opens an episode and raises it once (use case `RaiseDetectionLapse`) |
| Resolve operation (expected shape) | `POST {evnt.baseUrl}/evnt/detection-lapses/{lapseId}/resolution` (or EVNT's chosen resolve shape) — on first `RUNNING` heartbeat (use case `ResolveDetectionLapse`) |
| Service-client identity | an **ACS-issued service-client JWT** for the `edge-service` principal (`actorType = service-client`), carrying the EVNT detection-lapse-raise/resolve authority — an **EVNT-namespace** authority (e.g. `evnt.detection-lapse.raise` / `evnt.detection-lapse.resolve`, string **owned by EVNT**). Never the `edge.device` token (that is the station's §6.1 right, not EDGE's backend identity). |
| Idempotency key | EDGE sends `Idempotency-Key: <evnt_idempotency_key>` — the stable per-episode key from `edge_detection_lapse` — so a retried raise is deduped by EVNT; EDGE already dedups on its side via one-open-episode-per-device (INV-EDGE-10) |
| Payload EDGE sends | `{ deviceId, patientId, tenantId, cause (NOT_RUNNING|HEARTBEAT_STOPPED), detectionState, reason, lastDetectingAt, lapseStartedAt, engineVersion }` + `X-Correlation-Id` |
| Discovery | `evnt-service` via REG (Eureka); `evnt.base-url` for the direct URL |
| Fallback | EVNT unreachable → the episode row is opened but `raised_to_evnt_at` stays null; the sweep retries with backoff; EDGE **never drops** an unraised episode (safety-critical) |

EARS:

- WHEN the lapse sweep opens a detection-lapse episode for a paired device, THE SYSTEM SHALL raise it to EVNT exactly once with a service-client token and a stable `Idempotency-Key`, and SHALL set `raised_to_evnt_at` on success (ADR-005, INV-EDGE-10).
- WHEN the device's first `RUNNING` heartbeat resolves an open episode, THE SYSTEM SHALL notify EVNT to resolve that episode and SHALL set `resolved_at`.
- IF EVNT is unreachable when raising, THEN THE SYSTEM SHALL keep the open episode and retry with backoff, and SHALL NOT silently discard the lapse (safety-critical path).
- THE SYSTEM SHALL use the ACS-issued service-client identity for the EVNT raise/resolve, never the `edge.device` token (which is the station's gesture-report right, §6.1).

> **INT TODO[architect] (EVNT, SAFETY-GEST-1):** confirm the EVNT detection-lapse **raise** and
> **resolve** endpoint paths, the exact **authority string** in EVNT's namespace, and the accepted
> **payload/idempotency** semantics when EVNT's specs are amended next. EDGE's side (service-client
> identity, per-episode idempotency key, payload fields, retry-not-drop) is fixed here. EVNT ADR-005
> owns the escalation ladder (push → SMS → voice). **This round does not edit any EVNT file.**

---

## 7. Resilience strategy

| Dependency | Timeout | Retry | Circuit breaker | Fallback |
|---|---|---|---|---|
| PAT (catalog pull) | 2s | 2× backoff (background refresh) | open after 5 consecutive failures | serve last `CachedCatalog`; device read never hard-fails (INV-EDGE-5) |
| ACS JWKS | — | client-side JWKS cache | n/a | cached keys; never accept unsigned tokens |
| ACS introspect / service-client | 2s | cache token; retry with backoff | n/a | signature-valid tokens still pass; revocation check best-effort + logged |
| HIST (audit) | 2s | durable retry for commit+durable-retry facts (ADR-005) | open after 5 consecutive failures | hard-502 facts → `502 audit-unavailable` (prod); access-ending/lapse facts → commit + idempotent durable retry; dev log-only degrade |
| EVNT (detection-lapse raise/resolve, ADR-005/G6) | 2s | retry with backoff from the sweep | open after 5 consecutive failures | keep the open episode; `raised_to_evnt_at` null until success; **never drop** an unraised lapse (safety-critical) |
| REG / Eureka | — | fall back to configured `*.base-url` | n/a | direct URLs |

EARS:

- THE SYSTEM SHALL apply a 2-second timeout to every outbound PAT / ACS / HIST call.
- IF PAT's catalog endpoint is unreachable, THEN THE SYSTEM SHALL continue serving the last cached catalog to the device and SHALL mark `stale = true` once the cache age exceeds EDGE's staleness hint (Risk R3).
