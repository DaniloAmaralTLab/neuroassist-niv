# SPEC-10 — Integrations

## Objetivo
Especificar a única integração de runtime (PostgreSQL), o mecanismo de coleta de
scripts (G2), o gate de CI que mantém o Flyway dos serviços desabilitado, e as
integrações ausentes (para o scaffold não fiar nenhuma).

## Escopo
**In:** datasource admin PostgreSQL; coleta de scripts por agregação em build-time
(G2); gate de CI (INV-MIG-7); lista explícita de integrações ausentes.
**Out:** Eureka, broker, REST/Feign, TechLab AI, storage (todas ausentes).

## Decisões técnicas
- **PostgreSQL** é a única integração de runtime (ver `integration-contracts.md` §1).
- **Coleta de scripts (G2 — recomendação, revisável):** agregação em build-time dos
  blocos reservados de cada módulo para dois locations MIG
  (`db/migration/global`, `db/migration/tenant`); o `V1` flat local **não** é agregado
  nem aplicado (ADR-003). Ver `integration-contracts.md` §2.
- **Gate de CI (INV-MIG-7):** assere `spring.flyway.enabled: false` em todo serviço de
  negócio e que nenhum `V1` flat vazou para os locations de MIG. Ver
  `integration-contracts.md` §4.

## Integrações ausentes (registradas)
| Integração | Status |
|---|---|
| Eureka / discovery | ausente (ADR-002; MIG não é cliente) |
| Message broker | ausente (messaging desabilitado) |
| REST / Feign saída | ausente (MIG não chama serviço) |
| TechLab AI | ausente (`ai.hasAi = false`) |
| Blob / object storage | ausente |

## Casos de borda
- Serviço reabilita Flyway → gate de CI falha o build (doc 06 R2).
- `V1` flat vaza para o location MIG → gate de CI falha o build.

## Critérios de aceite (EARS)
`THE SYSTEM SHALL integrate with PostgreSQL only and SHALL NOT open any discovery, broker, REST, AI, or storage integration.`
`THE SYSTEM SHALL apply only reserved-block, schema-annotated scripts aggregated into its own classpath locations (ADR-003, resolves G2).`
`THE SYSTEM SHALL be the only Flyway runner; a CI gate SHALL keep every business service's spring.flyway.enabled=false (INV-MIG-7, A2).`
`IF a business service enables Flyway or a flat V1 leaks into MIG's locations, THEN THE CI gate SHALL fail the build.`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
