# EVNT-007 -- Create Flyway migration scripts V0040–V0044 (extensions, event, push_subscription, escalation_attempt, reserved guard)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

EVNT authors Flyway scripts; `neuroassist-niv-migrations` (MIG) applies them centrally to
`neuroassist_global` and each `t_<tenantId>` schema template + new-tenant provisioning (data-model §4).
Reserved range `V0040`–`V0044` (+10 after EDGE `V0030`–`V0032`). The extended range covers the
SAFETY-1 tables (ADR-005): `V0042` (push_subscription) and `V0043` (escalation_attempt). No
per-service Flyway runner — MIG applies. All three tables are `-- schema: tenant` except the
extensions script (`-- schema: global`). Scripts must exactly match the SQL in data-model.md §2.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2 and §4
- INT-EVNT-004 (MIG range registration)

## Escopo
- [ ] implementar `src/main/resources/db/migration/V0040__evnt_extensions.sql`
- [ ] implementar `src/main/resources/db/migration/V0041__evnt_event_table.sql`
- [ ] implementar `src/main/resources/db/migration/V0042__evnt_push_subscription_table.sql`
- [ ] implementar `src/main/resources/db/migration/V0043__evnt_escalation_attempt_table.sql`
- [ ] implementar `src/main/resources/db/migration/V0044__evnt_reserved_guard.sql`
- [ ] validate UNIQUE constraints and CHECK constraints match data-model.md exactly

## Criterios de aceite
- [ ] AC-1 `V0041` creates `event` table with `uq_event_device_report`, `ck_event_urgency`, `ck_event_feedback`, `ck_event_confirm_pair`, `ck_event_confirm_emergency`, `ix_event_active_alarm` partial index — identical to data-model.md §2.1
- [ ] AC-2 `V0042` creates `push_subscription` with `uq_push_sub_endpoint` and `ix_push_sub_caregiver` partial index — identical to data-model.md §2.2
- [ ] AC-3 `V0043` creates `escalation_attempt` with `uq_escalation_tier`, `ck_escalation_tier/channel/status`, and `fk_escalation_event` FK to `event` — identical to data-model.md §2.3
- [ ] AC-4 `V0044` is a no-op placeholder (comment only) that claims the range slot
- [ ] AC-5 MIG applies all five scripts to a clean PostgreSQL schema without error (verify via INT-EVNT-004)
- [ ] AC-6 `./gradlew :evnt-service:compileJava` exits 0 with migration files on the classpath

## Dependencias
- INT-EVNT-004 (MIG range registration required before MIG applies these)

## Estimativa
M

## Prioridade
P3
