# Canonical roles — SQL seeds

> Applied in V1 of `neuroassist-niv-migrations` (schema `neuroassist_global`).
> Details of each role: [`modelo.md`](modelo.md) §1.
>
> **Source of truth:** `templates/architecture/decisions/rbac.arch.json` (D-058).
> This markdown is generated deterministically from that JSON.

## 1 standard roles (all tenants)

```sql
INSERT INTO neuroassist_global.papel (papel_id, codigo, nome, descricao, ativo) VALUES
  (gen_random_uuid(), 'FAMILY_CAREGIVER', 'Family Caregiver', 'To be notified reliably and in real time when the patient makes the configured gesture, without needing specialized hardware.', true);
```

## Permission bundles per role

The bundles are defined via `papel_permissao` and may change according to the business. Recommended canonical configuration:

### FAMILY_CAREGIVER

TODO: refine permissions — defaulted to `all` because per-role authority is not declared in discovery. Edit before going to production.

```sql
INSERT INTO neuroassist_global.papel_permissao (papel_id, permissao_id)
SELECT (SELECT papel_id FROM neuroassist_global.papel WHERE codigo='FAMILY_CAREGIVER'),
       permissao_id
FROM neuroassist_global.permissao;
```

## How to add a new role

1. Edit `templates/architecture/decisions/rbac.arch.json` — add an entry in `roles`.
2. Validate with `python scripts/arch_decisions.py validate --aspect rbac`.
3. Re-render this document (`new-project` P2 or equivalent command).
4. Bump `rbac.version` in the JSON (semver) and `last_changed`.
5. Migration: add `INSERT INTO neuroassist_global.papel` in `V<N>__iam_papel_<codigo>.sql` mirroring the new entry.
6. If it affects the UI, update `frontend/libs/iam/feature-permissoes/` to show the option.
7. Bump `neuroassist_global.modelo_acesso_versao` to invalidate the cache.

## Anti-patterns

- ❌ Editing this markdown directly — it is generated. The next render overwrites it.
- ❌ Creating an ad-hoc role per tenant — roles are **canonical to the group**; what changes is the `usuario_empresa` *association*.
- ❌ "Wildcard" permission bundle such as `*.*` — always list explicitly (audit needs to trace).
- ❌ Allowing GERENTE to access `iam.*` — privilege escalation.
