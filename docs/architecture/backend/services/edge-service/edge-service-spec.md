---
service: edge-service
module: EDGE
moduleName: Edge Device Integration
project: neuroassist-niv
stack: java
framework: spring-boot
packageRoot: com.neuroassist.edge
httpPort: 8084
multiTenancy: schema-per-tenant
messaging: disabled
hub: none
anchorEvent: DevicePaired
status: specs
generatedBy: /be-architect-specs
---

# EDGE — Service Spec (entry point)

**Module:** EDGE — Edge Device Integration · **Service:** `edge-service` · **Stack:** Java 21
/ Spring Boot (hexagonal). EDGE owns the **device lifecycle** of the local gesture-detection
agent (the "edge station", ADR-014): it **enrolls** a device for a patient, **pairs** it via a
single-use code, **mints and governs** the non-human `edge.device` credential (ADR-002 local —
ACS validates, does not mint), **monitors** liveness through heartbeats + a watchdog, and keeps
the device **operational offline** by caching and serving the PAT command catalog (ADR-004).
It is simultaneously an **ACS resource server** (human endpoints verify ACS JWTs via JWKS) and
the **device authorization endpoint** (mints the device token, publishes its own JWKS). Base
path `/edge`. No GEST/EVNT business logic lives here (identity + liveness only).

## Document map

| Area | File |
|---|---|
| Brief | `_brief.md` |
| Vision | `01-architectural-vision.md` … `06-risks-gaps-assumptions.md` |
| ADRs (local) | `adr/ADR-001-service-boundary-single-service.md`, `adr/ADR-002-device-token-issuance-validation.md`, `adr/ADR-003-code-based-pairing-claim.md`, `adr/ADR-004-offline-catalog-distribution.md`, `adr/ADR-005-detection-state-and-lapse-alert.md` |
| Shared hexagonal ADR | `../../adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`) |
| Contracts | `contracts/api-contract.md`, `contracts/data-model.md`, `contracts/event-contracts.md`, `contracts/hub-integration.md`, `contracts/integration-contracts.md` |
| Events | `events/event-catalog.md` |
| Specs | `spec/backend/SPEC-01..10.md` |
| BDD | `tests/cucumber/*.feature`, `spec/backend/SPEC-08-bdd-test-scenarios.md` |
| Diagrams | `diagrams/c4-context.puml`, `diagrams/c4-container.puml`, `diagrams/c4-component.puml` |
| Local setup | `setup-local.md` |

## Invariants (declared once — cited as INV-EDGE-n across specs)

Declared in `03-initial-domain-framing.md` §Invariants (authoritative source):

- **INV-EDGE-1** — every `EdgeDevice`, `CachedCatalog` and the tenant/device resolution of a `PairingCode` is scoped to exactly one tenant; no path resolves a device across tenants; `X-Tenant-Id` is never trusted.
- **INV-EDGE-2** — the `edge.device` token carries only `edge.heartbeat.record` / `edge.catalog.read` (and the EVNT gesture-report right, G5); never any `edge.*` management, `acs.*`, `pat.*` or patient-session authority.
- **INV-EDGE-3** — a pairing code is valid once and until `expiresAt`; claiming consumes it; an expired/consumed code is rejected and never mints a credential.
- **INV-EDGE-4** — heartbeat and catalog endpoints require a `paired` device with a live credential; `awaiting_claim` / `deactivated` / `revoked` devices cannot record heartbeats or read the catalog.
- **INV-EDGE-5** — a catalog read never hard-fails on a PAT outage; EDGE serves the last `CachedCatalog`; EDGE, not PAT, owns staleness tolerance (ADR-004).
- **INV-EDGE-6** — after `revoke`, the next request bearing that device credential is rejected; a revoked credential is never reinstated.
- **INV-EDGE-7** — controller `@PreAuthorize` strings equal the `RoleAuthorityPolicy` constants one-for-one (`edge.<resource>.<action>`), avoiding 403 drift (D-535).
- **INV-EDGE-8** — `patientId` / `enrolledBy` are opaque ids to PAT/ACS; EDGE holds no cross-service FK, and PAT/ACS hold none to `EdgeDevice`.
- **INV-EDGE-9** — a paired device reports `detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE}` on each heartbeat, persisted distinctly from `connectivity`; an absent value is `UNKNOWN`, never `RUNNING` (ADR-005, SAFETY-GEST-1).
- **INV-EDGE-10** — a detection lapse is raised to EVNT at most once per episode (one open episode per device) and resolved exactly once; a device whose heartbeat has stopped is still subject to the lapse rule (silence ⇒ not `RUNNING`) (ADR-005).

## Authorities (canonical — SPEC-06, naming per D-639)

`edge.device.enroll`, `edge.device.read`, `edge.device.pair`, `edge.device.activate`,
`edge.device.deactivate`, `edge.device.revoke`, `edge.device.unpair`, `edge.heartbeat.record`,
`edge.catalog.read`.

> Reads are `.read`; the domain verbs `enroll` / `pair` / `unpair` / `record` / `deactivate` /
> `revoke` / `activate` are their own actions (no `.view`, `.edit`, `.register`). `edge.device.activate`
> is the specs-introduced reactivation authority (G3), symmetric with `edge.device.deactivate`
> and mirroring PAT's `pat.patient.activate` / `pat.patient.deactivate` precedent.

