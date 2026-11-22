# SPEC-01 — API Surface (Runner CLI)

## Objetivo
Definir a superfície de invocação de MIG — não há API HTTP; a "superfície" é o
**contrato de runner por linha de comando** (modos, validação, códigos de saída).

## Escopo
**In:** run modes (`--all` / `--global-only` / `--tenant <id>` / `--provision-tenant
<id>`), validação de argumentos, códigos de saída, variáveis de ambiente lidas.
**Out:** qualquer endpoint HTTP, porta de servidor, recurso REST, autenticação de
chamador (a confiança de invocação é o shell de ops / sistema de deploy).

## Decisões técnicas
- Spring Boot **não-web** `CommandLineRunner` (ADR-002): `spring.main.web-application-type:
  none`, sem `server.port`, sem servidor embarcado, não é cliente Eureka.
- Contrato completo em `contracts/api-contract.md`.

## Implementação (componentes)
- `MigrationsJobRunner` (`CommandLineRunner`) — parse do modo, orquestra passes, define exit code.
- `MigrationMode` (enum) — `ALL | GLOBAL_ONLY | TENANT | PROVISION_TENANT`.
- Parse e validação de argumentos **antes** de qualquer DDL.

## Casos de borda
- Nenhum modo / mais de um modo → erro de uso (exit 1), nada aplicado.
- `--tenant`/`--provision-tenant` sem `<id>` ou com `<id>` malformado → exit 1.
- `--tenant <id>` para schema inexistente → exit non-zero (usar `--provision-tenant`).
- `--provision-tenant <id>` para schema existente → idempotente (só migra).

## Critérios de aceite (EARS)
`THE SYSTEM SHALL run as a one-shot CLI job and exit after the requested pass.`
`THE SYSTEM SHALL expose no HTTP endpoint and no server port.`
`THE SYSTEM SHALL accept exactly one run mode per invocation.`
`IF no run mode or more than one is supplied, THEN THE SYSTEM SHALL print usage and exit 1 without touching any schema.`
`IF --tenant or --provision-tenant is supplied without a valid <tenantId>, THEN THE SYSTEM SHALL reject the invocation and exit 1.`
`WHEN every requested schema reaches its target version, THE SYSTEM SHALL exit 0 (including the no-op case).`
`IF applying a schema fails, THEN THE SYSTEM SHALL abort, name the failing schema, and exit 2.`

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
