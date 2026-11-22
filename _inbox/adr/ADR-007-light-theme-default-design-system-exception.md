# ADR-007 — Light theme as the UI default (exception to the canonical dark-only Design System)

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

The canonical Design System of the techlab-architecture framework is dark-only by default in all generated projects. During Phase 0.3 (UX), it was identified that this product's persona (a non-technical caregiver in a home environment, with peripheral and sporadic use) fits a calm light theme by default better ("silent guardian"), with dark as an optional toggle — not the other way around.

---

## Options considered

### Option 1 — Light theme as default, with a toggle for dark

- **Advantages:**
  - Aligned with the non-technical home persona (UI Concept §5)
  - Reduces visual anxiety in everyday use, reserving intensity only for the real alarm
- **Disadvantages:**
  - Diverges from the framework's canonical dark-only Design System
  - Today there is no official exception mechanism — the wireframe-to-angular generator ignores design/design-system/theme.css and always applies the canonical dark-only theme, requiring a manual patch on every regeneration
- **Cost:** medium — requires manual maintenance of theme.css every time the prototype is regenerated, until the framework supports a per-project theme exception

### Option 2 — Dark-only (framework default, no exception)

- **Advantages:**
  - No manual maintenance, always consistent with the generator
- **Disadvantages:**
  - Not aligned with the home persona; UI Concept §5 recommends calm/light as the default
- **Cost:** low technically, high in product fit

---

## Decision

Chosen: **Option 1 — light theme as default, documented as an exception in theme.css and in wireframe §3.1.**.

---

## Rationale

UI Concept §5 (sober/calm color palette) and the real persona (Jamilly Amaral, a home caregiver with no technical-dashboard-user profile).

---

## How to reverse if the decision proves wrong

Medium effort — reverting to dark-only would require discarding the light-theme tokens already validated in the prototype (~150 lines of stitched-together tokens).

---

## Signals that it is wrong

- If the framework standardizes an official per-project theme exception mechanism, this manual implementation should migrate to the official mechanism, preventing --force from wiping the light theme on every regeneration (already happened 2x during Phase 0.3 of this project)
