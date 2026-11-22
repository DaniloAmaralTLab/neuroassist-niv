# INT-PAT-006 -- HIST audit: base URL + /hist path + hist.audit.record token

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

HIST ADR-005 (accepted) and D-640 finalize the audit ingest contract. Two configuration facts must
hold for PAT → HIST audit calls:

1. **Base URL / path (D-640).** The literal call `POST {hist.baseUrl}/audit` is unchanged, but
   `hist.base-url` / `HIST_BASE_URL` MUST resolve to the HIST root **including** the `/hist` segment
   (dev `http://localhost:8083/hist`; via REG `lb://hist-service/hist`) so the resolved URL is
   `/hist/audit`. Without `/hist` the call misses the controller (`404`).
2. **Authority (hist-service api-contract §1).** The ACS-issued `pat-service` service-client JWT used
   for the audit call MUST carry the `hist.audit.record` authority. ACS mints the token; PAT's side is
   fixed (present the token). Do NOT edit ACS here.

Config/test only — no change to the PAT write-path behaviour. Supersedes the open HIST-failure-policy
question (now resolved by ADR-005; see INT-PAT-002).

## Spec de referencia

- integration-contracts.md (§2 PAT → HIST — base URL incl. `/hist`, `hist.audit.record`)
- ../services/hist-service/contracts/integration-contracts.md (§1 D-640 path reconciliation)
- ../services/hist-service/contracts/api-contract.md (§1 authority `hist.audit.record`)

## Escopo

- [ ] set `HIST_BASE_URL=http://localhost:8083/hist` (dev) and the REG-resolved base `lb://hist-service/hist`
- [ ] ensure the `pat-service` service-client token presented to HIST carries `hist.audit.record`

## Criterios de aceite

- [ ] AC-1 `{hist.baseUrl}/audit` resolves to `/hist/audit`; a WireMock IT asserts the request path is `/hist/audit`
- [ ] AC-2 the audit service-client JWT carries `hist.audit.record`; HIST accepts it (no `403`)
- [ ] AC-3 `./gradlew :pat-service:integrationTest` exits 0

## Dependencias

- INT-PAT-002 (precede — HIST failure policy, resolved by ADR-005)
- PAT-015 (precede — HistAuditPort adapter)

## Estimativa

S

## Prioridade
P4
