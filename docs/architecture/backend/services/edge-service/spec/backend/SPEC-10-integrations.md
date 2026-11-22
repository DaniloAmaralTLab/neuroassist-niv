# SPEC-10 — Integrations

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).
> Canonical contract: `../../contracts/integration-contracts.md`.

## Objetivo

Specify EDGE's intra-project integrations (no external third parties): the PAT catalog pull (G2),
the ACS trust anchor + service-client token, the HIST audit sink, the inbound surface EDGE publishes
(JWKS, introspection, device status), the EVNT boundary EDGE only half-owns (G5 gesture report) and
the new **EVNT detection-lapse escalation** EDGE raises (G6, ADR-005/SAFETY-GEST-1).

## Escopo

- **In:** EDGE → PAT, EDGE → ACS, EDGE → HIST, EDGE → EVNT (detection-lapse raise/resolve, G6)
  (outbound); EDGE's published JWKS / introspection / device-status (inbound); the EDGE⇄ACS
  dual-credential boundary (G4); the EVNT half-contracts (G5 gesture report, G6 lapse escalation).
- **Out:** PAT's/ACS's own contracts (owned there); EVNT's report endpoint (G5) and EVNT's
  detection-lapse endpoint/authority (G6) — both **EVNT-owned, INT TODO[architect]**, EVNT not edited
  here.

## Decisões técnicas (gap resolutions)

- **G2** — EDGE calls PAT `GET /pat/patients/{id}/commands?status=active` (+ `If-None-Match`) with an
  **ACS-issued service-client token** (`pat.command.read` + `pat.gesture-type.read`), never a device
  or patient-session token (PAT INV-PAT-7). The exact ACS minting path is a TODO[architect] against
  ACS; EDGE's side is fixed and cached.
- **G1** — EDGE publishes `GET /edge/.well-known/jwks.json` (resource servers trust `edge.device`
  alongside ACS) and `POST /edge/device-tokens/introspect` (service-client, immediate-revoke check).
- **G4** — EDGE exposes `GET /edge/devices/{id}` so ACS confirms `paired` before provisioning a
  patient-session referencing the same `deviceId`; EDGE owns only the device token, ACS only the
  session; revoke/unpair in EDGE audits `DeviceRevoked`/`DeviceUnpaired` so a coordinator also
  revokes the ACS session (ACS-owned). `integration-contracts.md` §5.1.
- **G5** — the `edge.device` token carries the EVNT gesture-report right and the device identity EVNT
  will trust; the report endpoint + payload are **EVNT's** (TODO[architect], EVNT not architected).
- **G6 (ADR-005, SAFETY-GEST-1)** — on a detection lapse the **EDGE backend** (not the station)
  raises/resolves to EVNT over sync REST with an **ACS-issued service-client** token (an
  EVNT-namespace authority, string EVNT-owned), a stable per-episode `Idempotency-Key`, and the
  payload `{ deviceId, patientId, tenantId, cause, detectionState, reason, lastDetectingAt,
  lapseStartedAt, engineVersion }`. EDGE keeps the open episode and retries on EVNT outage (never
  drops — safety-critical). The EVNT endpoint path + authority string are **EVNT-owned**
  (INT TODO[architect], EVNT amended next). `integration-contracts.md` §6.2.

## Implementação — contract summary

| Direction | Target | Operation | Auth | Fallback |
|---|---|---|---|---|
| outbound | PAT | catalog pull, ETag/304 | service-client `pat.command.read` | serve cache (INV-EDGE-5) |
| outbound | ACS | JWKS / introspect / service-client token | public / service-client | cached keys; best-effort revocation |
| outbound | HIST | `POST {hist.baseUrl}/audit` (base URL incl. `/hist`, D-640) | service-client, `hist.audit.record` | hard-502 → `502 audit-unavailable` prod; access-ending/lapse → commit + durable retry (ADR-005); log-only dev |
| outbound | EVNT (G6) | detection-lapse raise/resolve (shape `POST /evnt/detection-lapses[/{id}/resolution]`) | service-client (EVNT-namespace authority, EVNT-owned) | keep open episode + retry; never drop (safety-critical) |
| inbound | GWY/PAT/EVNT | `GET /edge/.well-known/jwks.json` | public | — |
| inbound | GWY/resource servers | `POST /edge/device-tokens/introspect` | service-client | — |
| inbound | ACS / DASH | `GET /edge/devices[/{id}]` | service-client / caregiver | — |
| half (G5) | EVNT | gesture report | `edge.device` token | **TODO[architect] — EVNT-owned** |
| half (G6) | EVNT | detection-lapse raise/resolve | service-client (EVNT-namespace authority) | **INT TODO[architect] — EVNT endpoint/authority EVNT-owned** |

## Casos de borda

- PAT outage → serve cache; mark `stale` (Risk R3).
- ACS JWKS briefly unreachable → cached keys; never accept unsigned tokens.
- EVNT not yet architected → EDGE embeds the gesture-report right + identity (G5) and fixes its own
  side of the lapse raise/resolve (G6), but asserts no EVNT endpoint — both are EVNT-owned.
- EVNT unreachable on a lapse raise → keep the open episode, retry with backoff, never drop (G6,
  safety-critical).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL call PAT only with an ACS-issued service-client token holding `pat.command.read` (G2); it SHALL NOT use the `edge.device` or a patient-session token (INV-EDGE-2, PAT INV-PAT-7).
- THE SYSTEM SHALL publish `/edge/.well-known/jwks.json` and `POST /edge/device-tokens/introspect` so resource servers validate and revoke-check `edge.device` tokens (G1).
- THE SYSTEM SHALL expose `GET /edge/devices/{id}` reporting `lifecycleState` for the ACS session provisioner (G4), and SHALL NOT mint/validate/revoke the patient-session token.
- WHERE EVNT is architected, THE SYSTEM SHALL align the EVNT-report right in the `edge.device` token with EVNT's authority namespace (G5, TODO[architect]).
- WHEN a detection lapse opens, THE SYSTEM SHALL raise it to EVNT over sync REST with an ACS-issued service-client token and a stable per-episode `Idempotency-Key`, and on recovery SHALL notify EVNT to resolve (G6, ADR-005); IF EVNT is unreachable, THEN THE SYSTEM SHALL keep the open episode and retry, never dropping the lapse.
- WHERE EVNT is architected, THE SYSTEM SHALL align the detection-lapse raise/resolve endpoint and authority string with EVNT's namespace (G6, INT TODO[architect]).
