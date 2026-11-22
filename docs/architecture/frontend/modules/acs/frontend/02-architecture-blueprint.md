# 02 — Architecture Blueprint — acs (ACS) Frontend

## 1. System boundary

The ACS frontend is a **client of `acs-service`** through the API gateway, consumed exclusively via
`@neuroassist/shared/access-http-base`. It never calls a legacy system, never talks to another
module's service, and never processes patient video/images (that is the edge, GEST). Authentication
is delegated to `@neuroassist/shared/auth-session` (login against `iam-service`); ACS consumes the
resulting session, it does not implement the auth flow.

## 2. External actors and systems

- **Authenticated browser** — caregiver signed in via the shared auth session; carries the active
  tenant in `@neuroassist/shared/tenant-context`.
- **`acs-service` (BE)** — reached through `@neuroassist/shared/access-http-base`; the interceptor
  injects `X-Tenant-Id` and a correlation id and normalizes `ProblemDetail` errors.
- **`platform-ops` (service client, ADR-011)** — the tenant-creation screen runs against it; it is
  *not* a human role and the screen is reachable only from the admin host/network.
- **HIST (audit)** — ACS does not render history, but every provision/revoke/invite emits an
  auditable action consumed by HIST downstream.

No third-party widgets are embedded in ACS.

## 3. End-to-end user flows

### Golden path A — Provision a patient-phone session (Screen 07)

```
Caregiver → Patient Device Activation
  ┌───────────────────────────────────────────────────────┐
  │ Patient: Márcio Amaral            🟢 Device online      │
  │ Active sessions for this patient:                       │
  │   (none yet)                                            │
  │ ⚠ A persistent session does NOT expire — revocable      │
  │   at any time.          [ Activate patient phone ]      │
  └───────────────────────────────────────────────────────┘
        │ confirm PersistentSessionWarning
        ▼
  POST provision → acs-service → new PatientSession(active)
        ▼
  ┌───────────────────────────────────────────────────────┐
  │ 📱 Márcio's phone — active since Nov 19   [ Revoke ]    │
  └───────────────────────────────────────────────────────┘
```

### Golden path B — Revoke a session (SEC-001, immediate)

```
ActiveSessionsList → [ Revoke ] → confirm
  → POST revoke → acs-service puts the session JWT on the blacklist
  → session invalid immediately → list shows status=revoked (revokedAt, revokedBy)
```

### Golden path C — Invite a caregiver (Screen 05)

```
Caregiver management → [ Invite caregiver ]
  → InviteCaregiverForm { name, email, role }
  → POST invite → acs-service → Caregiver(pending) linked to tenant
```

### Ops path D — Create a tenant (ADR-011, host-restricted)

```
(admin host/network only) Ops screen → tenant wizard
  → POST → platform-ops → new Tenant
  → route guarded: denied when not on the admin host
```

### Edge cases

- Revoke of an already-revoked session → idempotent no-op, toast confirms current state.
- Provision while device offline → allowed (session is independent of the heartbeat); warn that the
  phone must come online to act.
- Invite to an email already linked → `ProblemDetail` mapped to a field error, no duplicate.
- Last caregiver of a tenant tries to remove own access → blocked (a tenant keeps ≥ 1 caregiver).

## 4. Internal boundaries (Nx libraries — module-as-library, ADR-006)

```
apps/acs/                                   # thin host (type:app, scope:acs)
└── src/app/app.routes.ts                   # loadChildren → @neuroassist/acs

libs/acs/shell-entry/   (type:app)          # ENTRY lib — importPath @neuroassist/acs (ADR-006)
└── src/lib/
    ├── acs.module.ts                        # the only NgModule
    ├── acs.contract.ts                      # MODULE_KEY + ModuleMenuMetadata + permissions + flags
    ├── acs.bootstrap.ts                     # init/destroy lifecycle
    ├── acs.routes.ts                         # ACS_ROUTES[]
    ├── acs.permission-map.ts                 # ModulePermissionMap
    ├── acs.feature-flags.ts                  # ModuleFeatureFlags (defaultState)
    ├── acs.nav.config.ts                     # navigation / breadcrumb
    └── acs.descriptor.ts                     # ACS_MODULE_DESCRIPTOR (consumed by the Shell)

libs/acs/                                   # module libs (scope:acs)
├── access/            (type:domain)         # opsHostGuard, canManageAccessGuard
├── data-access/       (type:data-access)    # CaregiverApiService, PatientSessionApiService,
│                                            #   TenantAdminApiService + signal facades
├── feature-caregivers/      (type:feature)  # caregiver list + invite
├── feature-patient-sessions/(type:feature)  # activate / revoke (Screen 07)
├── feature-tenant-admin/    (type:feature)  # ops-only tenant creation (ADR-011)
├── integration/       (type:domain)         # AcsShellIntegrationService
├── navigation/        (type:domain)         # breadcrumbs state
└── ui/ (optional)     (type:ui)             # acs-local presentational components

apps/acs-e2e/                               # Playwright specs
```

Tags: `scope:acs` + `type:{feature|data-access|domain|ui}`. A `scope:acs` lib may import only
`scope:acs` and `scope:shared` (`nx-boundaries.md`). The Shell (`scope:web`) imports
`@neuroassist/acs` in `config/module-descriptors.ts`.

## 5. Cross-cutting concerns

| Concern | How ACS handles it |
|---|---|
| AuthN / session | `@neuroassist/shared/auth-session` — ACS consumes claims, never implements login. |
| Active tenant | `@neuroassist/shared/tenant-context` — single source of truth for `X-Tenant-Id`. |
| AuthZ / RBAC | `@neuroassist/shared/access-decision` — `AccessDecisionService.can('acs.caregiver.invite' | 'acs.session.revoke' | 'acs.tenant.create')`; guards consume its output. |
| HTTP | `@neuroassist/shared/access-http-base` — correlation + `X-Tenant-Id` + error-normalize interceptors. |
| Errors | BE `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → user message via `@neuroassist/shared/ui-feedback`. |
| Observability | `@neuroassist/shared/observability` — provision/revoke/invite events + timings; never `console.log`. |
| Design tokens | Tailwind v4 oklch tokens via `@neuroassist/shared/ui-tokens`; dark default; CDK primitives (no Material). |
| i18n | None — English-only (ADR-018). Strings kept in one place for a future additive locale layer. |
| Ops-host gate | `access/opsHostGuard` — tenant-creation route denied unless on the admin host/network. |
