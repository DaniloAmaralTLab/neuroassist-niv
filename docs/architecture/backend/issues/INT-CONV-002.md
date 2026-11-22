# INT-CONV-002 -- INT-CONV-2: TRN publish service-client token — ACS must issue TRN service-client with conv.tree.publish, conv.tree-version.retire, conv.audio.delete (ACS INV-3, SPEC-10)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

Cross-module coordination issue (implementation tracked in ACS + TRN). ACS must issue a
TRN service-client token containing the three `conv.*` publish/lifecycle authorities:
`conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`. Without these authorities
in the TRN service-client token, all three lifecycle endpoints on CONV return `403`. The V0077
migration (CONV-009) seeds these codes in the IAM catalogue; ACS picks them up when assembling
the TRN service-client token. TRN must call CONV publish/retire/erase endpoints only with this
service-client token (never with a patient or user token).

## Escopo
- [ ] verificar no ACS `RoleAuthorityPolicy` que `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` estão no conjunto de authorities atribuíveis a service-client tokens da TRN

## Spec de referencia
- integration-contracts.md §4
- SPEC-10 §hub-integrations
- CONV-009 (V0077 seeds the codes)

## Criterios de aceite
- [ ] AC-1 TRN service-client token (minted by ACS) contains `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` in its `authorities` claim; verified by an ACS + CONV IT
- [ ] AC-2 `POST /conv/trees` with this token returns `201 Created` (not `403`)

## Dependencias
- CONV-009 (precede — V0077 seeds authorities in IAM catalogue)
- CONV-016 (precede — CONV SecurityConfig validates ACS-minted tokens)

## Estimativa
S

## Prioridade
P4
