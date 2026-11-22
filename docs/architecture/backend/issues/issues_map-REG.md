# Issues Map — REG (Service Registry / Eureka)

Service: `neuroassist-niv-service-registry` · Type: `registry` · Stack: Java 21 / Spring Boot · No database · No messaging · No tenant schema.

## By Priority

| Issue | Title | Priority | Specs |
|---|---|---|---|
| REG-001 | Create Gradle subproject and Spring Boot bootstrap | P1 | SPEC-01, SPEC-02 |
| REG-002 | Configure application.yml: single-node, port 8761, dev profile | P1 | SPEC-01, SPEC-02, SPEC-03 |
| REG-003 | Create application-prod.yml: self-preservation enabled | P2 | SPEC-03 |
| REG-004 | Pin Spring Cloud Eureka Server version (Spring Boot 21 compatibility) | P2 | SPEC-01 |
| REG-005 | Restrict Eureka dashboard and protocol to internal network | P3 | SPEC-06 |
| REG-006 | Configure Actuator health, readiness, and liveness endpoints | P4 | SPEC-07, SPEC-01 |
| REG-007 | Expose Prometheus metrics endpoint with Eureka registry metrics | P4 | SPEC-07 |
| REG-008 | Implement structured lifecycle logging to Elasticsearch | P5 | SPEC-07, SPEC-10 |
| INT-REG-001 | Integration smoke test: all in-fleet services register with REG | P5 | SPEC-02, SPEC-10 |
| REG-009 | BDD step defs for service-registration.feature | P6 | SPEC-08, SPEC-02, SPEC-05 |
| REG-010 | BDD step defs for eviction-and-self-preservation.feature | P6 | SPEC-08, SPEC-02, SPEC-03 |
| REG-011 | BDD step defs for discovery-resolution.feature | P6 | SPEC-08, SPEC-02 |
| INT-REG-002 | Integration test: GWY resolves routes via REG | P6 | SPEC-02, SPEC-10 |
| REG-012 | Create Dockerfile for neuroassist-niv-service-registry | P7 | SPEC-01 |
| REG-013 | Add service to docker-compose.yml and verify startup order | P7 | SPEC-01, SPEC-10 |
| INT-REG-003 | Integration test: lifecycle logs reach Elasticsearch | P7 | SPEC-07, SPEC-10 |
| REG-014 | Verify runbook accuracy | P8 | SPEC-07, SPEC-01 |

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (API Surface) | REG-001, REG-002, REG-004, REG-005 (via network), REG-006, REG-012, REG-013, REG-014 |
| SPEC-02 (Registry Core) | REG-001, REG-002, REG-009, REG-010, REG-011, INT-REG-001, INT-REG-002 |
| SPEC-03 (Self-Preservation) | REG-002, REG-003, REG-010 |
| SPEC-04 (Data Model) | — (N/A: no database, no migration) |
| SPEC-05 (Idempotency) | REG-009 |
| SPEC-06 (Security) | REG-005 |
| SPEC-07 (Observability) | REG-006, REG-007, REG-008, REG-014, INT-REG-003 |
| SPEC-08 (BDD) | REG-009, REG-010, REG-011 |
| SPEC-09 (Messaging) | — (N/A: messaging disabled) |
| SPEC-10 (Integrations) | REG-008, REG-013, INT-REG-001, INT-REG-002, INT-REG-003 |

## By Layer

> REG has no hexagonal domain model — it is a configured Spring Cloud server. Layers are operational categories, not hexagonal layers.

| Category | Issues |
|---|---|
| Bootstrap / Scaffold | REG-001, REG-002, REG-003, REG-004 |
| Security posture | REG-005 |
| Observability / Health | REG-006, REG-007, REG-008, REG-014 |
| BDD / Tests | REG-009, REG-010, REG-011 |
| Container / Infra | REG-012, REG-013 |
| Integration | INT-REG-001, INT-REG-002, INT-REG-003 |

## Totals

- Functional issues: 14 (REG-001 — REG-014)
- Integration issues: 3 (INT-REG-001 — INT-REG-003)
- **Total: 17**
