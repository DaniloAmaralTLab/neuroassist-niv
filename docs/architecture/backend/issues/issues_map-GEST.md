# Issues Map — GEST (Gesture Detection Edge)

> Service: `gest-service` · Module: **GEST** · Project: NeuroAssist NIV
> Generated: 2026-11-20 · Functional: 25 issues (GEST-001–GEST-025) · Integration: 5 issues

---

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (API surface) | GEST-001, GEST-002, GEST-003, GEST-004, GEST-005 |
| SPEC-02 (capability registry) | GEST-006, GEST-007, GEST-008, GEST-009, GEST-010, GEST-011 |
| SPEC-03 (support-check gate + PAT validation) | GEST-004, GEST-010, GEST-011, GEST-015, GEST-023, GEST-024 |
| SPEC-04 (data model + migrations) | GEST-005, GEST-012, GEST-013, GEST-014 |
| SPEC-05 (idempotency + concurrency) | GEST-009, GEST-011, GEST-014, GEST-025 |
| SPEC-06 (security) | GEST-016, GEST-018, GEST-019 |
| SPEC-07 (observability + health) | GEST-020, GEST-021, GEST-025 |
| SPEC-08 (BDD test scenarios) | GEST-022, GEST-023, GEST-024 |
| SPEC-09 (messaging disabled) | GEST-017 |
| SPEC-10 (integrations) | GEST-015, GEST-016, GEST-017, INT-GEST-PAT-001, INT-GEST-PAT-002, INT-GEST-ACS-001, INT-GEST-ACS-002 |

---

## By Priority

| Priority | Issues | Theme |
|---|---|---|
| P1 | GEST-001, GEST-002, GEST-003, GEST-004, GEST-005 | Scaffold + Controllers + DTOs |
| P2 | GEST-006, GEST-007, GEST-008, GEST-009, GEST-010, GEST-011 | Domain aggregates + Application services |
| P3 | GEST-012, GEST-013, GEST-014, INT-GEST-MIG-001 | Persistence + Migrations |
| P4 | GEST-015, GEST-016, GEST-017, INT-GEST-PAT-001, INT-GEST-PAT-002, INT-GEST-ACS-002 | External Feign integrations + HIST audit config |
| P5 | GEST-018, GEST-019, INT-GEST-ACS-001 | Security + authority guard |
| P7 | GEST-020, GEST-021 | Observability + health |
| P8 | GEST-022, GEST-023, GEST-024 | BDD end-to-end |
| P9 | GEST-025 | Hardening (ETag/304 + Feign resilience) |

---

## By Hexagonal Layer

| Layer | Issues |
|---|---|
| `api` (controllers, DTOs, mappers) | GEST-002, GEST-003, GEST-004, GEST-005, GEST-019, GEST-025 |
| `application` (services, ETagService) | GEST-008, GEST-009, GEST-010, GEST-011 |
| `domain` (aggregates, enums, ports) | GEST-006, GEST-007 |
| `infrastructure/persistence` | GEST-013, GEST-014 |
| `infrastructure/integration` (Feign) | GEST-015, GEST-016, GEST-017, GEST-025 |
| `infrastructure/auth` | GEST-018, GEST-019 |
| `infrastructure/health + web` | GEST-020 |
| `infrastructure/metrics` | GEST-021 |
| `resources/db/migration/global` | GEST-012 |
| Scaffold | GEST-001 |
| Test (BDD) | GEST-022, GEST-023, GEST-024 |

---

## Integration Issues Summary

| Issue | Target module | Description | GEST role |
|---|---|---|---|
| INT-GEST-PAT-001 | PAT | PAT to add `compoundWindowMs` to `Command` for compound-gesture timing | None — advisory |
| INT-GEST-PAT-002 | PAT/DASH | PAT/DASH to consume `support-check` for "not yet detectable" marker | Provides read surface |
| INT-GEST-ACS-001 | ACS/EDGE | Edge device token must carry `gest.capability.read` + `gest.engine.read` | Enforces authority |
| INT-GEST-ACS-002 | ACS/HIST | HIST audit: base URL + /hist path + `hist.audit.record` token (all 4 GEST facts hard-502, D-640 / ADR-005) | Config/token only |
| INT-GEST-MIG-001 | MIG | MIG to execute GEST Flyway V0050–V0059 against `neuroassist_global` | Provides SQL scripts |

---

## Dependency Chain (critical path)

```
GEST-001 (scaffold)
  └─ GEST-006 (EngineVersion domain)
       └─ GEST-007 (EngineCapability domain)
            └─ GEST-008 (EngineVersionService.register)
                 └─ GEST-009 (EngineVersionService.deprecate)
            └─ GEST-010 (CapabilityService.declare) ← GEST-015, GEST-017
                 └─ GEST-011 (CapabilityService.retire + checkSupport)
                      └─ GEST-022/023/024 (BDD)
  └─ GEST-012 (Flyway migrations)
       └─ GEST-013 (EngineVersionJpaAdapter)
       └─ GEST-014 (EngineCapabilityJpaAdapter) ← GEST-013
  └─ GEST-018 (SecurityConfig + RoleAuthorityPolicy)
       └─ GEST-019 (authority guard) ← GEST-016
```
