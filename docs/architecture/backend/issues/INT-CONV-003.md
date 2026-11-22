# INT-CONV-003 -- INT-CONV-3: ACS patient-session authority scope — restricted to conv.tree.read, conv.audio.read, conv.usage.record and gest.* only (ACS INV-3, SPEC-06)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

Cross-module coordination issue (implementation tracked in ACS). The patient-session token
minted by ACS for a patient MUST carry exactly `conv.tree.read`, `conv.audio.read`,
`conv.usage.record` (and `gest.*` for the gesture station), and nothing else from the `conv.*`
namespace (ACS INV-3). If ACS includes extra `conv.*` authorities (e.g. `conv.tree.publish`) in
the patient-session token, the patient could access TRN-only endpoints, violating the security
model. CONV validates this via the `@PreAuthorize` checks but ACS is responsible for the token
contents. The V0077 migration seeds the codes; ACS reads them when assembling the patient-session
token scope.

## Escopo
- [ ] validar no ACS authority-assignment policy que `conv.tree.publish`/`conv.tree-version.retire`/`conv.audio.delete` não são incluídos no patient-session scope

## Spec de referencia
- SPEC-06 (authority set + token split)
- SPEC-10 §hub-integrations
- ACS INV-3

## Criterios de aceite
- [ ] AC-1 ACS-minted patient-session token for a patient contains `conv.tree.read`, `conv.audio.read`, `conv.usage.record` and does NOT contain `conv.tree.publish`, `conv.tree-version.retire`, or `conv.audio.delete`; verified by ACS unit test of token assembly
- [ ] AC-2 `POST /conv/trees` with this token returns `403 Forbidden` (CONV-027 AC-2)

## Dependencias
- CONV-027 (complementary — MethodSecurityEnforcementIT covers this scenario from CONV's side)
- CONV-009 (precede — V0077 seeds authorities)

## Estimativa
S

## Prioridade
P4
