<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Command calibration and gesture composition model

## Status
aceita

## Contexto

A patient's residual movements differ per gesture and weaken over time. One patient may
have a firm, fast blink and a weak, slow eyebrow raise at the same time; a single
patient-level threshold cannot serve both, and re-tuning must be frequent and safe. The
product also needs **compound** gestures (hold two primitives) to expand a small set of
reliable movements into more distinct commands. The BA `Command` entity already carries
`sensitivity`, min/max gesture time, `urgency`, a free-form `label`, and
`primaryPrimitive` / `secondaryPrimitive`.

## Decisão

We will make **calibration a property of the `Command`, not the `Patient`**: each command
owns its `CalibrationWindow` (`minGestureTimeMs` / `maxGestureTimeMs`) and `Sensitivity`
(`low|medium|high`). A command's gesture is a `GestureComposition` of a required
`primaryPrimitive` and an optional, distinct `secondaryPrimitive` (simple or compound).
`UrgencyLevel` (`emergency|routine`) and the family-authored `label` are command
properties too. Re-calibration is an update to the same command (anchor action
`CommandCalibrated`), audited to HIST; detection modules pick up the new thresholds on
their next catalog read.

## Consequências

- **Positive:** commands on the same patient coexist with independent thresholds;
  re-tuning is a localized, audited change with zero downstream code change.
- **Positive:** compound gestures multiply the usable command set from few reliable
  primitives; composition validated by INV-PAT-3/4.
- **Negative / trade-off:** more per-command fields to author and keep sane — the UI
  (DASH) must guide calibration; a mis-set window silently degrades detection (doc 06 R4,
  mitigated by audit + re-calibrate flow).
- **Negative / trade-off:** no shared/patient-level default calibration in the MVP; if
  authoring friction is high, a template/default could be layered later without changing
  where the authoritative values live (on the command).
