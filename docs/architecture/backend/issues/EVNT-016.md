# EVNT-016 -- Implement EscalationPolicy domain service — ESC-1..7 tier ladder, due-time computation, idempotency check

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Pure domain service (no I/O) that codifies the SPEC-11 escalation policy rules ESC-1..7. Given an
unconfirmed `emergency` Event, the elapsed time since `createdAt`, and the set of already-attempted
`(tier, caregiverId, channelTarget)` tuples (from `EscalationAttemptRepository`), it returns the
set of due tiers for each linked caregiver that have not yet been attempted (ESC-4 idempotency
applied here before invoking the port). Timing: Tier 0 at `T+0`, Tier 1 at `T+EVNT_ESCALATION_SMS_AFTER_SECONDS`,
Tier 2 at `T+EVNT_ESCALATION_VOICE_AFTER_SECONDS`. ESC-1: returns empty set when event is already
confirmed. This service has no Spring dependency — it is pure domain logic.

## Spec de referencia
- SPEC-11 §policy rules ESC-1..7
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.3

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/escalation/EscalationPolicy.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/escalation/TierDue.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/escalation/Channel.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/domain/escalation/EscalationPolicyTest.java`

## Criterios de aceite
- [ ] AC-1 Confirmed event → `computeDueTiers(...)` returns empty set (ESC-1)
- [ ] AC-2 Unconfirmed emergency at `T+0` → Tier 0 (web_push) is due for each linked caregiver (ESC-2/3)
- [ ] AC-3 Already-attempted `(event, tier, caregiverId, channelTarget)` is excluded from results (ESC-4)
- [ ] AC-4 Disabled channel (e.g. SMS_ENABLED=false) produces a due tier with `channel-disabled` reason, not an empty slot (ESC-5)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.domain.escalation.EscalationPolicyTest"` exits 0

## Dependencias
- EVNT-002 (precede — Event aggregate)
- EVNT-010 (precede — EscalationAttemptRepository for already-attempted check)

## Estimativa
M

## Prioridade
P6
