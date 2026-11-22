# Data Scope Enforcement — How the BE/FE filters the data

> Technical strategy for applying [[data-scope]] **automatically and forget-proof**, without depending on the developer remembering to filter in each query.

## Architectural decision

**NeuroAssist NIV uses Hibernate Filter as the primary mechanism.** Alternatives evaluated and rejected are at the end of this doc.

| Layer | Mechanism | When it applies |
|---|---|---|
| **BE — standard query** | Hibernate `@Filter` activated by `TenantContextHolder` | Always — JPA repositories |
| **BE — custom query** | Explicit validation at the entry of the `application.service` | When using `EntityManager` directly / native query |
| **BE — controller** | Spring Security `@PostFilter` or `@PostAuthorize` | List derived from mixed sources |
| **FE — listings** | Backend already returns filtered data; FE only renders | Always — FE does not try to filter |
| **FE — conditional UI** | `*hideWhen="!can('com.venda.editar', venda)"` (custom directive) | Hide actions on items the user sees but cannot edit |

## Why Hibernate Filter (and not Postgres Row-Level Security)

- ✅ **Application-agnostic**: works with any database; switching away from Postgres does not break it.
- ✅ **Visible in code**: the filter is an `@Filter` on the entity — review catches it easily.
- ✅ **Performance**: the filter becomes a `WHERE` in the SQL; indexes work normally.
- ✅ **Testable**: integrates with Testcontainers without special privileges.
- ❌ Does not protect if someone uses `EntityManager.createNativeQuery()` directly — for those cases, manual validation.

Postgres RLS would be more bulletproof, but it requires configuring `SET LOCAL app.current_user`, complicates migrations and has a testing cost (Testcontainers as `postgres` instead of `app`).

## Backend structure

### 1. Filter definition on the entity

```java
// emp.<modulo>.infrastructure.persistence.entity.VendaEntity
package com.neuroassist.comercial.infrastructure.persistence.entity;

@Entity
@Table(name = "venda")
@FilterDef(
    name = "vendaPorVendedor",
    parameters = @ParamDef(name = "vendedorId", type = UUID.class)
)
@Filter(
    name = "vendaPorVendedor",
    condition = "vendedor_id = :vendedorId"
)
public class VendaEntity {
    @Id
    private UUID id;
    @Column(nullable = false)
    private UUID vendedorId;
    // ... other fields
}
```

### 2. Aspect that activates the filter per request

```java
// shared/tenant-context/src/main/java/com/neuroassist-niv/shared/security/DataScopeFilterAspect.java
@Component
@RequiredArgsConstructor
public class DataScopeFilterAspect {

    private final EntityManager em;
    private final AccessContextHolder accessCtx;
    @Around("execution(* com.neuroassist..application.service..*(..))")
    public Object aroundService(ProceedingJoinPoint pjp) throws Throwable {
        Session session = em.unwrap(Session.class);
        DataScope scope = accessCtx.requireDataScope();   // reads from the request context
        try {
            // Activates the filter corresponding to the scope type
            if ("VENDEDOR".equals(scope.tipo())) {
                session.enableFilter("vendaPorVendedor")
                       .setParameter("vendedorId", UUID.fromString(scope.valores().get(0)));
            } else if ("LOCAL_ESTOQUE".equals(scope.tipo())) {
                session.enableFilter("movimentoPorLocal")
                       .setParameter("localId", UUID.fromString(scope.valores().get(0)));
            } else if ("LOCAIS".equals(scope.tipo())) {
                session.enableFilter("movimentoPorLocais")
                       .setParameterList("localIds", scope.valoresUuid());
            }
            // tipo null = no restriction = does not activate a filter
            return pjp.proceed();
        } finally {
            session.disableAllFilters();   // cleans up on exit (so it does not leak between requests in the pool)
        }
    }
}
```

### 3. Application service (without needing to remember the filter)

```java
@Service
@Transactional
@RequiredArgsConstructor
public class ListarVendasService {

    private final VendaRepository repo;
    private final TenantContextHolder empresaCtx;
    public List<Venda> executar(ListarVendasQuery q) {
        empresaCtx.require();           // RULE-07 enforcement
        // The Hibernate filter is already active via DataScopeFilterAspect.
        // This query automatically returns only sales within the user's scope.
        return repo.findByDataEmissaoBetween(q.inicio(), q.fim())
                   .stream().map(toDomain()).toList();
    }
}
```

### 4. Custom query (without the automatic filter)

If you use `@Query("SELECT v FROM VendaEntity v WHERE ...")` or a native query, the filter **still applies** (Hibernate applies it to HQL/JPQL queries).

But if you use `EntityManager.createNativeQuery("SELECT * FROM venda ...")`, it **does not apply** — you must add it manually:

