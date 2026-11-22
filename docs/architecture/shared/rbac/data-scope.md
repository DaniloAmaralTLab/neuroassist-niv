# Data Scope — Restricting data within the tenant

> How NeuroAssist NIV **filters the data** a user may see, **within the same tenant**, based on attributes of the role or of the `usuario_empresa` association.

## The problem

Multi-tenant ([[multi-tenant]]) isolates data **between** tenants via schema-per-tenant. But within **a single tenant**, different roles need to see different slices of the data:

- **Salesperson João** is in `<tenant-schema-1>`. He sees all of the tenant's customers, but only **his own sales** (not Carlos's).
- **Salesperson Carlos** (also in `<tenant-schema-1>`) sees **his own sales**.
- **Manager Claudinei** sees sales from **all salespeople** in the tenant.
- **Warehouse clerk Pedro** operates only the **Galpão Principal SP stock**, and does not see movements from other warehouses.
- **ADMIN** sees everything.

Without data_scope, salesperson João could list Carlos's commissions — a horizontal leak.

## Canonical data_scope types

Defined by `usuario_empresa.data_scope` (VARCHAR) and/or `usuario_empresa.data_scope_tipo` (VARCHAR):

| Type | `data_scope_tipo` | `data_scope` (value) | Meaning | Typical roles |
|---|---|---|---|---|
| **No restriction** | `null` or `'EMPRESA_COMPLETA'` | `null` | Sees everything in the tenant | ADMIN, GERENTE, FISCAL, FINANCEIRO, AUDITOR |
| **Own documents (salesperson)** | `'VENDEDOR'` | `<vendedor_id>` (UUID) | Sees only records where `vendedor_id = <data_scope>` | VENDEDOR |
| **Own stock location** | `'LOCAL_ESTOQUE'` | `<local_id>` (UUID) | Sees only records where `local_id = <data_scope>` | ALMOXARIFE (when branch) |
| **Multiple locations** | `'LOCAIS'` | `<local1_id>,<local2_id>` (CSV) | Sees only records in the N listed locations | multi-branch ALMOXARIFE |
| **Own group** | `'GRUPO_VENDEDOR'` | `<gerente_id>` (UUID) | Sees own + subordinates' | Team supervisor |

> The schema of the `neuroassist_global.usuario_empresa` table (defined in [[modelo]] §4) already has the field `data_scope VARCHAR(50)`. We will add `data_scope_tipo VARCHAR(50)` in a future migration.

## Illustrated scenarios

### Scenario 1 — Maria, salesperson at ST Wood

**Setup:**
```sql
-- João = salesperson with ID 'venda-001'
-- Maria = salesperson with ID 'venda-002'
INSERT INTO neuroassist_global.usuario_empresa VALUES (
  'maria-user-id', '<tenant-schema-1>', 'VENDEDOR',
  data_scope_tipo='VENDEDOR', data_scope='venda-002'
);
```

**Maria makes GET `/api/comercial/v1/vendas`:**

1. The Spring Security filter reads the JWT, populates `TenantContextHolder.tenantId='<tenant-schema-1>'`.
2. `<service>` returns `AccessDecision`:
   ```json
   {
     "usuarioId": "maria-user-id",
     "tenantId": "<tenant-schema-1>",
     "papel": "VENDEDOR",
     "permissoes": ["com.venda.read", "com.venda.criar", ...],
     "dataScope": {
       "tipo": "VENDEDOR",
       "valor": "venda-002"
     }
   }
   ```
3. `<service>` reads `AccessDecision.dataScope` and applies the filter:
   ```sql
   SELECT * FROM <tenant-schema-1>.venda
   WHERE vendedor_id = 'venda-002'   -- ← automatic filter via data_scope
   ORDER BY data_emissao DESC
   ```
4. Response: only Maria's sales.

### Scenario 2 — Claudinei (manager)

Same call `GET /api/comercial/v1/vendas`, but role = GERENTE:

```json
{
  "papel": "GERENTE",
  "dataScope": null   // or {tipo: "EMPRESA_COMPLETA"}
}
```

