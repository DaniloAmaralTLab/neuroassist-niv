# Access Layer Contracts (NeuroAssist NIV)

> Session / Tenant-Context / Access Decision / Navigation -- cross-cutting frontend APIs.

Goal: provide deterministic, reusable, cross-cutting APIs for the `neuroassist-niv-web` app and
all modules. Every authorization and navigation decision goes through this layer.

Location: `frontend/libs/shared/` (subdivided into specialized libs).

---

## Responsibilities

| Service / Lib | Responsibility |
|---|---|
| `@neuroassist/shared/auth-session` (`AuthSessionService`) | User session state (JWT claims, roles, expiry). Login/logout via OIDC against `iam-service`. |
| `@neuroassist/shared/tenant-context` (`TenantContextService`) | Active tenant of the current context + reactive switch signal. |
| `@neuroassist/shared/access-decision` (`PermissionService` + `AccessDecisionService`) | Evaluates permissions / feature flags. Produces: allow/deny, capabilities, menu/route visibility. |
| `@neuroassist/shared/access-decision` (`NavigationService`) | Derives the menu tree / breadcrumb from the decisions. |
| `@neuroassist/shared/access-http-base` | `HttpClient` wrapper + interceptors (Correlation, X-Tenant-Id, ErrorNormalize). |

---

## Non-responsibilities (hard boundary)

- **UI components do not evaluate permissions directly.** Always via `AccessDecisionService.can(<perm>)`.
- **Modules do not implement auth flows** nor store the session in parallel.
- **`app.routes.ts` does not build the menu ad hoc.** It consumes `NavigationService` outputs.
- **Components do not call `HttpClient` directly** -- only via `<Resource>ApiService` (`data-access`).

---

## Integration rules

- Modules consume the Access Layer through stable facades (`@neuroassist/shared/*`).
- Tenant switch via `TenantContextService.switchTo(tenantId)`:
  - cancels in-flight requests scoped to the previous tenant
  - invalidates explicitly scoped caches
  - re-evaluates access and navigation decisions
  - updates the UI without a full refresh
- Access decisions stay in the Access Layer -- never duplicated in features.

---

## Acceptance checks

- [ ] Zero direct `HttpClient` inside components (`*.component.ts`).
- [ ] Zero `if (user.role === 'admin')` or similar scattered across features.
- [ ] Guards (`authGuard`, `tenantGuard`, `accessGuard(<perm>)`) use `AccessDecisionService` outputs.
- [ ] Menu rendering / action enabling uses `NavigationService` or `AccessDecisionService`.
- [ ] Zero direct reads of `localStorage`/`sessionStorage` -- via `@neuroassist/shared/auth-session`.
- [ ] Every HTTP call goes through the `@neuroassist/shared/access-http-base` interceptor (automatic `X-Tenant-Id` header).

---

## Multi-tenant (alignment with `shared/multi-tenant.md`)

- `TenantContextService` is the single source of truth for the active `empresaId` in the frontend.
- Components consume it via signal: `currentTenant = this.tenantContext.current()`.
- Never read `empresaId` directly from the decoded JWT -- always via `TenantContextService`.
