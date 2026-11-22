# INT-PAT-002 -- HIST failure policy — confirm hard 502 vs enqueue-and-retry against hist-service contract

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

PAT's write path audits every domain action to HIST synchronously (event-contracts §1).
The current spec mandates `502 Bad Gateway` on HIST failure (hard-502 policy) in production,
with log-only degradation in dev. However, `event-contracts.md §1` leaves a TODO[architect]:
"confirm the HIST failure policy (hard 502 vs enqueue-and-retry) against the live hist-service
contract during backlog/scaffold". This mirrors the same open item from ACS.

The choice matters for PAT-015 (HistAuditAdapter): a hard-502 adapter is simpler but blocks
the user request on transient HIST downtime; an enqueue-and-retry adapter is more resilient
but adds complexity and requires a durable outbox. The decision must be confirmed against the
live HIST contract before PAT-015 is implemented.

## Spec de referencia

- event-contracts.md (§1, TODO[architect] failure policy)
- integration-contracts.md (§2 PAT → HIST)
- SPEC-09 (messaging architecture, HIST resilience)

## Escopo

- [ ] confirmar a política de falha HIST (hard 502 vs enqueue-and-retry) com o time do hist-service
- [ ] atualizar event-contracts.md §1 removendo o TODO[architect]
- [ ] ajustar PAT-015 HistAuditAdapter conforme a decisão confirmada

## Criterios de aceite

- [ ] AC-1 event-contracts.md §1 não contém mais TODO[architect] e documenta a política de falha com rationale
- [ ] AC-2 PAT-015 HistAuditAdapter implementa a política confirmada (hard-502 OU outbox-retry)
- [ ] AC-3 `./gradlew :pat-service:test` exits 0 com testes que cobrem o caminho de falha do HIST

## Dependencias

- PAT-015 (precede — HistAuditAdapter)

## Estimativa

S

## Prioridade
P4
