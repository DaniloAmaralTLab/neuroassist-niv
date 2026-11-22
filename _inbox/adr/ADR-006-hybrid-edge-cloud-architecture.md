# ADR-006 — Hybrid edge + cloud architecture

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

Tension recorded in LBC (lean business case) §12/§13 between the original 100% offline vision (JavaFX desktop) and the business pivot to multi-tenant SaaS.

---

## Options considered

### Option 1 — Hybrid: detection + alarm on the edge, structured-event synchronization with the cloud when connectivity is available

- **Advantages:**
  - Preserves privacy (TECH-002) and offline alarm (OPS-001)
  - Enables the multi-tenant SaaS dashboard
- **Disadvantages:**
  - Complexity of two independently deployable layers
  - Requires a local retry queue (outbox) on the edge
- **Cost:** medium

### Option 2 — Everything in the cloud (video streaming)

- **Advantages:**
  - Simpler architecture, all on one side
- **Disadvantages:**
  - Directly violates TECH-002 and OPS-001
- **Cost:** high — unfeasible given the constraints

### Option 3 — Everything local, no cloud

- **Advantages:**
  - Simpler, no cloud infrastructure
- **Disadvantages:**
  - No multi-tenant SaaS dashboard or shared history — contradicts the LBC business pivot
- **Cost:** high — contradicts the business goal

---

## Decision

Chosen: **Hybrid edge + cloud architecture (Option 1).**.

---

## Rationale

The only option simultaneously compatible with TECH-002, OPS-001 and the need for the SaaS dashboard in LBC §6.1.

---

## How to reverse if the decision proves wrong

High cost — it is the backbone of the architecture; reversing means re-architecting the entire product.

---

## Signals that it is wrong

- Local retry queue (outbox) saturating without systematic draining — consider an asynchronous broker (RabbitMQ), already cited as a TODO in Framing §11.2
