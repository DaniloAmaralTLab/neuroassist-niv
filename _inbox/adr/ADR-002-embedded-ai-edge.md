# ADR-002 — AI embedded in the edge device, not a dedicated cloud service

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

Many framework projects run AI as a dedicated service on the cloud backend. In this product, gesture detection (computer vision) must run locally on the patient's device — there is no AI call to the backend.

---

## Options considered

### Option 1 — AI 100% embedded on the edge (local GestureDetectionEngine)

- **Advantages:**
  - No video leaves the device (privacy)
  - Works offline (the alarm does not depend on the internet)
  - Low latency (no network round trip)
- **Disadvantages:**
  - Model updates require a deploy on the edge device itself, not centralized
  - No easy reuse of shared AI infrastructure across patients
- **Cost:** medium — requires packaging the detection engine to run locally

### Option 2 — AI as a dedicated cloud service, receiving a video stream

- **Advantages:**
  - Easier to update the model centrally
- **Disadvantages:**
  - Violates TECH-002 (no video may leave the edge)
  - Increases latency (network round trip)
  - Depends on connectivity — violates OPS-001 (the alarm must work offline)
- **Cost:** high — would violate two non-negotiable constraints

---

## Decision

Chosen: **AI embedded on the edge (Option 1).**.

---

## Rationale

TECH-002 and OPS-001 are non-negotiable; Option 2 would directly violate both.

---

## How to reverse if the decision proves wrong

Migrating to cloud AI would require relaxing TECH-002 and OPS-001 — a change in product scope and privacy, not just a technical one.

---

## Signals that it is wrong

- Edge device without enough computing capacity to run the model locally while meeting TECH-003 (<200ms)
