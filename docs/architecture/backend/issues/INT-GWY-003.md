# INT-GWY-003 -- REG — confirm GWY registers with Eureka on startup and lb:// routes resolve for all eight business services

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

GWY's `lb://` routing is entirely dependent on REG (Eureka) being healthy and all
eight downstream services being registered. Without REG, the gateway's route table
is non-functional (503 for all routes). This INT issue covers the GWY side of
INT-REG-001 (fleet smoke test): confirms GWY itself registers as a client with REG
at startup, and that the eight downstream logical ids (acs-service, pat-service, etc.)
are resolvable via REG at the time the full stack is running.

## Spec de referencia

- SPEC-02 (routing — Eureka lb:// resolution)
- `contracts/integration-contracts.md` §3 (Eureka config keys)
- REG issue INT-REG-001 (fleet registration smoke test)

## Escopo

- [ ] Verify `neuroassist-niv-api-gateway` appears in the Eureka dashboard after startup
- [ ] Verify that a test request routed via `lb://acs-service` resolves through REG (at least one UP instance)
- [ ] Verify that the `depends_on` chain in `docker-compose.yml` ensures REG is healthy before GWY starts (coordinates with GWY-020)

## Resultado esperado

GWY registers with REG at startup and all eight `lb://` logical ids are resolvable,
confirming the full routing chain works end-to-end.

## Criterios de aceite

- [ ] AC-1 GWY appears in the Eureka registry (GET `/eureka/apps/NEUROASSIST-NIV-API-GATEWAY` returns a registered instance)
- [ ] AC-2 A test request to `GET /acs/actuator/health` via GWY returns a non-503 response when ACS is running and registered
- [ ] AC-3 `./gradlew :neuroassist-niv-api-gateway:integrationTest` exits 0 for the routing integration test (GWY-016)

## Dependencias

- GWY-007 (Eureka client config — required before REG registration works)
- REG-001 (REG must exist before GWY can register)

## Estimativa

S

## Prioridade
P4
