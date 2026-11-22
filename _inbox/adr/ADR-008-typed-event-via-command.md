# ADR-008 — Event references Command dynamically, not a fixed type enum

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

Version 1 of the product had a single event type (fixed `HELP_REQUESTED`). Amendment 1 to the LBC (lean business case) expanded the core of the product into a catalog of N commands per patient — Event must reference which command was triggered, not a closed enum.

---

## Options considered

### Option 1 — Event.command as a reference to Command (implemented and validated in the prototype)

- **Advantages:**
  - Supports an extensible command catalog without changing the schema for each new command
  - The event's urgency and label always come from the referenced Command, with no duplication
- **Disadvantages:**
  - Data migration needed if production already existed with the old enum (not the case — the MVP has not gone live yet)
- **Cost:** low — change already implemented in the prototype

TODO[architect]: investigate whether the final backend schema should keep Command as its own table or denormalize label/urgency directly into Event for performance — implementation decision, not evaluated here.

---

## Decision

Chosen: **`Event.command` is a reference (FK) to `Command`, replacing the former `Event.type` enum fixed at `HELP_REQUESTED`.**.

---

## Rationale

LBC Amendment 1 §7.2; already validated working in the prototype with 3 real commands (Help/water/Frog).

---

## How to reverse if the decision proves wrong

Low-to-medium cost — it is a straightforward column migration (enum → FK) in a relational database, should reversal be needed.

---

## Signals that it is wrong

- None — already validated end to end in the prototype (Home, History, Alarm, Calibration all read/write Event.command consistently)
