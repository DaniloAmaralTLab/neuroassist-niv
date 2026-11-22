<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## System Boundary

`edge-service` is a single Spring Boot service (ADR-001 local) fronted by GWY. It is both
an **ACS resource server** (for human-facing endpoints — coordinator/caregiver tokens
verified via ACS JWKS) and the **device authorization endpoint** (it mints and governs the
`edge.device` token — ADR-002 local). It owns the `EdgeDevice` aggregate per tenant, the
short-lived pairing-code lookup, the heartbeat state, and a per-device **cached command
catalog** sourced from PAT.

Inside the boundary: device enrollment, pairing/claim, device-token issuance and
revocation, heartbeat recording + the offline watchdog, and offline catalog
pull/cache/serve. Outside the boundary and referenced by id only: `Patient` (PAT),
`Caregiver`/`PatientSession` (ACS), the detection engine and gesture semantics (GEST),
events/alarms (EVNT). EDGE never processes video and never generates events.

## External Actors and Systems

| Actor / System | Nature | Interaction with EDGE |
|---|---|---|
| **Clinic Coordinator** | human (`CLINIC_COORDINATOR` JWT) | enroll, pair-approve, deactivate, revoke, unpair, read device status |
| **Family Caregiver** | human (`CAREGIVER` JWT) | read device status; revoke (security) |
| **Edge device / station** | non-human (`edge.device` token, ADR-014) | claim pairing code, record heartbeat, read cached catalog |
| **GWY** (API Gateway) | infra | fronts EDGE; generates/propagates `X-Correlation-Id` |
| **ACS** (`acs-service`) | resource-server trust anchor | EDGE verifies caregiver/coordinator JWTs via ACS JWKS; ACS validates (not mints) `edge.device` tokens |
| **PAT** (`pat-service`) | upstream catalog source | EDGE pulls `GET /pat/patients/{patientId}/commands?status=active` with a **service-client** identity (`pat.command.read`), ETag/304 |
| **HIST** (`hist-service`) | audit sink | EDGE records enroll/pair/revoke/deactivate/unpair actions over sync REST |
| **MIG** (`neuroassist-niv-migrations`) | migrations | owns Flyway for all schemas incl. EDGE tables |

Messaging is disabled: every relationship above is synchronous REST. EDGE depends on no
TechLab AI service (`ai.hasAi = false`) and no external third party (OPS-002 internal
network; TECH-006 TLS).

## End-to-End Flows

**Golden path — enroll → pair → operate.**

1. A coordinator calls `POST /edge/devices` (authority `edge.device.enroll`) for a patient
   of their tenant → EDGE creates an `EdgeDevice` in `awaiting_claim` and returns a
   short-lived, single-use **pairing code** (`DeviceEnrolled` audited).
2. The station presents the code to `POST /edge/devices/pair` (code-bearer, no human
   token). EDGE resolves the code → tenant+device (global lookup), consumes it, mints the
   `edge.device` credential, transitions the device to `paired`, and returns the token
   (anchor **DevicePaired** audited).
3. The station records heartbeats: `POST /edge/heartbeats` (authority
   `edge.heartbeat.record`, device token). EDGE stamps `lastHeartbeatAt` and sets
   `online`.
4. The station reads its catalog: `GET /edge/catalog` (authority `edge.catalog.read`,
   device token). EDGE returns the **cached** PAT catalog for the device's patient (with
   its own ETag), refreshing from PAT opportunistically.
5. A coordinator/caregiver reads status: `GET /edge/devices` / `GET /edge/devices/{id}`
   (authority `edge.device.read`) → online/offline + `lastHeartbeatAt` for the dashboard.

**Alternative — offline operation.** If PAT is unreachable when the station pulls, EDGE
serves the last good cached catalog (never a hard failure); ADR-004 staleness ownership.
The device itself keeps running the last catalog it holds while EDGE is unreachable.

