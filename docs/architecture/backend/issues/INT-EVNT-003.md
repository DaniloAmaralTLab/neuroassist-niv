# INT-EVNT-003 -- HIST failure policy — confirm hard-502-vs-enqueue for all EVNT audit writes (EventGenerated, AlarmConfirmed, FeedbackRecorded, EscalationAttempted)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT audits four domain actions to HIST synchronously (event-contracts §1). The failure policy
is currently: **prod → hard `502 audit-unavailable`; dev → log-only** (api-contract §2.1 TODO,
integration-contracts §4 TODO). The same open question was flagged by ACS, PAT, and EDGE. This
issue tracks the shared decision so EVNT-014 (HistAuditFeignClient) implements the right policy.
If HIST adopts an async enqueue (write-ahead log or outbox) instead of a synchronous retry,
EVNT must be updated to not hold the caller's response thread. The `EscalationAttempted` audit
(called by `EscalationSweep` asynchronously) is less latency-sensitive but still needs the
decision applied consistently.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1 (TODO[architect])
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §4 (TODO[architect])

## Escopo
- [ ] HIST team to confirm failure policy: hard-502 vs enqueue (outbox / async retry)
- [ ] EVNT-014 (HistAuditFeignClient) to implement the confirmed policy
- [ ] Dev profile: log-only override remains valid for local development (never blocks CI)
- [ ] `EscalationAttempted` audit policy aligned with the confirmed policy

## Criterios de aceite
- [ ] AC-1 HIST failure policy is documented and consistent across ACS/PAT/EDGE/EVNT
- [ ] AC-2 EVNT-014 implements the confirmed policy (hard-502 or enqueue) in the prod profile
- [ ] AC-3 Dev profile (`spring.profiles.active=dev`) degrades HIST failure to log-only without changing the response status
- [ ] AC-4 `EscalationAttempted` follows the same policy as `EventGenerated` / `AlarmConfirmed`

## Dependencias
- EVNT-014 (HistAuditFeignClient — policy applied here)

## Estimativa
S

## Prioridade
P4
