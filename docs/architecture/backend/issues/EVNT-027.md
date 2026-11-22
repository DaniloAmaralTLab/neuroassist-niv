# EVNT-027 -- BDD Cucumber features: out-of-band escalation tier ladder (ESC-4 idempotency, ESC-5 advance-on-failure, ESC-1 stop-on-confirm, EscalationAttempted HIST audit)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

End-to-end BDD scenarios for the SAFETY-1 escalation policy (SPEC-11). The sweep is triggered
manually in tests (not by the scheduler) to control timing. Scenarios: emergency committed →
Tier 0 Web Push attempted for all caregivers (WireMock push endpoint), `EscalationAttempted`
audited to HIST (WireMock); double sweep → no duplicate attempt row (ESC-4); caregiver has no
active push subscription → `failed no-subscription`, tier still advances to SMS; emergency confirmed
between Tier 1 and Tier 2 → Tier 2 never fires (ESC-1 stop-on-confirm); SMS/voice disabled →
`channel-disabled` recorded. Uses real Postgres Testcontainer; adapters stubbed where possible.

## Spec de referencia
- SPEC-11 (all ESC rules)
- docs/architecture/backend/services/evnt-service/tests/cucumber/out-of-band-escalation.feature

## Escopo
- [ ] implementar `src/test/resources/features/out-of-band-escalation.feature`
- [ ] implementar `src/test/java/com/neuroassist/evnt/bdd/EscalationSteps.java`
- [ ] WireMock stub for Web Push endpoint (200 and 410 scenarios)
- [ ] WireMock stub for HIST audit to verify `EscalationAttempted` envelope

## Criterios de aceite
- [ ] AC-1 Tier 0 Web Push: `EscalationAttempted` audit recorded for each linked caregiver with `channel=web_push`, `status=sent`
- [ ] AC-2 Double sweep on same emergency: second sweep inserts no new `escalation_attempt` row (ESC-4 — uq_escalation_tier)
- [ ] AC-3 No push subscription for caregiver: `escalation_attempt` recorded `status=failed, errorReason=no-subscription` (ESC-5)
- [ ] AC-4 Emergency confirmed before Tier 2 due: Tier 2 (`voice`) never fired — no `voice` row in `escalation_attempt` (ESC-1)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.bdd.EscalationSteps"` exits 0 against real PostgreSQL Testcontainer

## Dependencias
- EVNT-016 (precede — EscalationPolicy)
- EVNT-017 (precede — EscalationSweep)
- EVNT-018 (precede — WebPushAdapter)
- EVNT-025 (precede — CucumberSpringContext + PostgreSQLContainer setup)

## Estimativa
L

## Prioridade
P9
