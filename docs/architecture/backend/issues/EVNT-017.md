# EVNT-017 -- Implement EscalationSweep @Scheduled job — sweep unconfirmed emergencies, resolve caregivers, invoke EmergencyNotificationPort, persist escalation_attempt, audit EscalationAttempted

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

The application-layer scheduler that drives SAFETY-1. Every `EVNT_ESCALATION_SWEEP_SECONDS` (default 5s):
loads all unconfirmed `emergency` events via `ix_event_active_alarm` partial index, resolves linked
caregivers via `CaregiverLinksPort` (ACS — cached), asks `EscalationPolicy` for due tiers, and
invokes `EmergencyNotificationPort` per tier+caregiver. Regardless of outcome (sent or failed),
persists one `escalation_attempt` row under the `uq_escalation_tier` guard (ESC-4 no-op on repeat
sweep) and calls `AuditPort.record(EscalationAttempted)` (ESC-7). ESC-5: a failure advances the
recipient to the next tier at its due time — never silent. ESC-1: confirms stop further tiers
immediately. No broker required (messaging stays disabled — ADR-005).

## Spec de referencia
- SPEC-11 §implementation (EscalationSweep)
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1.2 (EscalationAttempted)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/escalation/EscalationSweep.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/escalation/EmergencyNotificationPort.java`
- [ ] integration test `src/test/java/com/neuroassist/evnt/application/escalation/EscalationSweepTest.java`
- [ ] verify sweep is idempotent (double-sweep → no duplicate rows, no duplicate audits — ESC-4)

## Criterios de aceite
- [ ] AC-1 Unconfirmed emergency → Tier 0 Web Push attempted for all linked caregivers within `T+0 + sweep interval`
- [ ] AC-2 Confirmed emergency → no further tier starts after the confirming sweep cycle (ESC-1)
- [ ] AC-3 Tier attempt persisted as `escalation_attempt` row; second sweep on same tier is a no-op (ESC-4)
- [ ] AC-4 `EscalationAttempted` audited to HIST for every attempt (sent or failed) with `actorType=system` (ESC-7)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.escalation.EscalationSweepTest"` exits 0

## Dependencias
- EVNT-010 (precede — EscalationAttemptRepository)
- EVNT-013 (precede — CaregiverLinksPort)
- EVNT-014 (precede — HistAuditFeignClient for EscalationAttempted)
- EVNT-016 (precede — EscalationPolicy)
- EVNT-018 (precede — EmergencyNotificationPort implementation)
- EVNT-021 (precede — escalation config env)

## Estimativa
L

## Prioridade
P6
