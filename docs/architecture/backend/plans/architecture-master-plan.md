# Architecture Master Plan

> Rastreia a camada de arquitetura (Layer 1 -- Architect) de cada modulo.
> Atualizado automaticamente (master-plan.py, D-371). NAO editar a mao.

Legenda de status: `pendente` | `em andamento` | `OK` | `bloqueado` | `N/A`

## Status por modulo

| Modulo | Servico | Vision | Specs | Specs-Validate | Backlog | Scaffold | Atualizado |
|---|---|---|---|---|---|---|---|
| ACS | acs-service | OK | OK | OK | OK | OK | 2026-11-19 |
| PAT | pat-service | OK | OK | OK | OK | OK | 2026-11-19 |
| EDGE | edge-service | OK | OK | OK | OK | OK | 2026-11-20 |
| EVNT | evnt-service | OK | OK | OK | OK | OK | 2026-11-20 |
| GEST | gest-service | OK | OK | OK | OK | OK | 2026-11-20 |
| HIST | hist-service | OK | OK | OK | OK | OK | 2026-11-20 |
| DASH | dash-service | OK | N/A | N/A | N/A | N/A | 2026-11-20 |
| CONV | conv-service | OK | OK | OK | OK | OK | 2026-11-22 |
| REG | neuroassist-niv-service-registry | OK | OK | N/A | OK | OK | 2026-11-22 |
| MIG | neuroassist-niv-migrations | OK | OK | N/A | OK | OK | 2026-11-22 |
| TRN | trn-service | OK | OK | OK | OK | OK | 2026-11-22 |
| GWY | neuroassist-niv-api-gateway | OK | OK | N/A | OK | OK | 2026-11-22 |

## Ledger de gates diferidos

| Data | Escopo | Gate | Comando de recuperacao | Status |
|---|---|---|---|---|
| 2026-11-20 | ACS/acs-service | bddGate | `gradle integrationTest (from acs-service dir)` | OK - 66/66 (2026-11-20: monolith AcsStepDefs merged into steps/AcsSteps + escaped; D-532 context; TenantJpaEntity double tenant_id mapping fixed to data-model 2.1) |
| 2026-11-20 | ACS/acs-service | architectureCheck | `gradle test --tests '*.architecture.*' (from acs-service dir)` | OK - 15/15 (ArchitectureTest 9, CrossAspectArchTest 5, PropertyValidationTest 1) |
| 2026-11-19 | PAT/pat-service | bddGate | `gradle integrationTest (from pat-service dir)` | OK - BUILD SUCCESSFUL (23s); CucumberIT + ApplicationContextLoadsIT passed; 2026-11-20 |
| 2026-11-20 | PAT/pat-service | architectureCheck | `gradle test --tests '*.architecture.*' (from pat-service dir)` | OK - 15/15 incl. RULE-09 (D-643 package fix, 2026-11-20) |
| 2026-11-20 | EDGE/edge-service | bddGate | `gradle integrationTest (from edge-service dir)` | OK - 34/34 (CucumberIT 33 dry-run + ApplicationContextLoadsIT 1); test 15/15; step glue deduped (monolith EdgeStepDefs removed) |
| 2026-11-20 | EDGE/edge-service | architectureCheck | `gradle test --tests '*.architecture.*' (from edge-service dir)` | OK - 15/15 incl. RULE-09 (D-643 package fix, 2026-11-20) |
| 2026-11-20 | EVNT/evnt-service | bddGate | `gradle integrationTest (from evnt-service dir)` | OK - BUILD SUCCESSFUL, 48/48 incl. detection-lapse-alerting (CucumberIT dry-run: context loads, 0 undefined, 0 duplicate steps) |
| 2026-11-20 | EVNT/evnt-service | architectureCheck | `gradle test --tests '*.architecture.*' (from evnt-service dir)` | OK - 15/15 incl. RULE-09 (D-643 package fix, 2026-11-20) |
| 2026-11-20 | EVNT/evnt-service | compileJava | `gradle compileJava (from evnt-service dir)` | OK (after Tier enum fix TIER_0..2) |
| 2026-11-20 | GEST/gest-service | bddGate | `gradle integrationTest (from gest-service dir)` | OK - Spring context up, 3/3 features, 0 failures (CucumberIT dry-run) |
| 2026-11-20 | GEST/gest-service | architectureCheck | `gradle test --tests '*.architecture.*' (from gest-service dir)` | OK - 15/15 incl. RULE-09 (D-643 package fix, 2026-11-20) |
| 2026-11-20 | HIST | ArchUnit-RULE09 | `gradle test --tests '*.architecture.*'` | RESOLVED 2026-11-20 by D-643 -> see HIST/hist-service architectureCheck |
| 2026-11-20 | HIST | CucumberIT-AmbiguousSteps | `gradle integrationTest` | RESOLVED 2026-11-20 (shadowed literal steps removed) -> see HIST/hist-service bddGate |
| 2026-11-20 | HIST | TenantContextFilter-Order | `SecurityConfig.addFilterAfter(BearerTokenAuthenticationFilter)` | DIFERIDO - TenantContextFilter @Order(HIGHEST_PRECEDENCE+50) runs before the bearer filter; register it inside the SecurityFilterChain (Layer 2, same in all services) |
| 2026-11-20 | HIST | SecurityConfig-EnableMethodSecurity | `Add @EnableMethodSecurity to SecurityConfig` | RESOLVED 2026-11-20 by D-642 (all 6 services) |
| 2026-11-20 | HIST/hist-service | bddGate | `gradle integrationTest (from hist-service dir)` | OK - 35/35 (CucumberIT dry-run: context loads, 0 undefined, 0 duplicate/shadowed steps after removing 7 literal steps shadowed by parametrized ones) |
| 2026-11-20 | HIST/hist-service | architectureCheck | `gradle test --tests '*.architecture.*' (from hist-service dir)` | OK - 15/15 incl. RULE-09 (D-643 package fix) |
| 2026-11-20 | HIST/hist-service | securityGate | `SecurityConfig @EnableMethodSecurity + authorities claim (D-642)` | OK - applied; enforcement proven in PAT MethodSecurityEnforcementIT 4/4 (same template) |
| 2026-11-20 | PAT/pat-service | securityGate | `gradle integrationTest --tests '*MethodSecurityEnforcementIT*' (from pat-service dir)` | OK - 4/4: no token 401; missing authority 403; authority in scope claim 403; authority in authorities claim passes (D-642) |
| 2026-11-20 | DASH/dash-service | backendPipeline | `ADR-001 dash-has-no-backend-service` | N/A - DASH has no backend (FE composition of PAT/EDGE/EVNT/HIST APIs); registry backendService kept as docs anchor; no MIG/GWY/REG entries |
| 2026-11-22 | REG/neuroassist-niv-service-registry | integrationTest | `gradle test (ApplicationContextLoadsIT)` | OK (1/1; test yml fixed: no eureka.client.enabled=false) |
| 2026-11-22 | MIG/neuroassist-niv-migrations | integrationTest (ApplicationContextLoadsIT) | `gradle :neuroassist-niv-migrations:test --tests '*.integration.*'` | OK — contextLoads passed (webEnvironment=NONE; no Docker needed) |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | compileJava | `gradle compileJava` | OK |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | architectureCheck | `gradle test --tests *.architecture.*` | OK (9 tests, RULE-01..06+09; RULE-03/07/08 vacuous - gateway has no domain/jpa) |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | authBoundary | `gradle test --tests *.security.*` | OK (D-642: 6/6 — unauthenticated→401, public→not401, invalid→401, expired→401, valid→503not401) |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | filterUnit | `gradle test --tests *.filter.*` | OK (4/4 — CorrelationId×2, TenantStrip×2) |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | phiAccessLog | `configure logback access log` | DIFERIDO (operational/logback config — Layer 2) |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | routeResilience | `configure resilience4j per-route circuit breaker + timeouts` | DIFERIDO (per-route CBR + timeout config — Layer 2) |
| 2026-11-22 | GWY/neuroassist-niv-api-gateway | errorBody502503504 | `implement custom ErrorWebExceptionHandler` | DIFERIDO (RFC7807 for 502/503/504 routing errors — Layer 2) |

