# SPEC-02 — Device lifecycle and liveness (core orchestration)

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).

## Objetivo

Specify the central orchestration EDGE owns: the `EdgeDevice` state machine
(enroll → pair → deactivate/reactivate/unpair/revoke) and the heartbeat-driven connectivity
(`online ⇄ offline`) governed by the in-process watchdog (ADR-003, ADR-014 D5). This is the
substantive core of the module.

## Escopo

- **In:** the lifecycle transitions and their guards; the heartbeat record + watchdog evaluation;
  the `DevicePaired` anchor and the `DeviceWentOffline` / `DeviceCameOnline` transitions.
- **Out:** token minting internals (SPEC-06), catalog distribution (SPEC-03), persistence DDL
  (SPEC-04).

## Decisões técnicas

- **Lifecycle** (`edge_device.lifecycle_state`): `awaiting_claim → paired` (PairDevice);
  `paired → deactivated` (DeactivateDevice, reversible) ; `deactivated → paired` (ReactivateDevice,
  re-issues credential — G3); `paired → revoked` (RevokeDevice, terminal); `awaiting_claim →
  (expired)` when the pairing code lapses unclaimed; `paired/deactivated → unpaired` binding break
  (UnpairDevice) invalidates the credential.
- **Connectivity** (only while `paired`): a heartbeat sets `online`; the watchdog flips to `offline`
  when `now - last_heartbeat_at > threshold`. `deactivated` / `revoked` devices carry `connectivity
  = null`.
- **Detection state** (ADR-005, SAFETY-GEST-1): each heartbeat also carries
  `detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE}` + `detectionStateSince` + optional
  `reason` + `engineVersion`; an absent value is recorded `UNKNOWN`, never `RUNNING` (INV-EDGE-9).
  A `RUNNING` beat advances `last_detecting_at`. Detection state is **distinct from connectivity**:
  a connected (`online`) station can be not-detecting.
- **Watchdog** = `@Scheduled` scan over `paired` devices (interval `EDGE_WATCHDOG_SCAN_INTERVAL_SECONDS`,
  threshold `EDGE_HEARTBEAT_OFFLINE_THRESHOLD_SECONDS`); transition-only audit (no re-emit per scan).
- **Detection-lapse sweep** (ADR-005) = a second `@Scheduled` scan over `paired` devices (interval
  `EDGE_DETECTION_LAPSE_SWEEP_INTERVAL_SECONDS`, threshold `EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS`,
  **default N = 120 s / 2 min**). A device whose `detection_state` has not been `RUNNING` — **or**
  whose heartbeat has stopped — for `N` opens a lapse episode (`cause = NOT_RUNNING` or
  `HEARTBEAT_STOPPED`, silence ⇒ not `RUNNING`), raised to EVNT once (G6, service-client,
  `integration-contracts.md` §6.2). One open episode per device (INV-EDGE-10); EVNT owns escalation
  (EVNT ADR-005: push → SMS → voice). The first `RUNNING` beat resolves the episode and notifies EVNT.
- Application services call `TenantContextHolder.require()` first; inbound ports never carry
  `tenantId` (ArchUnit RULE-04, Learning Layer).

## Implementação — use cases

| Use case | Transition | Emits |
|---|---|---|
| `EnrollDevice` | — → `awaiting_claim` + mint code | `DeviceEnrolled` |
| `PairDevice` | `awaiting_claim` → `paired`, consume code, mint credential | `DevicePaired` (anchor) |
| `RecordHeartbeat` | set `last_heartbeat_at`, `online`, persist `detection_state` (+ `last_detecting_at` on `RUNNING`) (+ refresh token) | `DeviceCameOnline` (on offline→online); `DetectionLapseResolved` (first `RUNNING` beat closing an open episode) |
| `EvaluateLiveness` (watchdog) | `online` → `offline` on threshold | `DeviceWentOffline` |
| `EvaluateDetectionLapse` (lapse sweep) | open a lapse episode when not `RUNNING`/silent beyond `N` | `DetectionLapseStarted` (via `RaiseDetectionLapse` → EVNT, G6) |
| `RaiseDetectionLapse` | mark `raised_to_evnt_at`; raise to EVNT (service-client, idempotent) | — (escalation owned by EVNT) |
| `ResolveDetectionLapse` | set `resolved_at`; notify EVNT to resolve | `DetectionLapseResolved` |
| `DeactivateDevice` | `paired` → `deactivated` | `DeviceDeactivated` |
| `ReactivateDevice` | `deactivated` → `paired`, re-issue credential (G3) | `DeviceReactivated` |
| `UnpairDevice` | break binding, revoke credential, drop cache | `DeviceUnpaired` |
| `RevokeDevice` | → `revoked` (terminal), list credential | `DeviceRevoked` |

