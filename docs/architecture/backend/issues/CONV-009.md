# CONV-009 -- Flyway V0077 — IAM seed: 6 conv.* authorities in neuroassist_global + modelo_acesso_versao bump (D-639, SPEC-06)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Creates Flyway migration V0077 (global schema) that seeds the six `conv.*` permission codes
into the `neuroassist_global.permissao` table (or equivalent IAM catalogue table as defined
by the RBAC process, following the same pattern as ACS V0010 `iam_permissao_acs.sql`) and bumps
`neuroassist_global.modelo_acesso_versao`. The six authority codes are computed by the
English verb table (D-639): `conv.tree.read`, `conv.audio.read`, `conv.usage.record`,
`conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`. Without this migration,
ACS cannot mint a patient-session or TRN service-client token containing any `conv.*` authority,
which blocks all CONV endpoints at P4+. This migration is part of CONV's V0070–V0079 block but
is separated from the schema migrations (V0070–V0076) because it targets the global schema.

## Escopo
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0077__iam_permissao_conv.sql`
- [ ] confirmar o nome exacto da tabela de permissões lendo ACS V0010 `iam_permissao_acs.sql`

## Criterios de aceite
- [ ] AC-1 `V0077__iam_permissao_conv.sql` inserts exactly 6 rows with codes `conv.tree.read`, `conv.audio.read`, `conv.usage.record`, `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` into `neuroassist_global` permission catalogue; migration is idempotent (`INSERT ... ON CONFLICT DO NOTHING`)
- [ ] AC-2 `neuroassist_global.modelo_acesso_versao` is bumped after the inserts
- [ ] AC-3 Migration applies cleanly in a Testcontainers IT alongside V0070–V0076 (`./gradlew :neuroassist-niv-migrations:integrationTest` exits 0)

## Dependencias
- CONV-008 (precede — V0070–V0076 must come first in migration chain)

## Estimativa
S

## Prioridade
P3