## Log cronologico
- 2026-11-19T17:46:00 -- ACS -- M1 Vision -- OK -- BE 11 artifacts
- 2026-11-19T18:04:40 -- ACS -- Specs-Validate -- OK (gate diferido) -- EARS 0 issues, 46 clausulas->46 cenarios gerados, BDD gate diferido (scaffold nao rodou)
- 2026-11-19T22:12:45 -- PAT -- M1 Vision -- OK -- BE 12 artifacts (01..06, _brief, 4 local ADRs)
- 2026-11-22T09:37:44 -- CONV -- Specs -- OK -- 27 files; 6 conv.* authorities; Flyway V0070-V0079; HIST facts classified
- 2026-11-22T09:45:51 -- CONV -- Specs-Validate -- OK (gate diferido) -- 96 EARS, 29 scenarios; scaffold-format glue, quoted-Examples defect fixed; BDD gate deferred until scaffold
- 2026-11-22T10:19:42 -- CONV -- Scaffold -- OK -- arch 15/15, integration 39/39 (CucumberIT 34/34, MethodSecurityEnforcementIT 4/4); fixes: dual port adapter, EmbeddedKafka, doubled {string} quoting, shadowed literals
- 2026-11-22T10:39:02 -- REG -- Scaffold -- OK -- registry skeleton, package com.neuroassist.registry, 9 arch tests + context IT pass
- 2026-11-22T11:17:04 -- TRN -- Specs+Specs-Validate -- OK (gate diferido) -- 58 EARS, 31 scenarios (40 instances); 12 trn.* authorities; Flyway V0080-V0089; port 8089
- 2026-11-22T11:52:30 -- TRN -- Scaffold -- OK -- arch 15/15, integration 45/45 (CucumberIT 40/40, MethodSecurityEnforcementIT 4/4). Open: controller stubs diverge from api-contract (flat paths/PUT); POST /trn/sessions/{id}/dialog missing from generator-config application_services (TRN-007 must add)
