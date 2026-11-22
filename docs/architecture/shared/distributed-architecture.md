# Distributed Architecture (NeuroAssist NIV)

> How NeuroAssist NIV is "distributed" between a single Angular app + N Java microservices, with strict boundaries.

Goal: explain the frontend topology (Nx workspace with 1 app + libs per module) and backend
(Spring microservices + Eureka) and their boundaries.

---

## It is not a "pages app"

NeuroAssist NIV is **asset-driven**:
- **Frontend:** 1 app (`apps/neuroassist-niv-web`) + N libs per module (`libs/<modulo>/{feature,data-access,ui,access}`) + shared (`libs/shared/*`).
- **Backend:** N independently deployable Spring microservices, registered in Eureka, integrated via Feign + JMS Artemis.
- Everything evolves via the dependency graph (Nx on the FE, Gradle multi-project on the BE).

---

## Runtime topology -- Frontend

- **`neuroassist-niv-web`** boots first and stays resident.
- **Modules** are loaded via lazy routes: `/cad`, `/com`, `/fis`, `/fin`, `/est`, `/crm`, `/log`, `/iam`.
- **Shared libs** are loaded as needed (imported by the app and by the modules).
- Each lazy route follows: `loadComponent: () => import('@neuroassist-niv/<modulo>/feature-<slug>').then(m => m.<Slug>PageComponent)`.

---

## Runtime topology -- Backend

- **`neuroassist-niv-service-registry`** (Eureka) starts first -- service catalogue.
- **`neuroassist-niv-api-gateway`** -- single entry point, validates JWT, routes to services by path
  (`/api/cadastros/*` → `<service>`, etc.).
- **Domain services** (`<service>`, `<service>`, ...) -- exposed only via the gateway.
- **JMS Artemis** -- asynchronous communication (events: `cadastro.cliente.criado`, `comercial.venda.confirmada`, etc.).
- **Postgres with schema-per-tenant** (`neuroassist_global` + `<tenant-schema-1>`, `<tenant-schema-2>`, ...) -- see `multi-tenant.md`.

---

## Ownership model

### Frontend

| Layer | Responsibility |
|---|---|
| `apps/neuroassist-niv-web` | Layout, bootstrap (session/tenant-context), base routing, global UX states |
| `libs/<modulo>/feature-*` | Module domain workflows |
| `libs/<modulo>/data-access` | Module-specific ApiServices + Facades |
| `libs/<modulo>/ui` | Module-specific presentational components |
| `libs/<modulo>/access` | Module permission map + feature flags |
| `libs/shared/*` | Reusable UI components, patterns, SDKs, infra utilities |
| `libs/shared/access-*` | Deterministic authorization + navigation derivation |

### Backend

| Layer | Responsibility |
|---|---|
| `neuroassist-niv-api-gateway` | Entry point, JWT, routing, rate limit |
| `neuroassist-niv-service-registry` | Eureka |
| `<service>` | Auth (OIDC), users, roles, TenantContext |
| `<modulo>-service` | Module domain logic + persistence + events |
| `neuroassist-niv-migrations` | Centralized Flyway, schema-per-tenant |
| `<service>` | Event trail (passive JMS consumer) |

---

## Communication

### Frontend ↔ Backend

- FE → BE: via `@neuroassist/shared/access-http-base` (interceptor injects `Authorization: Bearer <JWT>` + `X-Tenant-Id`).
- BE → FE: JSON (DTOs registered in `@neuroassist/shared/contracts`, generated via OpenAPI).
- WebSocket / SSE (future): event channel for reactive updates.

### Backend ↔ Backend

- **Synchronous:** Feign + Resilience4j (circuit breaker, retry, timeout).
- **Asynchronous:** JMS Artemis (domain events).
- Each service NEVER calls another service's database directly.

### NeuroAssist NIV-web → Modules

- App → module: via contracts (`@neuroassist/shared/contracts/<modulo>-routes`) and lazy import.
- Module → module: **forbidden**. Communication via the BE API or via `@neuroassist/shared/*`.

---

## Common anti-patterns (avoid)

- Permission decision inside a module component (always via `AccessDecisionService`).
- HTTP interceptors duplicated per module (use only `@neuroassist/shared/access-http-base`).
- Importing code from another module (Nx boundary blocks it, but flag it before the PR).
- Giant barrels that break lazy loading and bloat the `neuroassist-niv-web` bundle.
- BE service accessing the `emp_<tenant>` schema of another tenant (RULE-07 blocks it at runtime via `TenantContextHolder.require()`).
- "Helper endpoint" in the gateway that mixes responsibilities of two services (the gateway does not orchestrate, it only routes).

---

## Practical checks for a new module

A new business module must:
- [ ] Load lazily (not bloat `neuroassist-niv-web`)
- [ ] Depend only on `scope:<modulo>` + `scope:shared`
- [ ] Keep domain logic within its boundaries (`libs/<modulo>/*`)
- [ ] Expose BE APIs via `<modulo>-service` (NOT via a gateway helper)
- [ ] Register permission keys in `<modulo>.permission-map.ts`
- [ ] Consume `TenantContextService` (FE) and respect RULE-07 (BE)
