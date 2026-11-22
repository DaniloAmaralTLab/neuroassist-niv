# Blueprint Core (NeuroAssist NIV)

> Canonical mental model of the NeuroAssist NIV platform: **single App + business modules + shared assets**,
> governed by Nx boundaries (frontend) and hexagonal architecture (backend microservices).

---

## Core concept: Asset-Driven Delivery

- Each delivery should become a **reusable asset** (component, pattern, SDK, contract, cross-cutting).
- Modules deliver domain value; repeated pieces are promoted to `frontend/libs/shared/*`
  or reusable `backend/services/<service>/`.
- `neuroassist-niv-web` (FE) and `neuroassist-niv-api-gateway` (BE) host cross-cutting concerns and
  define enforced standards.
- Monorepo + Nx (FE) + Gradle multi-project (BE) guarantee atomic evolution and governance
  (dependency graph + affected CI).

---

## Blueprint layers

### Frontend (`frontend/`, Angular + Nx)

1. **App Shell (`apps/neuroassist-niv-web`)**
   - Layout: Topbar / Sidebar / Content / RightPanel
   - Bootstrap flow (session / tenant-context / navigation)
   - Global states: loading / error / no-access
   - Route protection via guards (`authGuard`, `empresaGuard`, `accessGuard(<perm>)`)
   - Does NOT contain decision logic -- delegates to the Access Layer

2. **Business Module (`libs/<modulo>/`)**
   - Standard entrypoint per module: `<modulo>.routes.ts`, `<modulo>.providers.ts`
   - Metadata: permissions (`<modulo>.permission-map.ts`), feature flags (`<modulo>.feature-flags.ts`)
   - Integration with the Shell via lazy loading and contracts (`@neuroassist/shared/contracts`)

3. **Access Layer (`libs/shared/access-*`)**
   - Session, tenant-context, permissions, access decision, navigation derivation
   - Deterministic outputs: allow/deny/capabilities/menu nodes
   - Stable facades for the Shell and modules

4. **Shared UI / Design System (`libs/shared/ui-*`)**
   - Design tokens (`ui-tokens` -- migrate from `prototipo/tokens/pinus-tokens.css`)
   - Base components (Material-wrapped) + layout primitives
   - Standard states (empty/loading/error in `ui-feedback`) and reusable patterns

5. **Shared Infra / Data (`libs/shared/access-http-base`, `error-model`, etc.)**
   - HTTP base, interceptors (Correlation, X-Tenant-Id, ErrorNormalize)
   - Typed SDKs (`@neuroassist/shared/contracts` -- generated from the BE services' OpenAPI)
   - Observability and notifications as cross-cutting services

6. **Governance & Tooling**
   - Nx boundaries enforced via ESLint (`nx-boundaries.md`)
   - Documentation and executable checks to prevent architecture drift

### Backend (`backend/`, Java 21 microservices)

1. **Gateway (`neuroassist-niv-api-gateway`)** -- single entry point, JWT validation, routing, rate limit.
2. **Service Registry (`neuroassist-niv-service-registry`)** -- Eureka.
3. **IAM (`<service>`)** -- auth (OIDC), users, roles, TenantContext.
4. **Domain services (`<service>`, `<service>`, `<service>`,
   `<service>`, `<service>`, `<service>`, `<service>`)** -- business rules.
5. **Audit (`<service>`)** -- event trail.
6. **Migrations (`neuroassist-niv-migrations`)** -- centralized Flyway, schema-per-tenant.

Each microservice follows strict hexagonal architecture (`hexagonal-patterns.md`).

---

## Golden rules

- **Modules do not import other modules** (FE: lib `scope:cad` does not import `scope:com`; BE: services only via Feign + JMS).
- **Shell (FE) and gateway (BE) own cross-cutting concerns** -- modules own the domain.
- **Shared libs / shared services** are the only approved path for reuse.
- **Contracts-first:** integrate through typed contracts (OpenAPI) and stable facades.
- **"If it repeats, promote it"** (to shared).
- **Multi-tenant enforcement:** RULE-07 BE (`TenantContextHolder.require()`) + FE interceptor (`X-Tenant-Id`).

---

## What this document is for

- Onboarding of new contributors.
- Validation of architectural decisions (does the decision respect the blueprint?).
- Answering: "where does this belong?" and "who owns this responsibility?".

---

## References

- `docs/architecture/shared/multi-tenant.md` -- ADR-001 schema-per-tenant
- `docs/architecture/frontend/standards/nx-boundaries.md` -- Nx boundaries
- `docs/architecture/frontend/standards/access-layer-contracts.md` -- Access Layer contracts
- `docs/architecture/backend/standards/hexagonal-patterns.md` -- BE hexagonal
- Memories: `[[arquitetura-neuroassist-niv-decidida]]`, `[[prototipo-canonico]]`
