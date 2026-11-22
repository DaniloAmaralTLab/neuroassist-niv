# ADR-005 — Per-command calibration with an extensible gesture-type catalog decoupled from engine support

> Status: **proposed** — 2026-11-19
> Scope: the PAT frontend module (`@neuroassist/pat`), its command-catalog feature and the FE contract
> it exposes to GEST / EVNT / EDGE. Module-local record; does not occupy the shared ADR-005 slot
> (design tokens) — see this folder's README numbering caveat.

## Context

NeuroAssist NIV must let a non-technical family describe, in their own words, everything the patient
wants to say and precisely how each thing is said. Two LBC amendments shape PAT:

- **Amendment 1 (command catalog):** a patient has *N* commands, not one fixed gesture. Each command
  is a gesture (simple or a two-primitive combination) → a free-form `label`, and each command must be
  calibratable **independently**: `sensitivity`, `minGestureDurationMs` / `maxGestureDurationMs`, and
  `urgency`.
- **Amendment 2 (extensible gesture types):** the catalog of gesture *primitives* is no longer a
  closed set of six values; a caregiver can register a new `GestureType` (e.g. "Lip reading") inline.

This raises a correctness hazard the prototype itself flags (`TODO[architect]` in Framing
§6.1/§7.1a/§9.3): **registering a gesture-type name does not mean the detection engine (GEST) can
actually recognise that movement.** PAT must capture the family's intent without silently promising
detection it does not own. The webcam "live test" in the prototype turns the camera on for tactile
feedback but performs no recognition — it must not be mistaken for a capability gate.

The forces: (a) give the family full authoring freedom (open label + open gesture-type catalog);
(b) keep each command's calibration self-contained; (c) never let the FE imply engine support it
cannot guarantee; (d) keep PAT the single source of truth for the catalog that GEST, EVNT and EDGE
consume.

## Decision

1. **The `Command` is the unit of calibration.** PAT models every editable field on the command
   itself — `label`, `urgency`, `primaryPrimitive`, `secondaryPrimitive`, `sensitivity`,
   `minGestureDurationMs`, `maxGestureDurationMs` — and the editor calibrates one command at a time.
   `min < max` is a client-side invariant enforced before save. Duration is a **first-class,
   UI-editable** calibration dimension (closing the prototype gap where it was form-only).
2. **The gesture-type catalog is open and owned by PAT as a naming registry only.** New types are
   registered inline and become immediately selectable. PAT stores and displays types; it does **not**
   assert they are detectable.
3. **Engine support is explicitly out of PAT's authority.** The gesture-type → engine-capability
   mapping is a GEST architecture decision. The PAT UI surfaces the "naming ≠ support" caveat to the
   caregiver and, when the BE later exposes an engine-support flag per type, renders a "not yet
   detected" marker — but PAT never blocks authoring on it.
4. **The live webcam test is advisory UI state only.** It uses `getUserMedia` for tactile feedback,
   holds no server state, never uploads the stream, stops on save/stop/destroy, and never gates a save.

## Alternatives considered

- **Closed, fixed gesture-type enum (pre-Amendment 2).** Rejected: forbids the family from expressing
  gestures the patient can actually perform; contradicts the LBC amendment.
- **Shared calibration profile across commands.** Rejected: a faint routine blink and a deliberate
  emergency raise need different sensitivities/durations; a shared profile collapses the whole point of
  per-command calibration.
- **Validate engine support at authoring time (block types GEST cannot detect).** Rejected for v1:
  couples PAT to a GEST capability contract that does not exist yet, and would stop the family from
  pre-declaring a command before detection is tuned. Deferred to a GEST decision + an additive "not yet
  detected" marker.
- **Run real recognition in the FE live test.** Rejected: recognition is edge/GEST, not a dashboard
  concern; doing it here would duplicate and diverge from the authoritative detector.

## Consequences

**Positive**

- The family has full authoring freedom; each command is tuned in isolation.
- PAT stays the single source of truth for the catalog; GEST/EVNT/EDGE consume it by id.
- No dishonest capability promise: the FE is explicit that naming a type is not detection.

**Negative / mitigations**

- A caregiver can author a command whose gesture the engine cannot yet detect (R1). *Mitigation:* the
  "naming ≠ support" caveat inline now, and an engine-support marker once GEST exposes it.
- Duration controls add editor surface the prototype lacked (R2). *Mitigation:* Specs add two bounded
  numeric/slider inputs with the `min < max` invariant.
- The webcam success state could be read as proof the command works (R3). *Mitigation:* honest copy;
  the success state claims only "camera active / gesture performed", never "command verified".

## References

- `_brief.md` (PAT) · doc 01 §4, doc 03 §5, doc 06 R1–R3.
- Project data model: `Command`, `GestureType`, `Patient` (project-context.json `_extensions.data_model`).
- Prototype: `frontend/design-reference/angular-prototype/.../screens/calibration` + `.build-plans/calibration.plan.md`.
- LBC Amendment 1 (command catalog), Amendment 2 (extensible gesture types), §12 (compound-gesture
  false-negative risk).
- Shared ADR-006 (module entry as a library). ACS api-contract §0 (JWT tenant derivation).
