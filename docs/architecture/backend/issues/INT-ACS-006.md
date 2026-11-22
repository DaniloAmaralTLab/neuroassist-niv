# INT-ACS-006 -- HIST audit: base URL + /hist path + hist.audit.record token

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

HIST ADR-005 (accepted) and D-640 finalize the audit ingest contract. Two configuration facts
must hold for ACS → HIST audit calls:

1. **Base URL / path (D-640).** The literal call `POST {hist.baseUrl}/audit` is unchanged, but
   `hist.base-url` / `HIST_BASE_URL` MUST resolve to the HIST root **including** the `/hist` segment
   (dev `http://localhost:8083/hist`; via REG `lb://hist-service/hist`) so the resolved URL is
   `/hist/audit`. Without `/hist` the call misses the controller (`404`).
2. **Authority (hist-service api-contract §1).** The ACS-issued service-client JWT used for the audit
   call MUST carry the `hist.audit.record` authority. ACS is the authority issuer, so it mints its own
   service-client token with this scope (no cross-module ACS gap).

Config/test only — no change to the ACS write-path behaviour. Supersedes the open HIST-failure-policy
question (now resolved by ADR-005; see INT-ACS-001).

## Spec de referencia

- integration-contracts.md (§2.1 ACS → HIST — base URL incl. `/hist`, `hist.audit.record`)
- ../services/hist-service/contracts/integration-contracts.md (§1 D-640 path reconciliation)
- ../services/hist-service/contracts/api-contract.md (§1 authority `hist.audit.record`)

## Escopo

- [ ] set `HIST_BASE_URL=http://localhost:8083/hist` (dev) and the REG-resolved base `lb://hist-service/hist`
- [ ] ensure the ACS-minted service-client token for the audit call carries `hist.audit.record`

## Criterios de aceite

- [ ] AC-1 `{hist.baseUrl}/audit` resolves to `/hist/audit`; a WireMock IT asserts the request path is `/hist/audit`
- [ ] AC-2 the audit service-client JWT presented to HIST carries `hist.audit.record`; HIST accepts it (no `403`)
- [ ] AC-3 `./gradlew :acs-service:integrationTest` exits 0

## Dependencias

- INT-ACS-001 (precede — ACS → HIST audit integration)
- ACS-016 (precede — HistClient / HistAuditPortAdapter)

## Estimativa

S

## Prioridade
P4