```java
// native query — apply the filter by hand
public List<RelatorioVenda> relatorio() {
    DataScope scope = accessCtx.requireDataScope();
    StringBuilder sql = new StringBuilder("SELECT ... FROM venda WHERE 1=1 ");
    if ("VENDEDOR".equals(scope.tipo())) {
        sql.append("AND vendedor_id = :vendedorId ");
    }
    Query q = em.createNativeQuery(sql.toString(), RelatorioVenda.class);
    if ("VENDEDOR".equals(scope.tipo())) {
        q.setParameter("vendedorId", scope.valores().get(0));
    }
    return q.getResultList();
}
```

There is an ArchUnit test that detects native queries without a call to `requireDataScope()`:

```java
@ArchTest
static final ArchRule nativeQueryDeveValidarDataScope =
    methods().that().areAnnotatedWith(Query.class)
             .and().areMetaAnnotatedWith(NativeQuery.class)
             .should().beAnnotatedWith(DataScopeValidated.class);
```

## Per-item validation (single read)

`GET /api/v1/comercial/vendas/{id}` must validate that the returned item is within scope:

```java
public Venda obter(UUID vendaId) {
    Venda venda = repo.findById(vendaId)
        .orElseThrow(() -> new NotFoundException("com.venda.nao-encontrada"));
    if (!accessCtx.scopeIncludes(venda.getVendedorId(), "VENDEDOR")) {
        throw new ForbiddenException("com.venda.fora-de-escopo");
    }
    return venda;
}
```

`accessCtx.scopeIncludes(<id>, <tipo>)` returns `true` if:
- `dataScope.tipo == null` (no restriction), OR
- `dataScope.tipo == <tipo>` and `<id> ∈ dataScope.valores`.

## Frontend

The FE **never filters sensitive data** — the backend already returns it filtered. But the FE can **hide actions** on items the user sees but cannot edit (rare with data_scope, but can happen with permissions).

```typescript
// In an Angular template
@if (access.can('com.venda.cancelar', venda)) {
  <button (click)="cancelar(venda)">Cancelar</button>
}
```

The `access.can(permissao, item?)` method uses the in-memory `AccessDecision` + (if `item` is given) compares against `dataScope`.

## Filter configuration per module

Each module declares its filters in `domain/persistence-filters.md`:

| Module | Filter name | Affected entities | data_scope type |
|---|---|---|---|
| comercial | `vendaPorVendedor` | VendaEntity, OrcamentoEntity, PedidoVendaEntity, ComissaoEntity | VENDEDOR |
| crm | `oportunidadePorVendedor` | OportunidadeEntity, LeadEntity, TarefaEntity | VENDEDOR |
| estoque | `movimentoPorLocal` | MovimentoEstoqueEntity, SaldoEstoqueEntity | LOCAL_ESTOQUE |
| estoque | `movimentoPorLocais` | MovimentoEstoqueEntity, SaldoEstoqueEntity | LOCAIS |
| estoque | `transferenciaPorLocal` | TransferenciaEstoqueEntity | LOCAL_ESTOQUE / LOCAIS |
| financeiro | `tituloReceberPorVendedor` | TituloReceberEntity (join with venda) | VENDEDOR |
| logistica | `entregaPorVendedor` | EntregaEntity (join with venda) | VENDEDOR |

## Rejected alternatives

### Postgres Row-Level Security (RLS)
- ✅ Bulletproof (the database enforces it)
- ❌ Requires `SET LOCAL app.current_user = ...` in each transaction (overhead)
- ❌ Testcontainers needs a different user to create the table vs. read it
- ❌ An error in the SET leaks data — without warning
- ❌ Complicated migrations (needs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)

### Spring Security `@PostFilter`
```java
@PostFilter("filterObject.vendedorId == authentication.dataScope")
public List<Venda> listar() { return repo.findAll(); }
```
- ✅ Declarative
- ❌ **Loads all rows from the DB** and filters in memory — a performance disaster in listings with thousands of records
- ❌ Pagination goes wrong (a page of 20 becomes 3 after filtering)

### Manual filtering in the service
- ✅ Explicit
- ❌ Gets forgotten — no way to guarantee that nobody skipped it
- ❌ Duplicates code

### MultiTenantConnectionProvider (Hibernate)
- ✅ Close to RLS (1 schema per tenant)
- ❌ Does not scale to per-user data_scope within the same schema (we already use it for tenant, not for salesperson)

## Anti-patterns

- ❌ Forgetting `session.disableAllFilters()` in the `finally` — leaks the filter between requests in the connection pool.
- ❌ Activating the filter BEFORE `empresaCtx.require()` — may pick up the wrong context.
- ❌ Filters with `OR null` (`WHERE vendedor_id = :id OR :id IS NULL`) — confuses the optimizer, loses the index.
- ❌ Applying data_scope in the FE as the only defense — always BE first.
- ❌ Hardcoded `where vendedor_id = '...'` in code — breaks the automatism.

## References

- data_scope concept + scenarios: [[data-scope]]
- RBAC model: [[modelo]]
- Hibernate Filters: https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#pc-filter
- Spring Security `@PostFilter`: https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html#postfilter-annotation
