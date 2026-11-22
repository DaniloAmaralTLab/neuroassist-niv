# INT-REG-002 -- Integration test: GWY resolves downstream service routes via REG (Feign/LoadBalancer name resolution)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto
GWY uses REG for name-based routing: its routes are defined with logical service IDs (e.g. `lb://acs-service`) and Spring Cloud LoadBalancer resolves them via the Eureka registry. This integration test validates that GWY can resolve a downstream service route through REG without a hardcoded host:port.

## Spec de referencia
- SPEC-02 (Registry Core — discovery query)
- SPEC-10 (Integrations — GWY as Eureka client)
- contracts/integration-contracts.md §1

## Escopo
- [ ] implementar `src/test/java/com/neuroassist/registry/integration/GatewayDiscoveryIT.java` — start REG; register a mock `acs-service` instance; use a `DiscoveryClient` bean (or REST call to `GET /eureka/apps/acs-service`) to assert the logical id resolves to the mock instance's host and port; assert no hardcoded host:port is present in GWY's route configuration
- [ ] add `@Tag("integration")` to the class

## Criterios de aceite
- [ ] AC-1: `./gradlew :services:neuroassist-niv-service-registry:test` (with integration tag) exits 0
- [ ] AC-2: `GET /eureka/apps/acs-service` after mock client registers returns the instance with `status=UP` and correct `instanceId`
- [ ] AC-3: GWY route config (`spring.cloud.gateway.routes[*].uri`) uses `lb://` prefix, not a hardcoded `http://localhost:NNNN` for any in-fleet service

## Dependencias
- INT-REG-001 (precede)

## Estimativa
S

## Prioridade
P6
