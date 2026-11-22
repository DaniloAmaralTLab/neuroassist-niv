# ADR-004 — Hexagonal architecture (ports & adapters)

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

Framework standard for every generated backend. The frontend prototype already follows the same principle (Port/MockAdapter/Facade in core/data-access.ts), prepared so that fe-autopilot can swap in HttpAdapters.

---

## Options considered

### Option 1 — Hexagonal (ports & adapters)

- **Advantages:**
  - Consistency with the TechLab portfolio
  - Makes it easier to later replace embedded AI with a cloud service without rewriting the domain
  - The frontend already follows the same principle in the prototype
- **Disadvantages:**
  - Abstraction overhead for a small domain (1 patient)
- **Cost:** low (it is already the generated default)

TODO[architect]: investigate alternatives before closing the ADR — platform decision, not compared with other architectures.

---

## Decision

Chosen: **Hexagonal architecture on the backend, mirroring the Port/Adapter/Facade pattern already used in the frontend prototype.**.

---

## Rationale

Consistency with the framework; makes future evolution easier (e.g. multi-patient, multiple clinics) without rewriting business rules.

---

## How to reverse if the decision proves wrong

Low cost — layer violations stay isolated in adapters, not in the domain.

---

## Signals that it is wrong

- Port/adapter complexity disproportionate to the real size of the domain (1 patient) — weak signal, not expected in the short term
