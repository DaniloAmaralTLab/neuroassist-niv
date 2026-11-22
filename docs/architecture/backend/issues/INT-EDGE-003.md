# INT-EDGE-003 -- HIST — confirm hard-502-vs-enqueue failure policy for EDGE audit write path (TODO[architect])

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

**HIST failure policy on the EDGE audit write path.** `event-contracts.md §1.1` and
`integration-contracts.md §3` both contain a `TODO[architect]`: confirm whether the HIST audit
failure on a device-lifecycle action should return hard `502 Bad Gateway` or enqueue the audit and
continue (non-blocking). The same open item was raised by ACS (INT-ACS-002) and PAT (INT-PAT-002);
the resolution must be **consistent across all services** (a per-module deviation complicates
recovery). EDGE's current scaffold target: hard `502` in prod, log-only in dev (integration-contracts.md §7).

**Action:** align the HIST failure policy with ACS/PAT resolution at scaffold time and update
EDGE-017 accordingly.

## Spec de referencia
- event-contracts.md §1.1 (TODO[architect] failure policy)
- integration-contracts.md §3 (HIST outbound, 2s timeout)

## Escopo
## Criterios de aceite
- [ ] AC-1 HIST failure policy (hard-502 vs enqueue) confirmed and consistent with ACS/PAT resolution
- [ ] AC-2 EDGE-017 (`HistAuditAdapter`) implements the confirmed policy with a test demonstrating the failure path

## Dependencias
- EDGE-017 (HistClient — failure path), INT-ACS-002, INT-PAT-002 (same decision)

## Estimativa
S

## Prioridade
P4
