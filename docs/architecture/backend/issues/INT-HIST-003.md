# INT-HIST-003 -- Producer base-URL config change (all 5 producers) — set HIST_BASE_URL / hist.base-url including /hist path prefix (dev http://localhost:8083/hist; via REG lb://hist-service/hist); config-only, no producer code change; verify POST {hist.baseUrl}/audit resolves to POST /hist/audit

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

HIST serves its API under `/hist` base path (api-contract §0, `server.servlet.context-path=/hist`
or Spring MVC `@RequestMapping("/hist")`). Every producer calls `POST {hist.baseUrl}/audit`.
Decision (M2 key decisions): `HIST_BASE_URL` / `hist.base-url` **must include the `/hist` prefix**
(e.g., `http://localhost:8083/hist` for local dev; `lb://hist-service/hist` via service registry).

This is a **config-only** change in each producer's `application.yml` or `.env` — no producer
code or contract modification is needed. The existing `Feign` or `RestTemplate` call to
`${hist.base-url}/audit` will then resolve to the correct path.

Affects: `acs-service`, `pat-service`, `edge-service`, `evnt-service`, `gest-service`.

## Spec de referencia

- integration-contracts.md (producer→HIST base-URL contract)
- api-contract.md §0 (base path /hist, POST /hist/audit)

## Escopo

- [ ] Update `hist.base-url` / `HIST_BASE_URL` in each producer's config (dev + test profiles):
  `http://localhost:8083/hist` (dev), `lb://hist-service/hist` (service-registry profile)
- [ ] Verify that the Feign/HTTP client call `${hist.base-url}/audit` resolves to `POST /hist/audit`

## Criterios de aceite

- [ ] AC-1 Each producer's `application.yml` (dev profile) includes `hist.base-url: http://localhost:8083/hist`
- [ ] AC-2 Each producer's service-registry profile includes `hist.base-url: lb://hist-service/hist`
- [ ] AC-3 Integration smoke test: a producer POST using the configured base-url reaches HIST `AuditController.record` (not 404)
- [ ] AC-4 Old config (`http://localhost:8083` without `/hist`) returns `404`; this is a negative guard in the smoke test

## Dependencias

- HIST-002 (AuditController must be deployed before the smoke test)

## Estimativa

XS

## Prioridade
P5