## Resolved gaps (from doc 06)

- **G1** — device-token validation & immediate revocation: EDGE mints the `edge.device` JWT and
  publishes `GET /edge/.well-known/jwks.json`; resource servers (GWY/PAT/EVNT) trust it alongside
  ACS. Immediate revoke = **short TTL refreshed on heartbeat** + a revocation list consulted by
  `POST /edge/device-tokens/introspect`; a revoked `credentialId` fails introspection and is never
  refreshed. `api-contract.md` §5–§6, `SPEC-06`, `ADR-002`.
- **G2** — service-client EDGE uses to call PAT: an **ACS-issued service-client JWT** for the
  `edge-service` principal (`actorType = service-client`, authorities `pat.command.read` +
  `pat.gesture-type.read`), obtained via ACS client-credentials and cached. Never a device or
  patient-session token. `integration-contracts.md` §1, `SPEC-10`. (ACS's exact minting path is a
  TODO[architect] against ACS — see §TODOs.)
- **G3** — reactivation of a `deactivated` device: `POST /edge/devices/{id}/activation`
  (authority `edge.device.activate`) transitions `deactivated → paired` and **re-issues a fresh
  credential** (new `credentialId`); the old credential stays dead (least-surprise vs revocation).
  `api-contract.md` §2.4, `SPEC-02`.
- **G4** — dual-credential coexistence: EDGE owns only the `edge.device` token. After a device is
  `paired`, ACS provisions the patient-session (`POST /acs/patient-sessions`, referencing the same
  `deviceId`); the two tokens coexist in the app. EDGE exposes `GET /edge/devices/{id}` so the
  session provisioner can confirm `paired` first; revoke/unpair in EDGE kills only the device
  credential and audits `DeviceRevoked` to HIST so the coordinator knows to also revoke the ACS
  session. `integration-contracts.md` §3, `SPEC-06`.
- **G5** — EVNT reporting contract stays **TODO[architect]** (EVNT not architected). EDGE defines
  only its side: the `edge.device` token carries the EVNT gesture-report right and the device
  identity (`deviceId`, `patientId`, `tenantId`, `actorType = edge-device`) EVNT will trust via
  EDGE JWKS. The report endpoint + payload belong to EVNT. `integration-contracts.md` §6.1, `SPEC-10`.
- **G6 (ADR-005, SAFETY-GEST-1)** — detection-lapse escalation: the EDGE backend raises/resolves a
  detection lapse to EVNT over sync REST with an **ACS-issued service-client** token, a per-episode
  idempotency key and a fixed payload; EVNT owns the endpoint path, authority string and the
  escalation ladder (push → SMS → voice, EVNT ADR-005). EDGE's side is fixed; the EVNT endpoint is an
  **INT TODO[architect]** (EVNT amended next). `integration-contracts.md` §6.2, `SPEC-02`/`SPEC-10`.

## Flyway reserved range (cross-service snapshot)

EDGE reserves **`V0030`–`V0032`** — the next free `+10` block (ACS `V0010`–`V0012`, PAT
`V0020`–`V0022`; convention in PAT `data-model.md` §5 G1). `data-model.md` §5. **`V0032`** is now
consumed by ADR-005 (`V0032__edge_detection_state_and_lapse.sql` — detection-state columns +
`edge_detection_lapse`, additive); the additive reservation rolls to `V0033+`.

| Service | Reserved range | Source |
|---|---|---|
| ACS (`acs-service`) | `V0010`–`V0012` | `../../acs-service/contracts/data-model.md` §5 |
| PAT (`pat-service`) | `V0020`–`V0022` | `../../pat-service/contracts/data-model.md` §5 |
| **EDGE (`edge-service`)** | **`V0030`–`V0032`** | `contracts/data-model.md` §5 |

## Anchor

Anchor action **`DevicePaired`** (an enrolled station claims its code and becomes an operational,
credentialed device); foundational supporting action **`DeviceEnrolled`**. Messaging disabled →
all domain events audited to HIST over sync REST.

## Open TODOs[architect]

- **G5 (EVNT report)** — endpoint + payload owned by EVNT; confirm the authority string and
  payload when EVNT is architected.
- **G6 (EVNT detection-lapse escalation, ADR-005/SAFETY-GEST-1)** — INT TODO: confirm the EVNT
  detection-lapse **raise/resolve endpoint path** and the **authority string** (EVNT namespace) when
  EVNT's specs are amended next. EDGE's side (service-client identity, per-episode idempotency key,
  payload, retry-not-drop) is fixed in `integration-contracts.md` §6.2. **EVNT files not edited this
  round.**
- **G2 (ACS service-client minting)** — confirm how ACS mints the `edge-service` service-client
  token (client-credentials vs provisioned principal) at backlog/scaffold against the live ACS
  contract (same open item PAT flagged).
- **HIST failure policy** — confirm hard-`502`-vs-enqueue for device-lifecycle audits against the
  live `hist-service` contract at backlog/scaffold.
