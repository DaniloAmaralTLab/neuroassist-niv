<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Ubiquitous Language

- **Edge device / station** — the local browser-based agent (ADR-014) that runs gesture
  detection on the patient's machine or phone. Modeled as the `EdgeDevice` aggregate.
- **Enroll** — a coordinator creates an `EdgeDevice` for a patient and mints a pairing
  code; the device is not yet operational.
- **Pairing code** — a short-lived, single-use secret the station presents to claim its
  credential; globally resolvable to tenant + device.
- **Pair / claim** — the station redeems the pairing code and receives its device
  credential; the device becomes `paired`.
- **Device token** (`edge.device`) — the non-human credential EDGE mints for a paired
  device; it carries management scope *never* (ADR-014 D1).
- **Heartbeat** — a periodic liveness signal the device records; its absence beyond a
  threshold means `offline`. Since ADR-005 it also carries the **detection state**.
- **Connectivity** — the `online | offline` state of a paired device, driven by heartbeats
  (matches the BA `EdgeDevice.status` enum). Proves the station is **connected**, not that it
  is **detecting**.
- **Detection state** (ADR-005, SAFETY-GEST-1) — whether the station is actually running
  gesture detection: `RUNNING | PAUSED | DEGRADED | UNAVAILABLE`, plus `UNKNOWN` for a station
  that reports none (never treated as `RUNNING`). Reported on each heartbeat with
  `detectionStateSince`, an optional `reason` (`HIDDEN`, `CAMERA_DENIED`, `MODEL_FAILED`,
  `LOW_FPS`) and `engineVersion`. Distinct from connectivity: a connected station can be
  not-detecting.
- **Detection lapse** (ADR-005) — a paired device of a patient has not been `RUNNING` (or has
  stopped beating) for `N` minutes. Detected by a scheduled sweep and escalated to EVNT (which
  owns alerting/escalation); resolved when detection resumes. Idempotent per episode.
- **Cached catalog** — the last-known-good copy of the patient's PAT command catalog that
  EDGE holds and serves so detection survives offline (ADR-004).
- **Revoke** — immediate, terminal invalidation of a device credential (security action).
- **Deactivate** — reversible soft-disable of a device. **Unpair** — break the
  device↔patient binding.
- **Authority convention** — `edge.<resource>.<action>` with canonical actions (D-639):
  `edge.device.enroll`, `edge.device.read`, `edge.device.pair`, `edge.device.unpair`,
  `edge.device.deactivate`, `edge.device.revoke`, `edge.heartbeat.record`,
  `edge.catalog.read`. (Read is `read`; the domain verbs enroll/pair/unpair/record/revoke/
  deactivate are their own actions — no `.register`, `.view`, `.edit`.)

## Aggregates and Entities

- **EdgeDevice** (aggregate root, per tenant) — `id`, `tenantId`, `patientId` (PAT ref, by
  id), `lifecycleState` (`awaiting_claim | paired | deactivated | revoked`), `connectivity`
  (`online | offline`, meaningful only while `paired`), `lastHeartbeatAt`, `pairedAt`,
  `enrolledBy` (caregiver id), `credentialId` (current `edge.device` token identity),
  `createdAt`, `updatedAt`. The BA model's `EdgeDevice.status (online|offline)` maps to
  `connectivity`; EDGE adds the lifecycle dimension it owns.
- **PairingCode** (value object / short-lived record, **global** schema) — `code`,
  `tenantId`, `deviceId`, `expiresAt`, `consumedAt`. Single-use; resolvable at claim time
  without a tenant token.
- **CachedCatalog** (per device, per tenant) — `deviceId`, `patientId`, `patEtag`,
  `payload` (resolved commands), `fetchedAt`. Serves the device offline and backs the
  `/edge/catalog` ETag.

`Patient` (PAT), `Caregiver`/`PatientSession` (ACS), `GestureType`/`Command` (PAT) are
**not** EDGE entities — referenced by id only, no cross-service FK.

## Domain Events

