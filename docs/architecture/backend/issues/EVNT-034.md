# EVNT-034 -- EscalationSweep/EscalationPolicy — extend over detection_lapse subject including emergency precedence (SPEC-12 LAPSE-4/LAPSE-5/LAPSE-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ADR-006 reuses the SPEC-11 escalation engine for detection-lapse alerts. The `EscalationSweep`
"open subjects" set is **extended** to include open `detection_lapse` rows (resolved_at IS NULL
AND acknowledged_at IS NULL) alongside unconfirmed emergencies. For each open lapse the sweep
resolves linked caregivers via ACS (cached, INV-EVNT-7), asks `EscalationPolicy` for due tiers,
invokes `EmergencyNotificationPort`, and persists one `escalation_attempt` per attempt using the
generalised `lapse_id` column (EVNT-029). **Emergency precedence (LAPSE-6):** while the patient
has an unconfirmed emergency, the policy skips all lapse tiers for that patient. **Stop signals
(LAPSE-5):** a lapse is removed from the open set by `resolved_at` OR `acknowledged_at` (either
stops the next tier); the policy mirrors ESC-1 with these two signals instead of one. The
`uq_escalation_tier` on `subject_id` absorbs repeated sweeps idempotently (ESC-4).

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md §Implementation / LAPSE-4 / LAPSE-5 / LAPSE-6
- SPEC-11 (ESC-1..ESC-7 — reused)
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.3.1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/EscalationSweep.java` (extend open-subjects query to union detection_lapse open rows; write attempts using lapse_id)
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/EscalationPolicy.java` (add LAPSE-6 emergency-precedence check; apply LAPSE-5 two-signal stop condition for lapse subjects)
- [ ] implementar `src/test/java/com/neuroassist/evnt/application/EscalationPolicyLapseTest.java`

## Criterios de aceite
- [ ] AC-1 Sweep fires Tier 0 Web Push for an open lapse at T=0 s, Tier 1 SMS at T=30 s, Tier 2 voice at T=90 s — same ladder as SPEC-11 (LAPSE-4)
- [ ] AC-2 After EDGE resolves a lapse: next sweep fires no further tier for that lapse (LAPSE-5 — resolved_at stop signal)
- [ ] AC-3 After caregiver acknowledges a lapse: next sweep fires no further tier for that lapse (LAPSE-5 — acknowledged_at stop signal)
- [ ] AC-4 While patient has an unconfirmed emergency: sweep fires no new lapse tier for that patient; lapse escalation resumes only after the emergency is confirmed (LAPSE-6, INV-EVNT-3)
- [ ] AC-5 Repeated sweep over same open lapse: `uq_escalation_tier` on `subject_id` prevents duplicate attempt rows (ESC-4 generalised)
- [ ] AC-6 `./gradlew :evnt-service:test --tests "*.application.EscalationPolicyLapseTest"` exits 0

## Dependencias
- EVNT-029 (precede — escalation_attempt generalised schema with lapse_id + subject_id)
- EVNT-030 (precede — detection_lapse repository)
- EVNT-016 (precede — EscalationPolicy base, SPEC-11)
- EVNT-017 (precede — EscalationSweep base, SPEC-11)

## Estimativa
M

## Prioridade
P2
