# SPEC-08 — BDD test scenarios

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).

## Objetivo

Describe the BDD coverage and the reusable step vocabulary behind EDGE's `.feature` files. The pure
Gherkin lives in `../../tests/cucumber/*.feature` (consumed by `be-bdd-generator.py`); this SPEC
holds the prose, the SPEC traceability and the shared steps that would clutter the features.

## Feature files

| Feature file | Covers | Invariants |
|---|---|---|
| `device-enrollment-and-pairing.feature` | SPEC-02 enroll → claim; single-use code; mobile reuse | INV-EDGE-1/2/3 |
| `heartbeat-liveness.feature` | SPEC-02 heartbeat + watchdog; online⇄offline; short-TTL refresh | INV-EDGE-4 |
| `offline-catalog-distribution.feature` | SPEC-03 cache-first read; ETag/304; PAT-outage fallback; service-client | INV-EDGE-5, INV-EDGE-2 |
| `device-revocation-and-security.feature` | SPEC-06 revoke/deactivate/reactivate; token fabrics; tenant isolation | INV-EDGE-6/2/1 |
| `detection-lapse.feature` | ADR-005 detection state on heartbeat; lapse sweep → EVNT escalation; resolve on recovery; retry-not-drop | INV-EDGE-9, INV-EDGE-10 |

## Reusable steps (step definitions — not repeated per feature)

- `Given a tenant "T1" with a patient "P1"`
- `Given a coordinator token with authority "edge.device.enroll"` / `a caregiver token holding "<authority>"`
- `Given an enrolled device "D1" in "awaiting_claim" with a valid pairing code`
- `Given a paired device "D1" with a live edge.device token`
- `Given an edge.device token for "D1" holding "<authority>"`
- `When the station claims the code <code> via X-Pairing-Code`
- `When the device posts a heartbeat` / `When the watchdog scans after <n> seconds of silence`
- `When the device posts a heartbeat with detectionState "<state>"` / `... without a detectionState`
- `When the detection-lapse sweep scans` / `When the detection-lapse sweep scans again`
- `When it reads GET /edge/catalog [with If-None-Match "<etag>"]`
- `Then the response status is <code>` / `Then the device connectivity is "<state>"`
- `Then the device detectionState is "<state>"` / `Then the device lastDetectingAt is [not] updated`
- `Then a detection-lapse episode is opened with cause "<cause>"` / `Then no detection-lapse episode is opened`
- `Then the lapse is raised to EVNT with a service-client token and an idempotency key`
- `Then an "<action>" audit is recorded to HIST`

## Example data

- Pairing code format `XXXX-XXXX` (e.g. `WX7K-2Q9F`); TTL 600 s; single-use.
- `edge.device` token authorities `edge.heartbeat.record`, `edge.catalog.read`; TTL 900 s.
- Offline threshold 90 s; watchdog scan 30 s.
- Detection state ∈ `RUNNING|PAUSED|DEGRADED|UNAVAILABLE|UNKNOWN`; lapse threshold `N` = 120 s (default); lapse sweep interval 30 s; lapse cause `NOT_RUNNING|HEARTBEAT_STOPPED` (ADR-005).
- Catalog command sample: `BLINK → suction`, `urgency=emergency`, `sensitivity=medium`.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL keep each `.feature` file pure Gherkin (no prose beyond `#` comments) so `be-bdd-generator.py` consumes it.
- THE SYSTEM SHALL trace every scenario to a SPEC and an invariant via a `#` comment header.
- WHERE a step is reused across features, THE SYSTEM SHALL document it here and SHALL NOT redefine it per file.