**Alternative — watchdog offline.** A scheduled watchdog scans `paired` devices; when
`now − lastHeartbeatAt > threshold` it flips the device to `offline` (`DeviceWentOffline`)
so the dashboard shows the silence; the next heartbeat flips it back (`DeviceCameOnline`).

**Alternative — revoke.** A coordinator/caregiver calls `DELETE /edge/devices/{id}/credential`
(authority `edge.device.revoke`): EDGE invalidates the device credential immediately
(`DeviceRevoked` audited); subsequent heartbeat/catalog calls from that token are rejected
`401`.

**Catalog-refresh detail.** EDGE stores PAT's `ETag`; on refresh it sends `If-None-Match`
and treats `304 Not Modified` as "cache still valid", updating only on `200`.

## Internal Boundaries

Hexagonal layers under `com.neuroassist.edge` (shared `../../adr/ADR-001-hexagonal-architecture.md`):

- **api/** — REST controllers + DTOs for the human endpoints (`/edge/devices…`) and the
  device endpoints (`/edge/devices/pair`, `/edge/heartbeats`, `/edge/catalog`); no
  `infrastructure` import (ArchUnit RULE-04).
- **application/** — use-case services: `EnrollDevice`, `PairDevice`, `RecordHeartbeat`,
  `EvaluateLiveness` (watchdog), `RefreshCatalog`, `RevokeDevice`, `DeactivateDevice`,
  `UnpairDevice`. Each resolves tenant via `TenantContextHolder.require()` as its first
  line; inbound ports never take `tenantId`.
- **domain/** — the `EdgeDevice` aggregate, the pairing-code value object, device
  lifecycle/connectivity state machine and invariants, and the ports (interfaces):
  `EdgeDeviceRepository`, `PairingCodeStore`, `DeviceTokenIssuer`, `CommandCatalogSource`
  (PAT), `CachedCatalogStore`, `AuditPort` (HIST), `Clock`.
- **infrastructure/** — JPA adapters (device + cached catalog), the global pairing-code
  store, the `DeviceTokenIssuer` (signing + JWKS), the Feign/REST `CommandCatalogSource`
  carrying the service-client `pat.command.read` identity, the HIST client, the watchdog
  scheduler, Spring Security (`TenantContextFilter` registered **inside** the
  `SecurityFilterChain`), and config.

## Cross-cutting Concerns

- **Security / identity.** Two trust surfaces: human endpoints verify ACS JWTs (JWKS,
  `CLINIC_COORDINATOR`/`CAREGIVER`); device endpoints verify the EDGE-issued `edge.device`
  token. `X-Tenant-Id` is never trusted — tenant comes from the token claim; the pairing
  endpoint derives tenant from the code. Authorities follow `edge.<resource>.<action>`
  from a single `RoleAuthorityPolicy`; `@PreAuthorize` strings equal those constants
  (D-535 drift avoided).
- **Multi-tenancy.** `EdgeDevice` and cached catalogs live in `t_<tenantId>`; the
  pairing-code lookup is global (`neuroassist_global`) and maps code → tenant+device for
  claim-time resolution (ADR-003 local). `TenantContextFilter` runs inside Spring Security
  so `SecurityContextHolder` is populated first (Learning: tenant-filter order).
- **Observability / health.** Heartbeat is the product's core signal; EDGE exposes device
  liveness for DASH and emits the watchdog transitions. Standard actuator health +
  `X-Correlation-Id` propagated to PAT and HIST.
- **Resilience.** Catalog pulls degrade gracefully to the cache (ADR-004); PAT/HIST
  outages never block pairing or heartbeat. No broker: edge→cloud sync is request-driven.
- **Privacy / LGPD.** No video, no biometric payload crosses EDGE; the device stores only
  `EdgeDevice` metadata + the patient's command catalog (labels/thresholds). Internal
  network only (OPS-002); TLS outside localhost (TECH-006).