| Event | Meaning | Note |
|---|---|---|
| **DeviceEnrolled** | coordinator enrolled a device; pairing code issued | foundational |
| **DevicePaired** | station claimed its code and became operational | **anchor** |
| **DeviceWentOffline** | watchdog saw a missed-heartbeat threshold crossed | liveness |
| **DeviceCameOnline** | heartbeat resumed after an offline period | liveness |
| **DeviceRevoked** | device credential invalidated immediately | terminal |
| **DeviceDeactivated** | device soft-disabled (reversible) | — |
| **DeviceUnpaired** | device↔patient binding broken | — |
| **CatalogRefreshed** | cached catalog updated from PAT (200, not 304) | internal |
| **DetectionLapseStarted** | a paired device stopped detecting (not `RUNNING` / silent) for `N` min; raised to EVNT | ADR-005 |
| **DetectionLapseResolved** | detection resumed (`RUNNING`) and the open lapse episode was resolved at EVNT | ADR-005 |

Messaging is disabled, so these are **in-process domain events** audited to HIST over sync
REST, not broker messages. No module consumes them asynchronously.

## State Transitions

Lifecycle: `awaiting_claim → paired` (on pair/claim) · `paired → deactivated` (soft,
reversible back to `paired` by a re-activate action) · `paired → revoked` (terminal
credential kill) · `awaiting_claim → (expired)` when the pairing code lapses unclaimed.

Connectivity (only while `paired`): `online ⇄ offline`, driven by heartbeat vs. watchdog
threshold. A `deactivated` or `revoked` device has no meaningful connectivity.

A `revoked` device is never silently reactivated; returning to service requires a new
enroll + pair (new credential), mirroring ACS's "no reactivation of a revoked session".

## Invariants

- **INV-EDGE-1 (tenant isolation).** Every `EdgeDevice`, `CachedCatalog` and the
  tenant/device resolution of a `PairingCode` is scoped to exactly one tenant; no path
  resolves a device across tenants. `X-Tenant-Id` is never trusted.
- **INV-EDGE-2 (least-authority device token).** The `edge.device` token carries only
  `edge.heartbeat.record` / `edge.catalog.read` (and the right to report to EVNT/GEST);
  it never carries any `edge.*` management, `acs.*`, `pat.*` or patient-session authority
  (ADR-014 D1, ADR-012).
- **INV-EDGE-3 (single-use pairing code).** A pairing code is valid once and until
  `expiresAt`; claiming consumes it; an expired or consumed code is rejected and never
  mints a credential.
- **INV-EDGE-4 (pair before operate).** Heartbeat and catalog endpoints require a `paired`
  device with a live credential; a device in `awaiting_claim`, `deactivated` or `revoked`
  cannot record heartbeats or read its catalog.
- **INV-EDGE-5 (offline-safe catalog).** A catalog read never hard-fails on a PAT outage;
  EDGE serves the last `CachedCatalog`. EDGE, not PAT, owns how stale that may be
  (ADR-004).
- **INV-EDGE-6 (immediate revoke).** After `revoke`, the next request bearing that device
  credential is rejected; a revoked credential is never reinstated.
- **INV-EDGE-7 (authority-string parity).** Controller `@PreAuthorize` strings equal the
  `RoleAuthorityPolicy` constants one-for-one (`edge.<resource>.<action>`), avoiding 403
  drift (D-535).
- **INV-EDGE-8 (reference, not FK).** `patientId`/`enrolledBy` are opaque ids to PAT/ACS;
  EDGE holds no cross-service foreign key, and PAT/ACS hold none to `EdgeDevice`.
- **INV-EDGE-9 (detection liveness ≠ connectivity).** A paired device reports
  `detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE}` on each heartbeat; EDGE persists
  the latest state per device and exposes it distinctly from `connectivity`. An **absent**
  `detectionState` is recorded as `UNKNOWN` and is **never** treated as `RUNNING` (ADR-005,
  SAFETY-GEST-1, backwards compatibility).
- **INV-EDGE-10 (single lapse episode).** A detection lapse is raised to EVNT **at most once per
  episode** (one open episode per device; idempotency key stable per episode); recovery resolves
  that same episode exactly once. A device whose heartbeat has **stopped** is still subject to
  the lapse rule — silence for `N` minutes is itself a lapse (silence ⇒ not `RUNNING`). EDGE
  owns the lapse truth; EVNT owns the alerting/escalation it is handed (ADR-005).
