<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Intent

EDGE is the **device authority** of NeuroAssist NIV. It owns the full lifecycle of the
local gesture-detection agent — the "edge station" that runs in the patient's browser
(ADR-014) — from the moment a coordinator enrolls it, through pairing it to a patient and
issuing it a device identity, to monitoring that it stays alive and keeping it able to
work offline. Detection itself runs on the edge (ADR-002) and is GEST's truth; the
structured event and the alarm are EVNT's; EDGE is the module that makes the edge station
**trusted, reachable and operational** so those others can do their work.

## Problem Statement

NeuroAssist NIV is a hybrid edge+cloud product (ADR-006): the alarm must work offline and
no video may leave the device (TECH-002, OPS-001), yet a multi-tenant SaaS dashboard must
still see what is happening. That creates four needs that no other module covers:

- **Identity for a non-human agent.** The edge station is neither a caregiver nor the
  patient; it must authenticate as a *device* (ADR-014 D1: `edge.device` token, never a
  person). Something has to mint and govern that credential — ACS explicitly does not
  (ACS `ADR-002`: "edge device token owned by EDGE; ACS validates but does not mint it").
- **A safe way to bind a device to a patient.** A family or clinic must pair a physical
  station to the right patient once, without typing secrets by hand or exposing a
  management credential — the code-based `awaiting_claim` → heartbeat flow of ADR-014.
- **Liveness you can trust.** "Detection silently stopped is the worst failure mode of
  this product" (ADR-014 D5). A missed heartbeat must surface as `offline` on the
  dashboard, aggravated on a phone that locks its screen and switches apps.
- **Working offline.** The detector runs against the patient's command catalog, which PAT
  owns. If the network drops, the station must keep detecting against the last good
  catalog. PAT delegates that staleness ownership to EDGE (PAT api-contract §3.3.1).

Without EDGE, the edge station would have no trustworthy identity, no governed pairing, no
observable liveness, and no offline catalog — the hybrid architecture would not hold.

## Personas

- **Clinic Coordinator** (`CLINIC_COORDINATOR`) — primary. Enrolls a device, pairs it to
  a patient, and later deactivates, revokes or unpairs it. ADR-014: "the coordinator
  performs the enrollment once; after that the station lives on its own credential."
- **Family Caregiver** (`CAREGIVER`) — secondary. Reads device status on the dashboard
  (online/offline, last heartbeat) and may revoke a device for security.
- **Edge device** (non-human actor) — the browser-based station of ADR-007/008/014
  (Android/Chromium in the pilot). Authenticates with the EDGE-issued `edge.device`
  token, records heartbeats, and reads its cached command catalog. It is **not** the
  patient-with-session actor (ADR-012); that is a second, independent ACS credential that
  coexists on the same physical device.

## MVP Scope

1. **Device enrollment** by a coordinator: create an `EdgeDevice` in the tenant and issue
   a short-lived, single-use **pairing code** (`DeviceEnrolled`).
2. **Pairing / claim**: an enrolled station presents its pairing code, EDGE validates and
   consumes it, mints the device credential, and transitions the device to `paired`
   (anchor **DevicePaired**). Reused unchanged for the Android/Chromium mobile station
   (ADR-014) — no separate flow.
3. **Device-token issuance**: EDGE is the **device authorization endpoint** for the
   `edge.device` identity (ADR-002 local). ACS validates these tokens but does not mint
   them.
4. **Heartbeat monitoring**: the device records heartbeats; a watchdog flips a device to
   `offline` after a configurable missed-heartbeat threshold and back to `online` on the
   next beat (`DeviceWentOffline` / `DeviceCameOnline`).
5. **Offline catalog distribution**: EDGE pulls the patient's command catalog from PAT
   with a service-client identity (`pat.command.read`, ETag/304), caches it, and serves
   the last good copy to the paired device so detection survives a network drop (ADR-004).
6. **Device teardown**: `deactivate` (soft, reversible), `revoke` (immediate credential
   invalidation, security action) and `unpair` (break the device↔patient binding), all
   audited to HIST.

## Out of Scope

- **Gesture recognition / detection engine** — runs on the edge in the browser; GEST owns
  detection truth and primitive support (ADR-002, PAT INV-PAT-6). EDGE never sees video.
- **Structured-event generation and alarm routing** — EVNT. The station reports a
  recognized gesture using its `edge.device` token; turning that into an `Event` and an
  alarm is EVNT's, not EDGE's.
- **Patient-with-session identity and CONV/GEST authorities** — ACS (ADR-012 Option C).
  EDGE issues the *device* token only; the patient session is a distinct credential.
- **Caregiver identity, login and the JWT blacklist** — ACS. EDGE is a resource server
  for its human-facing endpoints and trusts ACS-issued caregiver tokens via JWKS.
- **Native mobile pipeline / iOS background capture** — ADR-014 Option 2, deferred until
  Safari has viable background capture.
- **Async outbox / broker for edge→cloud sync** — messaging is disabled; ADR-006 records
  the outbox only as a future signal if the local retry queue saturates.

## Architectural Principles

- **Device is a first-class, non-human identity.** EDGE mints and governs the
  `edge.device` credential; it is never a person token and never carries management scope
  (ADR-014 D1, least authority).
- **Pairing once, credential thereafter.** A human (coordinator) authorizes enrollment; a
  bearer **pairing code** — not a caregiver token — lets the station claim its own
  credential, so the station never needs to hold a human secret (ADR-003 local).
- **Liveness is observable, silence is loud.** A missing heartbeat is a visible state, not
  a silent gap; the watchdog makes "detection stopped" the dashboard's problem (ADR-014
  D5).
- **Offline-first catalog.** EDGE owns how stale an offline edge may be and always keeps a
  last-known-good catalog; it never blocks detection on a live PAT call (ADR-004).
- **Reference, never reach.** EDGE references `Patient` (PAT) and `Caregiver` (ACS) by id
  with no cross-service FK; PAT/ACS reference `EdgeDevice` by id likewise.
- **Tenant isolation is an invariant.** Every device lives in exactly one tenant schema;
  pairing-code resolution never leaks a device across tenants.
- **Hexagonal.** The device-lifecycle rules live in a framework-free domain; Spring
  Security, JPA, the PAT/ACS/HIST clients and the watchdog scheduler live only in adapters
  (shared `../../adr/ADR-001-hexagonal-architecture.md`).

## Success Signals

- A coordinator enrolls a device and the station completes pairing with the code alone,
  receiving an `edge.device` credential — no human token ever reaches the station.
- A paired station records heartbeats and shows `online` on the dashboard; when it stops,
  it flips to `offline` within the watchdog threshold and recovers on the next beat.
- With the network down, the station keeps detecting against the last catalog EDGE served;
  when the network returns, a conditional pull returns `304` unless the catalog changed.
- A coordinator-triggered `revoke` invalidates the device credential immediately and is
  auditable in HIST; a `revoked` device cannot report or read its catalog.
- No device, pairing code or catalog is ever resolved across tenant boundaries.
