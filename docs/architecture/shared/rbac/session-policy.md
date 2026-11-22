# Session Policy — TTLs, refresh, idle, MFA per role

> Differentiated session policy per canonical role. Whoever has more power gets a **shorter token** (smaller compromise window). Whoever only reads gets a **longer session** (UX).

## Canonical table

| Role | Access Token TTL | Refresh Token TTL | Idle Timeout | MFA | IP restriction | Rationale |
|---|---|---|---|---|---|---|
| **ADMIN** | 10 min | 4 h | 30 min | Required* | Office IP list | Full control of the tenant, highest risk |
| **GERENTE** | 15 min | 6 h | 45 min | Optional | None | Approvals, consolidated reports |
| **FISCAL** | 15 min | 6 h | 45 min | Optional | None | Issues/cancels NFe — medium fiscal risk |
| **FINANCEIRO** | 15 min | 6 h | 45 min | Optional | None | Manages cash/titles — medium financial risk |
| **VENDEDOR** | 15 min | 8 h | 120 min | No | None | Intensive use during the day — UX is the priority |
| **ALMOXARIFE** | 15 min | 8 h | 120 min | No | None | Works in the warehouse, stays logged in all day |
| **CRM_OPERADOR** | 15 min | 8 h | 120 min | No | None | Same as salesperson |
| **LOGISTICA_OPERADOR** | 15 min | 8 h | 60 min | No | None | Works on the route — medium session |
| **AUDITOR** | 30 min | 8 h | 60 min | Optional | None | Read-only — lower risk; long session for analysis |
| **EMERGENCY** *(future)* | 10 min | — (no refresh) | 15 min | Required | Any | Emergency session — maximum 2h, force re-login |

> *MFA is a future phase. For now, "Required" means "require when MFA is enabled".

## Concepts

### Access Token
- JWT sent in `Authorization: Bearer <token>` on every request.
- Short by design — minimizes the window if a token is leaked.
- Contains claims: `sub` (usuario_id), `tenant_id`, `papel`, `modelo_acesso_versao`, `data_scope`, `exp`.

### Refresh Token
- `httpOnly`, `secure`, `sameSite=strict` cookie.
- Used to generate a new access token without re-login.
- Longer than the access token, but with a strict `exp`.
- Rotated on every use (`refresh_token_rotation = true`).

### Idle Timeout
- Maximum time without activity in the UI before **forcing re-login**.
- Implemented in the FE with `activity-detector`: the timer resets on every click/keydown/scroll.
- When it expires, the FE calls `/api/v1/iam/sessao/logout` and shows the modal "Sessão expirada por inatividade".

### MFA (future)
- When implemented, require a second factor at **login** and on **privilege elevations** (e.g., a manager switching to a different tenant).
- Provider: TOTP (Google Authenticator/Authy) first; then WebAuthn (physical key).

### IP restriction (optional)
- Applicable to ADMIN roles: list of authorized CIDRs configured per tenant.
- If the request comes from outside the list: `403` with `error.code = 'iam.ip-fora-de-escopo'`.
- Useful for tenants that want to restrict ADMIN to the office/VPN.

## Canonical configuration (`application.yml`)

