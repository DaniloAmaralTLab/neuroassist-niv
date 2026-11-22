# ADR-001 — Backend in Java 21 + Spring Boot

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

The techlab-architecture framework standardizes a JVM stack (Java 21 + Spring Boot, hexagonal architecture) for every backend generated via new-project.py. This decision was confirmed in the pre-flight (Question 0), even before the LBC (lean business case), without a comparative evaluation of alternatives — it is a platform inheritance, not a choice made by this project.

---

## Options considered

### Option 1 — Java 21 + Spring Boot (framework default)

- **Advantages:**
  - Full compatibility with new-project.py and the /be-architect-* pipeline
  - Consistency with the rest of the TechLab portfolio
- **Disadvantages:**
  - No alternative evaluated — platform decision, not specific to this project
- **Cost:** low (it is already the generated default)

TODO[architect]: investigate alternatives before closing the ADR — decision inherited from the pre-flight, never compared with other stacks.

---

## Decision

Chosen: **Java 21 + Spring Boot, hexagonal architecture (see ADR-004), following the framework default with no deviation.**.

---

## Rationale

techlab-architecture standard confirmed in the pre-flight; diverging would break automated generation (TECH-001).

---

## How to reverse if the decision proves wrong

Changing stacks would require rewriting the entire backend and the automated generation pipeline — high cost, not recommended without a strong technical reason.

---

## Signals that it is wrong

- Need for native integration with a computer-vision library that only exists outside the JVM (but detection runs on the edge, not on the backend — low risk)
- JVM performance inadequate for the event volume (unlikely given the low volume of 1 patient)
