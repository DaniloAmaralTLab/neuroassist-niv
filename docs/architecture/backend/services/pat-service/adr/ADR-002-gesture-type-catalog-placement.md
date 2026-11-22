<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Gesture-type catalog placement: PAT-owned global primitive vocabulary

## Status
aceita

## Contexto

A `Command` composes one or two **gesture primitives** (blink, eyebrow raise, …). Those
primitives form a vocabulary that is (a) the same conceptually across every tenant, (b)
tied to what the detection engine recognizes, and (c) referenced by every command. Two
forces pull in opposite directions: per-tenant isolation (the default,
`../../../adr/ADR-003-multi-tenancy.md`) would put the catalog in `t_<tenantId>`, but a
shared, read-mostly vocabulary duplicated per tenant drifts and complicates seeding. The
BA model lists `GestureType` with no `tenantId`, and its own note warns that *registering
a name does not imply real support by the detection engine* — ownership of the vocabulary
is distinct from ownership of detection.

## Decisão

We will model `GestureType` as a **PAT-owned catalog in the global schema**
(`neuroassist_global`), seeded and append-only in the MVP, readable by any authenticated
actor and by detection service clients. A registered `GestureType` is a **name in the
vocabulary only**; it carries no assertion that GEST can detect it — detection support is
owned by GEST (INV-PAT-6). `Command` (per-tenant) references primitives by id across to
the global catalog.

## Consequências

- **Positive:** one canonical vocabulary, seeded once, no per-tenant drift; commands in
  any tenant speak the same primitive language; cheap reads.
- **Positive:** cleanly separates "vocabulary" (PAT) from "what the engine supports"
  (GEST), matching the BA warning and avoiding a false coverage guarantee.
- **Negative / trade-off:** a cross-schema reference from per-tenant `command` to global
  `gesture_type` (doc 06 G2 — validate FK vs app-layer check against the central migrator).
- **Negative / trade-off:** clinics cannot define *private* primitives in the MVP; if
  that need appears, revisit (per-tenant overlay or move the table) — assumption A2.