```yaml
neuroassist-niv:
  iam:
    session:
      policies:
        ADMIN:
          access-token-ttl: 10m
          refresh-token-ttl: 4h
          idle-timeout: 30m
          mfa-required: true
          ip-restriction-enabled: true
        GERENTE:
          access-token-ttl: 15m
          refresh-token-ttl: 6h
          idle-timeout: 45m
          mfa-required: false
        FISCAL:    { access-token-ttl: 15m, refresh-token-ttl: 6h, idle-timeout: 45m }
        FINANCEIRO:{ access-token-ttl: 15m, refresh-token-ttl: 6h, idle-timeout: 45m }
        VENDEDOR:
          access-token-ttl: 15m
          refresh-token-ttl: 8h
          idle-timeout: 120m
          mfa-required: false
        ALMOXARIFE:        { access-token-ttl: 15m, refresh-token-ttl: 8h, idle-timeout: 120m }
        CRM_OPERADOR:      { access-token-ttl: 15m, refresh-token-ttl: 8h, idle-timeout: 120m }
        LOGISTICA_OPERADOR:{ access-token-ttl: 15m, refresh-token-ttl: 8h, idle-timeout: 60m  }
        AUDITOR:           { access-token-ttl: 30m, refresh-token-ttl: 8h, idle-timeout: 60m  }
      defaults:
        # if the role is not in the table above
        access-token-ttl: 15m
        refresh-token-ttl: 4h
        idle-timeout: 30m
      jwt:
        signing-algorithm: RS256
        issuer: https://neuroassist-niv.local
        audience: neuroassist-niv-api
        clock-skew: 30s
```

## Refresh flow

```
1. FE makes GET /api/com/v1/vendas
   → Authorization: Bearer <expired-access-token>
   → BE responds 401 with error.code='iam.token-expirado'

2. FE intercepts the 401, calls POST /api/v1/iam/sessao/refresh
   → httpOnly cookie carries the refresh-token automatically
   → BE validates the refresh-token, generates a new pair (access + refresh)
   → The old refresh-token is invalidated (rotation)
   → Response: 200 {accessToken: "..."} + Set-Cookie new refresh-token

3. FE retries the original request with the new access-token
   → 200 OK
```

## Invalidation on access model change

When RBAC changes (ADMIN creates a new role, changes a permission, etc.):

```
1. <service> increments neuroassist_global.modelo_acesso_versao
2. <service> publishes neuroassist-niv.modelo.acesso.alterado
3. All services invalidate their local AccessDecision cache
4. The next request from any user carries a JWT with the old version
5. Filter detects: jwt.modelo_acesso_versao < global.modelo_acesso_versao
6. Returns 401 with error.code='iam.sessao.versao-desatualizada'
7. FE calls refresh → new JWT with the current version + updated permissions
```

This ensures that **RBAC changes propagate in seconds**, without having to invalidate tokens one by one.

## Logout

`POST /api/v1/iam/sessao/logout`:
- Deletes the refresh-token cookie (`Set-Cookie: refresh-token=; Max-Age=0`).
- Invalidates server-side: adds `sub` + `jti` to a Redis blacklist with TTL = remaining access-token-ttl.
- The next request with a still-valid access-token (not yet expired) will be rejected via the blacklist check.

The blacklist is needed because JWT is stateless — without it, an access-token alive after logout remains valid until it expires naturally.

## Anti-patterns

- ❌ Access token of 1h or more — huge leak window.
- ❌ Refresh token without rotation — if it leaks, the attacker can renew forever.
- ❌ Idle timeout only in the BE (no FE timer) — the user gets no warning until they click and get a 401.
- ❌ Saving tokens in `localStorage` (XSS steals them) — always an `httpOnly` cookie for refresh; access token in memory.
- ❌ Refresh token = access token (same TTL) — loses the point of the separation.
- ❌ JWT with huge claims (list of 100 permissions inside) — use `modelo_acesso_versao` and fetch from the cache.

## Monitoring metrics

- `neuroassist-niv_iam_session_active_total{papel}` — active sessions per role (Prometheus gauge).
- `neuroassist-niv_iam_session_refresh_total{papel, outcome}` — refresh rate per role.
- `neuroassist-niv_iam_session_logout_total{motivo}` — logout / timeout / forced.
- `neuroassist-niv_iam_session_blacklist_size` — blacklist size (alert if > 10k).

## References

- General RBAC model: [[modelo]]
- Redis cache (session + access decision): [[modelo]] §7
- Data scope in the JWT: [[data-scope]]
- Error model (`iam.*` codes): [[../contratos/error-model]]
