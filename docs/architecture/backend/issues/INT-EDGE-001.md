# INT-EDGE-001 -- EVNT — confirm gesture-report authority string in edge.device token (G5 TODO[architect], EVNT not yet architected)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

**Cross-module dependency on EVNT (not yet architected).** The `edge.device` token minted by EDGE
carries a third authority beyond `edge.heartbeat.record` and `edge.catalog.read`: the EVNT
gesture-report right that lets the edge station report a recognized gesture to `evnt-service` using
its device token (integration-contracts.md §6, G5). The authority string and report endpoint belong
to EVNT. EDGE must embed the EVNT authority in every minted device token (EDGE-020), but CANNOT do
so until EVNT's authority namespace is defined.

**Open TODO[architect]:** confirm the EVNT report authority string (e.g., `evnt.gesture.report`)
and align it in EDGE-020 when EVNT is architected. Track in EDGE's `integration-contracts.md §6`.

## Spec de referencia
- integration-contracts.md §6 (G5 — EVNT boundary, EDGE's half only)
- SPEC-06 (token claims, INV-EDGE-2 — authorities must not include non-EDGE namespaces until confirmed)

## Escopo
## Criterios de aceite
- [ ] AC-1 EVNT authority string confirmed and documented in `integration-contracts.md §6`
- [ ] AC-2 EDGE-020 updated to embed the confirmed authority in the minted `edge.device` token
- [ ] AC-3 EDGE JWKS (`GET /edge/.well-known/jwks.json`) trusted by EVNT for token verification

## Dependencias
- EDGE-020 (token minting — authority list incomplete until this resolves)
- Blocked on EVNT architecture phase

## Estimativa
S

## Prioridade
P2
