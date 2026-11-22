# ADR-005 — Frontend in Angular 21 + Nx 22 + Tailwind v4 + Angular CDK

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

Framework standard, already fully implemented in the Phase 0.3 prototype: 6 screens (Entry, Home, Alarm, History, Calibration, Onboarding), clean build, working light/dark theme.

---

## Options considered

### Option 1 — Angular 21 + Nx 22 + Tailwind v4 + Angular CDK (framework default)

- **Advantages:**
  - Already validated in the working prototype
  - CDK covers overlay/dialog/menu without custom SCSS
  - Consistency with the rest of the portfolio
- **Disadvantages:**
  - No alternative evaluated — platform decision
- **Cost:** low (prototype already delivered)

TODO[architect]: investigate alternatives before closing the ADR — platform decision, not compared with other frontend frameworks.

---

## Decision

Chosen: **Angular 21 + Nx 22 + Tailwind v4 + Angular CDK, with no deviation from the default.**.

---

## Rationale

techlab-architecture standard; the Phase 0.3 prototype already validates the stack working end to end.

---

## How to reverse if the decision proves wrong

Low cost — it is the presentation layer; domain logic on the backend is not affected by a frontend swap.

---

## Signals that it is wrong

- No sign of error identified — prototype with a clean build on all screens
