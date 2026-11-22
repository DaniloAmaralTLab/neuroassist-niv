# ADR-010 — Event is a single entity; "active event" is a query, not a separate table

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

During Phase 0.3 (prototype), a first version modeled "active_event" (active event) as a mock collection separate from "events" (history). This caused a real bug detected in review: confirming the alarm updated only the separate collection, and the History screen never reflected the confirmation, because they read different data sources for the same concept.

---

## Options considered

### Option 1 — Event as a single table/collection; "active event" = most recent event with emergency urgency and no confirmedAt, filtered at read time (fixed, current state of the prototype)

- **Advantages:**
  - One write (confirm) is seen by all screens immediately
  - Eliminates the entire class of desynchronization bug between collections
- **Disadvantages:**
  - None identified
- **Cost:** low — already fixed in the prototype

### Option 2 — Separate table/collection for the active event (initial state with the bug, discarded)

- **Advantages:**
  - None — it was the state that caused the bug
- **Disadvantages:**
  - Confirming the alarm was not reflected in the history
  - Two sources of truth for the same concept
- **Cost:** high — data consistency bug

---

## Decision

Chosen: **Option 1 — Event is a single entity in the real schema; "active event" must never become its own table in the backend.**.

---

## Rationale

Fixed in this very phase after the bug was detected; recorded here explicitly so the architect does not reintroduce the separation in the real backend schema.

---

## How to reverse if the decision proves wrong

Not applicable — it is already the fix; it must not be reverted.

---

## Signals that it is wrong

- If any screen shows a confirmed event without it being reflected on another screen (e.g. confirm on Alarm but History does not update), it is a sign that this separation was mistakenly reintroduced in the real backend.
