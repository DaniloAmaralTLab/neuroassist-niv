<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Calibration test-run telemetry deferred

## Status
accepted (decision: defer; reserved for a future phase)

## Contexto
When a caregiver calibrates a command, the station runs trial detections. Capturing that telemetry
(landmark quality, pass/fail, confidence distribution) server-side could help tuning and support, and
`gest-service` is a plausible home for it. However, real-run detection feedback **already** flows
through the platform: EVNT stores `confidence` + `recognitionWindowMs` verbatim in `report_meta`
(EVNT §2.1) for every real gesture report, and HIST records the caregiver's `real` / `false_positive`
verdict. Adding a separate GEST calibration-telemetry store risks **duplicating EVNT's role** and
pulling GEST back toward the detection runtime we deliberately kept off the backend (ADR-002).

## Decisão
**Defer** calibration test-run telemetry out of the MVP. GEST stays limited to the capability registry.
If a tuning need is later proven, a dedicated decision will choose between (a) a GEST
`gest.calibration.record` surface and (b) reusing EVNT `report_meta` with a "test-run" discriminator —
explicitly, rather than smuggling it into GEST now.

## Consequências
- Positive: keeps GEST thin and its boundary with EVNT clean; no premature data model.
- Positive: avoids two sources of detection-quality data.
- Negative: no server-side calibration analytics in v1 (calibration remains a station-local UX).
- Trade-off accepted: we forgo a possibly-useful dataset to protect the module boundary until the need
  is concrete (gap G4).
