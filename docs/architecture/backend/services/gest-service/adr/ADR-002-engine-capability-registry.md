<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Thin backend: detection-engine capability registry is GEST's sole backend responsibility

## Status
accepted

## Contexto
Detection runs **locally** on the patient station (browser webcam → facial landmarks →
classification), per product ADR-002 (embedded AI edge), ADR-006 (hybrid edge+cloud) and ADR-014
(mobile phone as edge). The surrounding backend responsibilities are already owned: the command
catalog and calibration params by **PAT**; device identity, pairing and the offline catalog
(`GET /edge/catalog`) by **EDGE**; structured-event generation and `POST /evnt/gesture-reports`
ingest by **EVNT**; identity and `gest.*` authorities by **ACS**. The open question for the vision
was: *does the backend `gest-service` own anything, and if so what?*

There is exactly one responsibility that has no other owner and must not be given to PAT: **engine
support truth**. PAT's `GestureType` vocabulary is open/extensible and PAT validates only that a
primitive *exists* (INV-PAT-4), not that the engine can detect it. INV-PAT-6 explicitly states that
naming a gesture type does not imply engine support and delegates that truth to GEST. Candidates
considered and rejected for the backend: running/duplicating detection (belongs to the station);
storing the catalog (PAT); model-binary distribution (a frontend asset under prototype-to-production);
calibration test-run telemetry (overlaps EVNT `report_meta`, deferred — ADR-004).

## Decisão
The backend `gest-service` is **THIN**. It owns **only** the detection-engine capability registry:
`(engineVersion, gestureTypeCode) → supportStatus`, plus a small engine-version registry to key it.
It is an **ACS resource server**, read-mostly and **advisory** (INV-GEST-4): it answers "does this
engine version detect this primitive?" for PAT/DASH (warn a caregiver at calibration) and for the
station (self-check its loaded engine), and it never blocks a PAT operation. It does **not** run
detection, store the catalog, manage devices, or ingest events. We explicitly choose *thin over
feature-rich*: GEST resists absorbing responsibilities that already belong to PAT/EDGE/EVNT.

## Consequências
- Positive: closes the INV-PAT-6 gap (silent no-detection when a command maps to an unsupported
  primitive) with a single authoritative source, without polluting PAT with engine internals.
- Positive: the station and caregiver UI get a one-call support answer; the boundary with
  PAT/EDGE/EVNT is crisp and testable (zero detection/catalog/event data in GEST).
- Negative: the registry's value is realised only if consumers (PAT/DASH/station) actually read and
  surface it — it is advisory, not enforcing (Risk R4). A future product call could promote it to a
  gate (gap G5).
- Negative: "which engine version a station runs" is not yet recorded anywhere (Risk R3 / gap G1);
  v1 has the caller pass `engineVersion`.
- Trade-off accepted: a deliberately small backend that could *look* empty, in exchange for honest
  boundaries — we do not invent GEST responsibilities to make the service feel substantial.
