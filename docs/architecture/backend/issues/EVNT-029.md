# EVNT-029 -- Flyway V0045 + V0046 — escalation_attempt generalisation for detection-lapse (data-model §2.3.1, ADR-006)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

ADR-006 generalises `escalation_attempt` to reference **either** an emergency `event` OR a
`detection_lapse`. This is an **additive ALTER** migration (data-model §2.3.1) that:
(1) drops NOT NULL from `event_id`; (2) adds `lapse_id uuid NULL` with FK to `detection_lapse`;
(3) adds `ck_escalation_subject` CHECK ensuring exactly one subject is set; (4) adds
`subject_id uuid GENERATED ALWAYS AS (COALESCE(event_id, lapse_id)) STORED`; (5) drops the old
`uq_escalation_tier` on `event_id` and recreates it over `subject_id` (keeps ESC-4 for both
emergencies and lapses). V0046 is the reserved no-op placeholder to close the range.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.3.1
- SPEC-12-detection-lapse-alerting.md LAPSE-4 / ESC-4
- docs/architecture/backend/services/evnt-service/adr/ADR-006-detection-lapse-alerting.md

## Escopo
- [ ] implementar `src/main/resources/db/migration/V0045__evnt_escalation_attempt_generalise.sql`
- [ ] implementar `src/main/resources/db/migration/V0046__evnt_reserved_guard.sql`
- [ ] V0045 must include all five ALTER statements from data-model §2.3.1 in order: drop NOT NULL on event_id, add lapse_id column + FK, add ck_escalation_subject CHECK, add subject_id GENERATED ALWAYS, drop + recreate uq_escalation_tier over subject_id
- [ ] V0046 must be a no-op placeholder (comment only, no DDL) to claim the range end

## Criterios de aceite
- [ ] AC-1 V0045 applies with no errors; `escalation_attempt` has columns `lapse_id` (nullable) + `subject_id` (generated, non-null) with `uq_escalation_tier` on `(subject_id, tier, caregiver_id, channel_target)`
- [ ] AC-2 `INSERT escalation_attempt (event_id=X, lapse_id=NULL)` and `INSERT (event_id=NULL, lapse_id=Y)` both succeed; `INSERT (event_id=X, lapse_id=Y)` and `INSERT (event_id=NULL, lapse_id=NULL)` both raise `ck_escalation_subject`
- [ ] AC-3 Duplicate `(subject_id, tier, caregiver_id, channel_target)` for a lapse attempt raises `uq_escalation_tier` (ESC-4 generalised)
- [ ] AC-4 Existing emergency `escalation_attempt` rows (event_id non-null) survive the migration unchanged; `subject_id` equals `event_id` for those rows
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.migration.V0045EscalationAttemptGeneraliseMigrationTest"` exits 0 against real PostgreSQL Testcontainer

## Dependencias
- EVNT-028 (precede — detection_lapse table must exist before the FK in V0045)

## Estimativa
S

## Prioridade
P3
