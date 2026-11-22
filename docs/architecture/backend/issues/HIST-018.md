# HIST-018 -- Retention policy table seeding — 6 fact classes with nullable periods; legal hold column; no automated sweep in MVP (ADR-006 Option C frame; periods TBD with counsel — owner TODO)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

The `audit_retention_policy` table (global schema, V0063) is the config-driven seam for future
automated retention sweeps. This issue seeds the initial rows and documents the owner TODO.

Fact classes (seeded with `retention_days = NULL`, `legal_hold = false`):
1. `access-lifecycle` (caregiver auth, session, link)
2. `device-lifecycle` (device enroll/pair/revoke)
3. `catalog-config` (commands, gesture types)
4. `safety-runtime` (events, alarms, lapses)
5. `engine-registry` (GEST engine version/capability)
6. `authentication` (caregiver authenticated facts)

No automated sweep ships in MVP — `retention_days = NULL` means "retain indefinitely until
counsel sets the value". The `legal_hold = true` flag prevents the future sweep job from
touching those fact-class rows. **Owner TODO**: engage legal counsel to set `retention_days` +
`lawful_basis_ref` for each fact class before the sweep job is activated (ADR-006 Option C).

## Spec de referencia

- SPEC-11 (retention + erasure — retention scope)
- data-model.md §2.4 (audit_retention_policy DDL + seed fact classes)
- ADR-006 (Option C frame — retention per fact class + legal hold)

## Escopo

- [ ] seed SQL dentro de `backend/services/hist-service/src/main/resources/db/migration/V0063__create_audit_retention_policy.sql`

## Criterios de aceite

- [ ] AC-1 V0063 inserts exactly 6 rows, one per fact class listed above, with `retention_days = NULL` and `legal_hold = false`
- [ ] AC-2 No scheduled sweep bean exists in the application context (MVP — no retention job)
- [ ] AC-3 A `TODO[legal-counsel]` comment in V0063 documents that periods must be set before activating a sweep job
- [ ] AC-4 `audit_retention_policy` CHECK constraint `retention_days > 0` holds (NULL allowed; negative/zero rejected)

## Dependencias

- HIST-006 (V0063 creates the table)

## Estimativa

S

## Prioridade
P8
