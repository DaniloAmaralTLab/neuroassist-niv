# SPEC-07 — Observability + health

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).

## Objetivo

Specify health, correlation, logging and metrics for EDGE — with the hard rule that the
device-facing read path must stay available through upstream outages (offline-first, INV-EDGE-5).

## Escopo

- **In:** `GET /edge/health`, `X-Correlation-Id` propagation, audit-vs-log boundary, the metrics
  that make Risk R1 (silent detection stop), R3 (stale catalog) and R6 (detection lapse / EVNT
  escalation, ADR-005) observable.
- **Out:** HIST audit contract (SPEC-09 / event-contracts), security (SPEC-06).

## Decisões técnicas

- **Health** = Spring Boot Actuator. Liveness = process + datastore. **Readiness** treats ACS/PAT
  reachability as a detail, never a hard failure of the device path (a down PAT must not make EDGE
  unready for `GET /edge/catalog` — INV-EDGE-5).
- **Correlation**: echo the inbound `X-Correlation-Id` on every response and every HIST audit; GWY
  generates it if absent. Device identity (`deviceId`, `tenantId`) is logged from the token, never
  from a header.
- **Audit vs log**: domain-lifecycle actions go to HIST (event-contracts); operational signals
  (watchdog scans, refresh attempts, PAT outages) are structured logs + metrics.

## Implementação — key metrics

| Metric | Why |
|---|---|
| `edge.devices.connectivity{state}` (gauge) | online/offline fleet view (Risk R1) |
| `edge.heartbeat.received` (counter) | liveness volume |
| `edge.watchdog.offline_transitions` (counter) | silent-stop detections (Risk R1) |
| `edge.catalog.refresh{result=200|304|outage}` (counter) | staleness + PAT health (Risk R3) |
| `edge.catalog.served_stale` (counter) | offline serving past the staleness hint |
| `edge.pairing.claims{result=ok|invalid|conflict}` (counter) | pairing health + R2 leak signal |
| `edge.device_token.revocations` (counter) | revoke activity (G1) |
| `edge.devices.detection_state{state}` (gauge) | fleet view of RUNNING/PAUSED/DEGRADED/UNAVAILABLE/UNKNOWN (Risk R1/R6, ADR-005) |
| `edge.detection.lapses_started{cause}` (counter) | silent detection-stop escalations (cause NOT_RUNNING/HEARTBEAT_STOPPED) (Risk R6) |
| `edge.detection.lapses_resolved` (counter) | recoveries (lapse episodes closed) |
| `edge.detection.evnt_raise{result=ok|retry|failed}` (counter) | health of the EVNT escalation path (G6, safety-critical) |

## Casos de borda

- PAT down during a readiness probe → `health` stays `UP` for the device path; a `components.pat`
  detail shows `DOWN` without failing overall readiness.
- A device that stops beating → surfaced via `watchdog.offline_transitions` + the DASH status badge;
  EDGE cannot force the browser awake (Risk R1).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL expose `GET /edge/health` returning `200 UP` while the process and datastore are healthy, and SHALL NOT mark readiness `DOWN` solely because ACS or PAT is unreachable (INV-EDGE-5).
- THE SYSTEM SHALL echo the inbound `X-Correlation-Id` on every response and every HIST audit call, generating none itself when GWY already supplied one.
- WHEN the watchdog flips a device `offline`, THE SYSTEM SHALL increment `edge.watchdog.offline_transitions` and log the `deviceId` + `lastHeartbeatAt` (Risk R1).
- WHEN a catalog refresh hits a PAT outage, THE SYSTEM SHALL increment `edge.catalog.refresh{result=outage}` and continue serving the cache (Risk R3, INV-EDGE-5).
- WHEN the lapse sweep opens a detection-lapse episode, THE SYSTEM SHALL increment `edge.detection.lapses_started{cause}`, log the `deviceId` + `cause` + `lastDetectingAt`, and record the EVNT raise result on `edge.detection.evnt_raise` (Risk R6, ADR-005).
- IF an EVNT lapse raise fails, THEN THE SYSTEM SHALL increment `edge.detection.evnt_raise{result=failed|retry}` and keep the open episode for retry (never drop — safety-critical, `integration-contracts.md` §6.2).
