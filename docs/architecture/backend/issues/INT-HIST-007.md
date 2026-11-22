# INT-HIST-007 -- Retention periods — owner + legal counsel must set retention_days + lawful_basis_ref per fact class in audit_retention_policy (access-lifecycle, device-lifecycle, catalog-config, safety-runtime, engine-registry, authentication); open non-blocking item; no sweep job until set (ADR-006 Option C)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ADR-006 (Option C) mandates a per-fact-class retention policy seeded in `audit_retention_policy`
(global schema). HIST-018 seeds 6 rows with `retention_days = NULL` and `legal_hold = false` —
this is the correct MVP state. `NULL` means "retain indefinitely until counsel specifies a value."

This INT issue is an **owner + legal action item**, not a code task:
1. The product owner must engage legal counsel to determine the lawful basis and retention
   period for each of the 6 fact classes.
2. Once determined, the `retention_days` and `lawful_basis_ref` columns in
   `audit_retention_policy` must be updated via a Flyway migration (MIG coordinates).
3. Only after `retention_days` is set can a future automated sweep job be safely activated.
   The `legal_hold = true` flag on any row blocks the sweep for that class regardless.

This item is non-blocking for MVP: the system is fully functional with `NULL` periods (no data
is ever deleted until the job is activated). It tracks legal compliance debt.

## Spec de referencia

- data-model.md §2.4 (audit_retention_policy — retention_days, lawful_basis_ref, legal_hold)
- SPEC-11 (retention + erasure — retention frame)
- ADR-006 (Option C — per-class retention, legal hold, no sweep until policy set)

## Escopo

- [ ] OWNER: engage legal counsel; obtain retention period + lawful basis per fact class
- [ ] OWNER/MIG: once determined, create Flyway V006x UPDATE migration for audit_retention_policy rows
- [ ] Review and remove `legal_hold = false` rows where counsel mandates `legal_hold = true`

## Criterios de aceite

- [ ] AC-1 Each of the 6 fact-class rows in `audit_retention_policy` has a non-NULL `retention_days` and a non-empty `lawful_basis_ref` (completion criterion for this issue)
- [ ] AC-2 Any fact class under litigation hold has `legal_hold = true` before the sweep job is considered
- [ ] AC-3 The Flyway migration updating retention rows is applied by MIG without data loss
- [ ] AC-4 A `# SWEEP-GATE` comment in the future sweep job bean verifies that no row in `audit_retention_policy` has `retention_days IS NULL` before proceeding (guard before first sweep activation)

## Dependencias

- HIST-018 (rows must exist before they can be updated)
- INT-HIST-005 (MIG must be able to apply the Flyway update migration)

## Estimativa

S (code) + legal timeline (external)

## Prioridade
P9