## Casos de borda

- Pair on a device not in `awaiting_claim` → `409 device-not-claimable`.
- Reactivate a `revoked` device → `409 device-revoked` (never silently reactivated — INV-EDGE-6).
- Heartbeat on a non-`paired` device → `403` (INV-EDGE-4); on a revoked credential → `401`.
- A phone that locks its screen stops beating → watchdog flips `offline` (Risk R1; EDGE surfaces
  silence, cannot force the browser awake).
- A connected station that backgrounds its tab keeps beating but reports `PAUSED`/`DEGRADED`/
  `UNAVAILABLE` (or `UNKNOWN`): connectivity stays `online` but the lapse sweep opens an episode
  after `N` (ADR-005). This is the case connectivity alone could not catch.
- A station that is **fully off** sends no `PAUSED` at all; the **heartbeat-stop** arm
  (`cause = HEARTBEAT_STOPPED`) still opens a lapse after `N` (silence ⇒ not `RUNNING`).
- A brief benign pause shorter than `N` opens no episode (debounced by the threshold).
- Two sweep passes over an already-open lapse open no second episode and re-raise nothing
  (INV-EDGE-10).

## Critérios de aceite (EARS)

- WHEN a station presents an unexpired, unconsumed pairing code, THE SYSTEM SHALL transition the device `awaiting_claim → paired`, mint the credential, set `paired_at`, and audit `DevicePaired` (INV-EDGE-3).
- WHILE a device is `paired`, WHEN `now - last_heartbeat_at` exceeds the threshold, THE SYSTEM SHALL set `connectivity = offline` and audit `DeviceWentOffline` once per transition.
- WHEN a heartbeat arrives for an `offline` paired device, THE SYSTEM SHALL set `connectivity = online` and audit `DeviceCameOnline`.
- IF a heartbeat or catalog request targets a device that is not `paired`, THEN THE SYSTEM SHALL respond `403` (INV-EDGE-4).
- WHILE a device is `deactivated`, WHEN reactivated with `edge.device.activate`, THE SYSTEM SHALL return it to `paired`, re-issue a fresh credential, and reset `connectivity = offline` (G3).
- IF a device is `revoked`, THEN THE SYSTEM SHALL reject reactivation `409 device-revoked` (INV-EDGE-6).
- WHEN a heartbeat reports `detectionState`, THE SYSTEM SHALL persist it with `detectionStateSince`/`reason`/`engineVersion`, and WHERE it is `RUNNING` SHALL advance `lastDetectingAt`; WHERE it is absent SHALL persist `UNKNOWN` and SHALL NOT treat it as `RUNNING` (INV-EDGE-9, ADR-005).
- WHILE a paired device has not reported `RUNNING` (or has stopped beating) for `N` = `EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS` (default 120 s), THE SYSTEM SHALL open at most one lapse episode and raise it to EVNT once with a service-client token + per-episode idempotency key (INV-EDGE-10, G6).
- WHEN a paired device with an open lapse episode next reports `detectionState = RUNNING`, THE SYSTEM SHALL resolve the episode, audit `DetectionLapseResolved`, and notify EVNT to resolve (ADR-005).
- IF EVNT is unreachable when raising a lapse, THEN THE SYSTEM SHALL keep the open episode and retry with backoff, and SHALL NOT drop the lapse (safety-critical, `integration-contracts.md` §6.2).