`<service>` applies no additional filter — query without `WHERE vendedor_id`. He sees sales from all salespeople in `<tenant-schema-1>`.

### Scenario 3 — Pedro (multi-location warehouse clerk)

Pedro operates the Galpão Principal SP and the Galpão Secundário SP, but not the Filial RJ:

```sql
INSERT INTO usuario_empresa VALUES (
  'pedro-user-id', '<tenant-schema-1>', 'ALMOXARIFE',
  data_scope_tipo='LOCAIS', data_scope='local-principal-sp,local-secundario-sp'
);
```

`GET /api/estoque/v1/movimentos` returns only `WHERE local_id IN ('local-principal-sp', 'local-secundario-sp')`.

### Scenario 4 — Cross-salesperson forbidden

João makes `GET /api/comercial/v1/vendas/<id-da-Maria>`:
- BE validates: the sale exists, the `vendedor_id != joão.dataScope.valor`.
- Returns `403 Forbidden` with `error.code = "com.venda.fora-de-escopo"`.

Not to be confused with `404` — Maria's sale exists, it is just not accessible to João.

## AccessDecision structure

Canonical response of `POST /api/v1/iam/access/evaluate` (extends §5 of [[modelo]]):

```java
public record AccessDecisionResponse(
    UUID usuarioId,
    String tenantId,
    String papel,
    List<String> permissoes,
    DataScope dataScope,              // ← now structured
    long modeloAcessoVersao,
    SessionPolicy sessionPolicy
) {}

public record DataScope(
    String tipo,                       // VENDEDOR / LOCAL_ESTOQUE / LOCAIS / GRUPO_VENDEDOR / null
    List<String> valores               // 1 or N IDs; null = no restriction
) {}
```

## Which tables need data_scope

| Module | Table | Filter column | Who applies data_scope |
|---|---|---|---|
| COM | `venda` | `vendedor_id` | tipo='VENDEDOR' |
| COM | `orcamento` | `vendedor_id` | tipo='VENDEDOR' |
| COM | `pedido_venda` | `vendedor_id` (via venda) | tipo='VENDEDOR' |
| COM | `comissao_calculada` | `vendedor_id` | tipo='VENDEDOR' |
| CRM | `oportunidade` | `vendedor_id` | tipo='VENDEDOR' |
| CRM | `lead` | `responsavel_vendedor_id` | tipo='VENDEDOR' |
| EST | `movimento_estoque` | `local_id` | tipo='LOCAL_ESTOQUE' or 'LOCAIS' |
| EST | `transferencia_estoque` | `local_origem_id` OR `local_destino_id` | same |
| EST | `saldo_estoque` | `local_id` | same |
| FIN | `titulo_receber` | (via venda.vendedor_id) | tipo='VENDEDOR' |
| LOG | `entrega` | (via venda.vendedor_id) | tipo='VENDEDOR' (rare) |

## Conventions

- **VENDEDOR** always filters by `vendedor_id` — never by `cliente_id` (the salesperson sees all customers; just not other people's **sales**).
- **ALMOXARIFE** filters stock by `local_id`, but sees products/customers/suppliers normally.
- **GERENTE** never has data_scope — sees everything in the tenant.
- **AUDITOR** is always read-only without data_scope — sees everything, changes nothing.

## Anti-patterns

- ❌ Hardcoding `if (papel == 'VENDEDOR')` in the controller — always via automatic filter (see [[enforcement]]).
- ❌ Applying data_scope in the FE as the only defense — always validate in the BE (FE is just UX).
- ❌ Forgetting `data_scope` in a manual report query — the automatic filter only works on queries via the standard repository; custom queries must apply it manually.
- ❌ Configuring `data_scope_tipo='VENDEDOR'` but leaving `data_scope=null` — the user sees **nothing** (filter `WHERE vendedor_id = null` returns 0 rows).
- ❌ Changing a user's `data_scope` without bumping `modelo_acesso_versao` — the cached JWT keeps the old scope.

## References

- General RBAC model: [[modelo]]
- Technical enforcement (Hibernate Filter): [[enforcement]]
- `usuario_empresa` table: [[modelo]] §4
- Session policy: [[session-policy]]
