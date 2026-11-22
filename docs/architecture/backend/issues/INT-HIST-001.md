# INT-HIST-001 -- ACS must mint one service-client JWT per producer (acs-service, pat-service, edge-service, evnt-service, gest-service) with authority hist.audit.record; operator tokens must carry hist.audit.read + hist.erasure.create (ACS token-issuance amendment)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

HIST's `POST /hist/audit` is guarded by `hist.audit.record` (service-client only — no caregiver or
operator token is accepted on the ingest path). ACS issues the tokens; the token-issuance policy
must be amended to:

1. Register one dedicated service-client per producer (`acs-service`, `pat-service`,
   `edge-service`, `evnt-service`, `gest-service`) and include `hist.audit.record` in the
   `permissions` claim of each service-client token.
2. Extend operator tokens (issued by ACS to compliance operators) with `hist.audit.read` and
   `hist.erasure.create`.

This is an ACS configuration/code change — HIST only declares the required authorities and
validates incoming JWTs. HIST never issues tokens.

## Spec de referencia

- integration-contracts.md (HIST–ACS integration: service-client auth)
- api-contract.md §0 (authentication model — service-client only on POST /hist/audit)
- SPEC-06 (security — authority table)

## Escopo

- [ ] ACS: register `hist.audit.record` as a declared authority in ACS token-issuance config
- [ ] ACS: include `hist.audit.record` in the `permissions` claim for each of the 5 producer service-clients
- [ ] ACS: include `hist.audit.read` and `hist.erasure.create` in the `permissions` claim for operator tokens
- [ ] HIST smoke test: a service-client token minted by the amended ACS (or test fixture equivalent) is accepted on `POST /hist/audit`; operator token accepted on `GET /hist/audit` and `POST /hist/subjects/{id}/erasure`

## Criterios de aceite

- [ ] AC-1 Each of the 5 producer service-clients receives a JWT with `permissions` containing `hist.audit.record`
- [ ] AC-2 Operator JWT contains `hist.audit.read` and `hist.erasure.create`
- [ ] AC-3 `POST /hist/audit` with one of the amended service-client tokens → `201` (not `403`)
- [ ] AC-4 `POST /hist/audit` with an operator token (no `hist.audit.record`) → `403` (operator cannot ingest)
- [ ] AC-5 `GET /hist/audit` with a service-client token (no `hist.audit.read`) → `403` (producer cannot query)

## Dependencias

- HIST-011 (SecurityConfig in hist-service must be deployed before this IT can run end-to-end)

## Estimativa

S

## Prioridade
P4
