# SPEC-03 — Tenant Provisioning and Enumeration (Sub-feature)

## Objetivo
Especificar como MIG descobre os schemas `t_<tenantId>` existentes e como provisiona
um novo (`--provision-tenant`), mantendo todos os tenants convergentes na mesma versão.

## Escopo
**In:** enumeração de `t_*`, criação não-transacional do schema, aplicação do
tenant-template a um novo schema, idempotência de provisionamento.
**Out:** onboarding dinâmico de SaaS, workflow de tenant registry canônico (G3 —
aberto), ETL cross-tenant (fora de escopo, `_brief.md` §5).

## Decisões técnicas
- **Enumeração (MVP):** lista `t_*` de `information_schema.schemata` (prefixo
  `MIG_TENANT_SCHEMA_PREFIX`, default `t_`). Doc 06 **G3** (uma tabela canônica de
  tenant registry como fonte, e seu dono) permanece **aberta** — não bloqueia o MVP.
- **Criação não-transacional:** `SchemaAdmin.createSchema()` roda `CREATE SCHEMA` via
  JDBC admin **fora** de qualquer `@Transactional` (INV-MIG-6) antes de invocar o
  `FlywayRunner` — evita o deadlock cross-connection (doc 06 R5).
- **Convergência:** `--provision-tenant` traz o novo schema à versão corrente do
  tenant-template; um `--all` posterior reaplica blocos de tenant mais novos a todos.

## Implementação (componentes)
- `TenantSchemaEnumerator` — `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 't\_%'`.
- `SchemaAdmin.createSchemaIfAbsent(t_<id>)` — não-transacional, idempotente.
- Derivação do nome: `t_<tenantId>`, idêntica ao ponto de criação/ops (A4, doc 06 R8).

## Casos de borda
- `--provision-tenant <id>` com `t_<id>` já existente → não recria; só migra (idempotente).
- `<tenantId>` que produza nome de schema inválido → rejeitado (exit 1, SPEC-01).
- Novo bloco de tenant adicionado depois → `--all` reaplica a todos os `t_*`.
- Zero tenants → enumeração retorna vazio; `--all` faz só o global pass.

## Critérios de aceite (EARS)
`WHEN --provision-tenant <tenantId> runs and t_<tenantId> is absent, THE SYSTEM SHALL create it outside any transaction and migrate it to the current version (INV-MIG-6).`
`WHEN --provision-tenant <tenantId> runs and t_<tenantId> already exists, THE SYSTEM SHALL skip creation and only migrate it (idempotent).`
`WHEN enumerating tenants, THE SYSTEM SHALL list schemas matching the t_ prefix from information_schema.`
`THE SYSTEM SHALL derive the schema name as t_<tenantId> identically to the provisioning/creation point (A4).`
`WHEN a new tenant-template version is applied via --all, THE SYSTEM SHALL bring every existing t_<tenantId> to that version (INV-MIG-1).`
`IF a <tenantId> yields an invalid schema name, THEN THE SYSTEM SHALL reject it and exit 1.`

## Gaps/Deferidos
- **G3** — fonte canônica de enumeração (tabela de tenant registry vs
  `information_schema`) e seu dono (ACS/platform-ops) — **aberto**, não bloqueante.

Guia EARS: `docs/architecture/backend/standards/ears-notation.md`.
