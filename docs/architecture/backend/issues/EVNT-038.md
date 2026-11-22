# EVNT-038 -- HIST audit payload: commandLabel on EventGenerated + masked maskedTarget on EscalationAttempted

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

HIST's caregiver timeline (`hist-service` api-contract §2 / data-model §7, gaps G-HIST-1 and G-HIST-3)
projects two fields from the EVNT audit payloads it already receives:

- `EventGenerated.commandLabel` — the family's word ("Water"). EVNT already holds it as the
  `event.command_label` snapshot (data-model §2.1 / ADR-004), but the `EventGenerated` audit payload
  did not include it, so HIST had to omit the field. This issue emits the held snapshot into the audit
  payload. It is a crypto-shred **personal** field (HIST data-model §6).
- `EscalationAttempted.maskedTarget` — the escalation destination, **masked inside EVNT before the
  audit call** with the same rule as `GET /evnt/events/{eventId}/escalation-attempts` (api-contract
  §3.4): phone (`sms`/`voice`) → last 4 digits (`+55•••••1234`); web-push → endpoint host / label only
  (`sub:chrome-…`). The raw `channel_target` never leaves EVNT in the audit; HIST renders the masked
  form verbatim and never unmasks (G-HIST-3, SPEC-06).

Additive-compatible: `payloadVersion` stays `1` (event-contracts §4) — both fields are optional; an
older producer stays valid and HIST omits the timeline field when absent. **Code + test only** — no
migration, no new column (both values come from existing state).

## Spec de referencia

- contracts/event-contracts.md (§1.2 action catalog + HIST caregiver-timeline fields + §4 versioning)
- contracts/api-contract.md (§3.4 destination masking rule)
- spec/backend/SPEC-02-event-generation.md (EventGenerated audit)
- spec/backend/SPEC-11-emergency-escalation.md (ESC-7)
- ../services/hist-service/contracts/api-contract.md (§2 structured entry fields — G-HIST-1/G-HIST-3)
- ../services/hist-service/contracts/data-model.md (§6 crypto-shred, §7 timeline projection)

## Escopo

- [ ] include `commandLabel` (from the `event.command_label` snapshot) in the `EventGenerated` audit envelope built in the audit mapper under `src/main/java/com/neuroassist/evnt/application/` / `infrastructure/feign/` (`AuditPort` / `HistAuditFeignClient`); omit when no snapshot is held
- [ ] mask the escalation destination inside EVNT (reuse the api §3.4 masking helper) and set `maskedTarget` on the `EscalationAttempted` audit payload; never place the raw `channel_target` in the audit envelope

## Criterios de aceite

- [ ] AC-1 an `EventGenerated` audit envelope carries `payload.commandLabel` equal to the persisted `event.command_label`; `payloadVersion` stays `1`
- [ ] AC-2 an `EscalationAttempted` audit envelope carries `payload.maskedTarget` in masked form (phone → last 4 digits; push → endpoint host/label) and never the raw `channel_target`; `payloadVersion` stays `1`
- [ ] AC-3 `./gradlew :evnt-service:test` exits 0

## Dependencias

- EVNT-014 (precede — HistAuditFeignClient / AuditPort)
- EVNT-004 (EventGenerated audit path), EVNT-017 (EscalationAttempted audit path)

## Estimativa

S

## Prioridade

P9
