# INT-REG-001 -- Integration smoke test: all in-fleet services (ACS, PAT, EDGE, EVNT, CONV, GEST, HIST, TRN, GWY) register with REG on startup

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto
REG's value is validated only when the full fleet uses it. This integration test starts REG, then starts each in-fleet service (or a mock Eureka client simulating them), and verifies they all appear in the registry as UP. MIG and DASH are not Eureka clients (confirmed by `contracts/hub-integration.md §2`).

## Spec de referencia
- SPEC-02 (Registry Core — in-fleet registration)
- SPEC-10 (Integrations — in-fleet Eureka clients)
- contracts/integration-contracts.md §1

## Escopo
- [ ] implementar `src/test/java/com/neuroassist/registry/integration/FleetRegistrationIT.java` — start REG in an `@SpringBootTest` context; register mock Eureka clients for `acs-service`, `pat-service`, `edge-service`, `evnt-service`, `conv-service`, `gest-service`, `hist-service`, `trn-service`, `neuroassist-niv-api-gateway`; assert `GET /eureka/apps` returns all nine logical ids as UP
- [ ] add `@Tag("integration")` to the class so it can be excluded from the unit test suite and run separately

## Criterios de aceite
- [ ] AC-1: `./gradlew :services:neuroassist-niv-service-registry:test` (with integration tag included) exits 0
- [ ] AC-2: `GET /eureka/apps` after all mock clients register returns exactly 9 UP logical ids (acs-service, pat-service, edge-service, evnt-service, conv-service, gest-service, hist-service, trn-service, neuroassist-niv-api-gateway)
- [ ] AC-3: MIG and DASH do not appear in the registry (they are not Eureka clients)

## Dependencias
- REG-002 (precede)
- REG-013 (precede — compose integration requires Docker)

## Estimativa
S

## Prioridade
P5
