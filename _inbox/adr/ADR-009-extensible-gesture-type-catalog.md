# ADR-009 — Extensible gesture type catalog (GestureType) via UI

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

Amendment 2 to the LBC (lean business case) expanded the vocabulary of facial primitives from a closed list of 6 values to an extensible catalog, editable by the caregiver/technical lead on the Calibration screen (e.g. registering "Lip reading").

---

## Options considered

### Option 1 — GestureType as its own entity (id + name), referenced by Command.primaryPrimitive/Secondary; UI allows inline registration

- **Advantages:**
  - The family can register a residual movement not originally anticipated, without depending on a release
  - Already implemented and validated in the prototype
- **Disadvantages:**
  - Creates the possibility of registering a type that the real detection engine does not yet support — see TECH-005 and the related ADR on the required guardrail
- **Cost:** low — it is one additional lookup table

---

## Decision

Chosen: **`GestureType` as its own entity, extensible via UI.**.

---

## Rationale

LBC Amendment 2 §7.2/§12.

---

## How to reverse if the decision proves wrong

Low cost — it is a lookup table; reverting to a fixed enum is a simple migration if needed.

---

## Signals that it is wrong

- CRITICAL: registering a GestureType in the UI does not imply real support from the detection engine (TECH-005). Today the prototype does not model a "pending validation" state — the type is born directly as available. TODO[architect]: decide whether this needs a status field before going to real production.
