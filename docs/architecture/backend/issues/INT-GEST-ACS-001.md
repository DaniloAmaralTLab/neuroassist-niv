# INT-GEST-ACS-001 -- ACS/EDGE to include gest.capability.read and gest.engine.read in edge.device token

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
The station (edge device) must run the GEST "detectable" gate (`POST /gest/capabilities/support-check`)
at catalog-load time — typically before any active patient-session JWT is available. GEST validates
the authority via JWKS; it does not mint or modify tokens. The `edge.device` token MUST therefore carry
`gest.capability.read` and `gest.engine.read`. This provisioning task belongs to ACS (token issuance)
and EDGE (device pairing flow). This issue is handed to ACS/EDGE.

## Spec de referencia
- contracts/integration-contracts.md §6 (INT-GEST-ACS-1)
- contracts/api-contract.md §1.2 (station authentication decision)
- SPEC-06 (security — station auth)
- SPEC-10 (integrations §5)

## Escopo
- [ ] ACS to include `gest.capability.read` and `gest.engine.read` in the authority set granted to the
  `edge.device` token during device enrolment/pairing.
- [ ] EDGE pairing flow to verify the provisioned token carries the required GEST authorities before
  confirming the pairing as complete.

## Resultado esperado
A newly-paired device token carries `gest.capability.read` and `gest.engine.read` without a patient-
session JWT. GEST `support-check` accepts the token and returns `200`. GEST has no code change.

## Criterios de aceite
- [ ] AC-1: After pairing, the `edge.device` JWT introspected at ACS includes both `gest.capability.read` and `gest.engine.read` in its `authorities` claim.
- [ ] AC-2: `POST /gest/capabilities/support-check` with the `edge.device` token (no patient-session) returns `200` (not `403`).
- [ ] AC-3: GEST service has NO code change as a result of this issue. GEST enforces the authority; provisioning it is ACS/EDGE's responsibility.

## Dependencias
- GEST-004 (precede — SupportCheckController, the endpoint ACS/EDGE will test against)
- GEST-019 (precede — authority guard confirms `gest.capability.read` on support-check path)

## Estimativa
M

## Prioridade
P5
