# INT-FE-ACS-006 -- proxy.conf.json — dev proxy for /acs/* routes to acs-service port (not through api-gateway for direct dev)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`proxy.conf.json` in `neuroassist-niv-web` proxies `/acs/**` to the correct backend port for local development; requests do not go through the gateway if the gateway does not expose the `/acs/*` paths directly (carry-forward `http-client:wrong-target-service:e2e-api-calls-fail`; backend-api-cross-link §1).

## Approach (execution path)
1. Determine the correct proxy target: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/acs/caregivers/me` (gateway) vs `http://localhost:8081/acs/caregivers/me` (acs-service direct).
2. If gateway returns 404 for `/acs/*` paths and acs-service returns 401: add `/acs/**` → `http://localhost:8081` (direct to acs-service).
3. If gateway routes `/acs/**` correctly: use `http://localhost:8080` (gateway).
4. Update `frontend/apps/neuroassist-niv-web/proxy.conf.json` with the correct target.
5. Verify by running `npx nx serve neuroassist-niv-web` and navigating to `/access/caregivers` — network tab must show 401 (authenticated) or 200 (authed), not 404.
6. Document the acs-service dev port in `frontend/apps/neuroassist-niv-web/README.md` or project.json.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/neuroassist-niv-web/proxy.conf.json`
- [ ] `/acs/**` proxied to correct target (verify with curl before choosing)
- [ ] Requests to `/acs/*` do NOT return 404 when acs-service is running
- [ ] Dev server documented (which port acs-service runs on)
- [ ] `npx nx serve neuroassist-niv-web` PASS (network tab: /acs/caregivers/me returns 401 or 200)

## Acceptance criteria
- [ ] `GET /acs/caregivers/me` via the dev proxy returns 401 (not 404) when acs-service is running
- [ ] `proxy.conf.json` documents the target URL and port
- [ ] No `404 Not Found` for any `/acs/*` path with acs-service running

## Dependencies
FE-ACS-006 (CaregiverApiService — sends the actual requests), INT-FE-ACS-001 (gateway vs direct-port verification).

## Tenant-context impact
Proxy configuration is a dev-only concern; production traffic goes through the gateway.

## Prioridade
P4
