# INT-EVNT-ACS-003 -- HIST audit: base URL + /hist path + hist.audit.record token

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

HIST ADR-005 (accepted) and D-640 finalize the audit ingest contract. Two configuration facts must
hold for EVNT → HIST audit calls:

1. **Base URL / path (D-640).** The literal call `POST {hist.baseUrl}/audit` is unchanged, but
   `hist.base-url` / `HIST_BASE_URL` MUST resolve to the HIST root **including** the `/hist` segment
   (dev `http://localhost:8083/hist`; via REG `lb://hist-service/hist`) so the resolved URL is
   `/hist/audit`. Without `/hist` the call misses the controller (`404`). NOTE: the current
   `evnt-service` `HIST_BASE_URL` pointed at `http://localhost:8087` (wrong port) — corrected to
   `http://localhost:8083/hist`.
2. **Authority (hist-service api-contract §1).** The ACS-issued `evnt-service` service-client JWT used
   for the audit call MUST carry the `hist.audit.record` authority (the `evnt-service` principal is
   minted by ACS — INT-EVNT-002). ACS mints the token; EVNT's side is fixed. Do NOT edit ACS here.

Config/test only — no change to the EVNT write-path behaviour. Supersedes the open HIST-failure-policy
question (now resolved by ADR-005; see INT-EVNT-003).

## Spec de referencia

- integration-contracts.md (§4 EVNT → HIST — base URL incl. `/hist`, `hist.audit.record`)
- ../services/hist-service/contracts/integration-contracts.md (§1 D-640 path reconciliation)
- ../services/hist-service/contracts/api-contract.md (§1 authority `hist.audit.record`)

## Escopo

- [ ] set `HIST_BASE_URL=http://localhost:8083/hist` (dev; correct the stale `8087`) and the REG-resolved base `lb://hist-service/hist`
- [ ] ensure the `evnt-service` service-client token presented to HIST carries `hist.audit.record`

## Criterios de aceite

- [ ] AC-1 `{hist.baseUrl}/audit` resolves to `/hist/audit`; a WireMock IT asserts the request path is `/hist/audit`
- [ ] AC-2 the audit service-client JWT carries `hist.audit.record`; HIST accepts it (no `403`)
- [ ] AC-3 `./gradlew :evnt-service:integrationTest` exits 0

## Dependencias

- INT-EVNT-002 (precede — ACS service-client minting for `evnt-service`)
- INT-EVNT-003 (precede — HIST failure policy, resolved by ADR-005)
- EVNT-014 (precede — HistAuditFeignClient)

## Estimativa

S

## Prioridade
P4
