# RBAC Model & Access Matrix (NeuroAssist NIV)

> Model of roles, permissions and access decision for NeuroAssist NIV.
> Simple by design: a family group of tenants, no multi-customer SaaS, no multi-SSO.

## When to use this file

- Implement roles, permissions or access evaluation logic.
- Work on authorization guards/filters.
- Add a new permission key to a module.
- Implement tenant switching for a user with access to multiple tenants.

---

## 1. Canonical roles (NeuroAssist NIV)

NeuroAssist NIV has **6 standard roles** (scoped per tenant via `usuario_empresa`):

| Role Code | Summary | Data scope |
|---|---|---|
| `ADMIN` | Full control of the tenant (config, RBAC, parameters) | Entire tenant |
| `GERENTE` | Approves quotes, closes sales, sees consolidated reports | Entire tenant |
| `VENDEDOR` | Creates quotes, sales, serves customers; sees only their own | Own documents (data_scope = vendedor_id) |
| `FISCAL` | Issues/cancels NFe, manages the tax matrix | Entire tenant (FIS module) |
| `FINANCEIRO` | Manages cash, accounts payable/receivable, reconciliation | Entire tenant (FIN module) |
| `ALMOXARIFE` | Moves stock, performs inventory, receives invoices | Entire tenant (EST module) |

### Additional roles (optional, on demand)

| Role Code | Use |
|---|---|
| `CRM_OPERADOR` | Operates funnel/leads/pipeline; no access to other modules | CRM module |
| `LOGISTICA_OPERADOR` | Creates deliveries, updates freight status | LOG module |
| `AUDITOR` | Read-only across the tenant; used by external accounting | Entire tenant, read-only |

---

## 2. Multi-tenant and roles

Each user can have access to **N tenants** (association `usuario_empresa`).

```
neuroassist_global.usuario_empresa (
    usuario_id    UUID NOT NULL,
    tenant_id    VARCHAR(50) NOT NULL,    -- e.g.: <tenant-schema-1>
    papel         VARCHAR(50) NOT NULL,    -- ADMIN, GERENTE, ...
    ativo         BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (usuario_id, tenant_id)
)
```

At login:
- If the user has 1 tenant: it is used automatically, the JWT carries `tenant_id`.
- If the user has N > 1: the frontend shows a selector; the choice persists in the JWT (`tenant_id` claim).
- Tenant switching at runtime via `POST /api/v1/iam/sessao/trocar-tenant` -- issues a new JWT.

---

## 3. Permissions -- format

Namespace: `<modulo>.<recurso>.<acao>`

Examples:
- `cad.cliente.read` / `cad.cliente.write` / `cad.cliente.delete`
- `com.orcamento.aprovar`
- `com.venda.criar`
- `fis.nfe.emitir` / `fis.nfe.cancelar`
- `fin.caixa.abrir` / `fin.caixa.fechar`
- `crm.lead.qualificar`

Each module has its own **permission-map** in `frontend/libs/<modulo>/access/src/lib/<modulo>.permission-map.ts`
and the backend equivalent in `<modulo>-service` (constant in `domain.security`).

---

## 4. Main tables (`neuroassist_global`)

### Core RBAC

```sql
-- Roles (seeds in V1 of neuroassist-niv-migrations)
CREATE TABLE neuroassist_global.papel (
    papel_id      UUID PRIMARY KEY,
    codigo        VARCHAR(50) UNIQUE NOT NULL,    -- ADMIN, GERENTE, ...
    nome          VARCHAR(100) NOT NULL,
    descricao     TEXT,
    ativo         BOOLEAN NOT NULL DEFAULT true
);

-- Permissions (seeds in V1)
CREATE TABLE neuroassist_global.permissao (
    permissao_id  UUID PRIMARY KEY,
    codigo        VARCHAR(100) UNIQUE NOT NULL,   -- cad.cliente.read
    modulo        VARCHAR(10)  NOT NULL,          -- CAD, COM, FIS, ...
    nome          VARCHAR(150) NOT NULL,
    descricao     TEXT
);

-- Role ↔ permission mapping
CREATE TABLE neuroassist_global.papel_permissao (
    papel_id      UUID NOT NULL REFERENCES neuroassist_global.papel(papel_id),
    permissao_id  UUID NOT NULL REFERENCES neuroassist_global.permissao(permissao_id),
    PRIMARY KEY (papel_id, permissao_id)
);

-- Users
CREATE TABLE neuroassist_global.usuario (
    usuario_id    UUID PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    nome          VARCHAR(150) NOT NULL,
    ativo         BOOLEAN NOT NULL DEFAULT true,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User ↔ tenant association (with role)
CREATE TABLE neuroassist_global.usuario_empresa (
    usuario_id    UUID NOT NULL REFERENCES neuroassist_global.usuario(usuario_id),
    tenant_id    VARCHAR(50) NOT NULL,           -- <tenant-schema-1>, <tenant-schema-2>, ...
    papel         VARCHAR(50) NOT NULL,           -- role codigo
    data_scope    VARCHAR(50),                    -- optional: vendedor_id if papel = VENDEDOR
    ativo         BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (usuario_id, tenant_id)
);
```

### Access model version (for cache invalidation)

```sql
CREATE TABLE neuroassist_global.modelo_acesso_versao (
    id            INT PRIMARY KEY DEFAULT 1,
    versao        BIGINT NOT NULL DEFAULT 1,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (id = 1)  -- singleton
);
```

When RBAC changes (new role, new permission, change in `papel_permissao`),
`UPDATE versao = versao + 1`. JWTs carry the `modelo_acesso_versao` claim;
if the backend detects a JWT with an old version, it returns `401 SESSION_VERSION_STALE`
and forces a refresh.

---

## 5. AccessDecision -- return format

```java
// Return of POST /api/v1/iam/access/evaluate
public record AccessDecisionResponse(
    UUID usuarioId,
    String tenantId,                    // <tenant-schema-1>, ...
    String papel,                        // ADMIN, GERENTE, VENDEDOR, ...
    List<String> permissoes,             // ["cad.cliente.read", "com.venda.criar"]
    String dataScope,                    // optional: vendedor_id if VENDEDOR
    long modeloAcessoVersao,
    SessionPolicy sessionPolicy          // { accessTokenTtl, refreshTtl, idleTimeout }
) {}
```

---

## 6. Implementation

### <service>

- Endpoints:
  - `POST /api/v1/iam/sessao/login` -- Keycloak OIDC callback; issues the JWT.
  - `POST /api/v1/iam/sessao/trocar-tenant` -- user with N tenants switches the active tenant; new JWT.
  - `POST /api/v1/iam/access/evaluate` -- returns `AccessDecisionResponse` (used by the gateway + services for caching).
  - `GET /api/v1/iam/sessao/restore` -- restores the session from the JWT in an httpOnly cookie.
  - `POST /api/v1/iam/sessao/logout` -- invalidates the session (increments `modelo_acesso_versao` if needed to force it).

### Other services

- In the Security filter: reads the JWT, populates `TenantContextHolder` with the `tenant_id` claim.
- Before each operational `application.service`: calls `TenantContextHolder.require()` (RULE-07).
- For permission checks:
  ```java
  @PreAuthorize("hasAuthority('cad.cliente.write')")
  public ClienteResponse criar(CriarClienteRequest req) { ... }
  ```
  or programmatic checking:
  ```java
  if (!authoritiesContainsAny("cad.cliente.write", "cad.cliente.delete")) {
      throw new ForbiddenException("missing.permission");
  }
  ```

---

## 7. Redis cache (optimization)

NeuroAssist NIV uses **Redis** (or Valkey) for 3 cache cases:

### Session cache
```
Key:    neuroassist-niv:sessao:{sessionId}
Value:  {versao, usuarioId, tenantId, papel, expiresAt}
TTL:    same as the access token (15 min default)
```

### AccessDecision cache
```
Key:    neuroassist-niv:access:{usuarioId}:{tenantId}
Value:  serialized AccessDecisionResponse
TTL:    5 min (short -- invalidated via pub/sub)
Invalidation: event `neuroassist-niv.modelo.acesso.alterado` publishes to "neuroassist-niv:access:invalidate"
```

### Rate limiting (gateway)
```
Key:    neuroassist-niv:rate:{tenantId}:{windowTimestamp}
Value:  atomic counter (INCR)
TTL:    60s (1-minute window)
```

### Suggested config (`application.yml`)

```yaml
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      timeout: 2000ms

neuroassist-niv:
  cache:
    sessao:
      ttl: 15m
      prefix: "neuroassist-niv:sessao:"
    access-decision:
      ttl: 5m
      prefix: "neuroassist-niv:access:"
  rate-limiting:
    default-rate: 100
    burst: 20
    key-prefix: "neuroassist-niv:rate:"
```

### Golden rule
**Redis is an optimization, not the source of truth.** If Redis goes down, each service goes straight to
PostgreSQL (slower, but functional). The database is the truth.

---

## 8. Common mistakes -- do not do

- **Never** store roles in Keycloak as the source of truth -- **NeuroAssist NIV** is the owner.
  Keycloak is only the IdP (authentication); authorization belongs to the NeuroAssist NIV `<service>`.
- **Never** trust the role in the JWT without validating `modeloAcessoVersao` (it may be stale after an RBAC change).
- **Never** apply permission inline in the Angular UI (`if (user.role === 'admin')`) -- always via `AccessDecisionService.can(<perm>)`.
- **Never** create a shared user (anti-pattern -- audit does not trace the individual).
- **Never** allow role escalation (a user with role X managing to create an association with role Y > X).
- **Never** ignore `TenantContextHolder.require()` in an application service that touches tenant data (RULE-07).
- **Never** return data from one tenant to the JWT of another (cross-tenant leak) -- see `hexagonal-patterns.md` §5.

---

## 9. Roadmap (future, do not implement now)

More advanced RBAC features (multi-SSO BYOI, custom roles per tenant, 2-step
approval, emergency access, API keys with risk score) are **not** part of the MVP. Add
them only when there is concrete customer/audit demand.

---

## References

- `docs/architecture/shared/multi-tenant.md` -- ADR-001 schema-per-tenant
- `docs/architecture/frontend/standards/access-layer-contracts.md` -- FE Access Layer
- `hexagonal-patterns.md` §5 -- TenantContext propagation + cross-tenant guard
- `services-catalog.md` §<service> -- responsibilities of the <service>
