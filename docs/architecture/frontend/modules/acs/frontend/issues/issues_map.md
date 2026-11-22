# Issues Map -- ACS Frontend Backlog

| Issue | Title | Kind | Priority | Status |
|---|---|---|---|---|
| FE-ACS-001 | acs.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS | FE | P1 | INTACT |
| FE-ACS-002 | acs.routes.ts — lazy route table with authGuard / canManageAccessGuard / opsHostGuard | FE | P1 | INTACT |
| FE-ACS-003 | acs.module.ts (shell-entry barrel) + acs.bootstrap.ts lifecycle init/destroy | FE | P1 | INTACT |
| FE-ACS-004 | acs.providers.ts — http adapter default with ACCESS_HTTP_BASE/acs injection token | FE | P1 | INTACT |
| FE-ACS-005 | acs.descriptor.ts + module-descriptors.ts — shell registration (ACS_MODULE_DESCRIPTOR) | FE | P1 | INTACT |
| FE-ACS-006 | CaregiverApiService — register / deactivate / me / links / link / unlink + CaregiverWire + mappers | FE | P2 | INTACT |
| FE-ACS-007 | CaregiverFacade — caregivers() / listState() / submitState() signals; pending-BE G3 degraded mode | FE | P2 | INTACT |
| FE-ACS-008 | PatientSessionApiService — provision / revoke / get + PatientSessionWire + mapper | FE | P2 | INTACT |
| FE-ACS-009 | PatientSessionFacade — vm() / opState() signals; pessimistic provision/revoke (SEC-001) | FE | P2 | INTACT |
| FE-ACS-010 | TenantAdminApiService + TenantAdminFacade — onboard + TenantWire + submitState() | FE | P2 | INTACT |
| FE-ACS-011 | feature-caregivers routes + CaregiverListPageComponent connected to CaregiverFacade | FE | P3 | INTACT |
| FE-ACS-012 | CaregiverTableComponent + CaregiverRowComponent + PatientLinksCellComponent (presentational) | FE | P3 | INTACT |
| FE-ACS-013 | RegisterCaregiverPageComponent + RegisterCaregiverFormComponent connected to CaregiverFacade.register | FE | P3 | INTACT |
| FE-ACS-014 | feature-patient-sessions routes + PatientSessionsPageComponent connected to PatientSessionFacade | FE | P3 | INTACT |
| FE-ACS-015 | PatientHeaderComponent + PersistentSessionWarningComponent — SEC-001 persistent-session banner | FE | P3 | INTACT |
| FE-ACS-016 | ActiveSessionsListComponent + SessionRowComponent — revoke always visible per SEC-001 | FE | P3 | INTACT |
| FE-ACS-017 | ProvisionButtonComponent — pessimistic provision flow with PersistentSessionWarning confirm | FE | P3 | INTACT |
| FE-ACS-018 | feature-tenant-admin routes + TenantAdminPageComponent + TenantWizardFormComponent (ops-host gated) | FE | P3 | INTACT |
| FE-ACS-019 | canManageAccessGuard — AccessDecisionService.can() + no-session→login / no-perm→forbidden redirect | FE | P5 | INTACT |
| FE-ACS-020 | opsHostGuard — served-from-host allowlist ACS_OPS_HOST; blocks /ops/tenants off-host | FE | P5 | INTACT |
| FE-ACS-021 | AcsShellIntegrationService — breadcrumbs / ops-menu visibility / audit hand-off to observability | FE | P6 | INTACT |
| FE-ACS-022 | Loading skeletons, empty states and page-error/retry for caregiver list and patient sessions | FE | P7 | INTACT |
| FE-ACS-023 | ACS error mapper — ProblemDetail type slug → AppError; field errors, toasts and banners per SPEC-07 | FE | P7 | INTACT |
| FE-ACS-024 | Degraded-roster banner for caregiver list (G3: no GET /acs/caregivers list-all endpoint yet) | FE | P7 | INTACT |
| FE-ACS-025 | Telemetry — forward provision / revoke / register events to @neuroassist/shared/observability | FE | P8 | INTACT |
| FE-ACS-026 | Playwright stub generation — 4 .feature files with test.fixme() (no vacuous assertions) | FE | P9 | INTACT |
| FE-ACS-027 | E2E — register-caregiver scenarios: register flow / username-taken field error / RBAC hiding / login redirect | FE | P9 | INTACT |
| FE-ACS-028 | E2E — provision / revoke / tenant-onboarding scenarios: SEC-001 always-visible / host-gating | FE | P9 | INTACT |
| INT-FE-ACS-001 | Connect CaregiverApiService to acs-service /acs/caregivers — verify gateway prefix / wire shape / X-Tenant-Id | INT | P4 | INTACT |
| INT-FE-ACS-002 | Connect PatientSessionApiService to acs-service /acs/patient-sessions — provision + revoke (SEC-001 pessimistic) | INT | P4 | INTACT |
| INT-FE-ACS-003 | Connect TenantAdminApiService to acs-service /acs/ops/tenants — ops-host gating + BE authority validation | INT | P4 | INTACT |
| INT-FE-ACS-004 | Error contract smoke — ProblemDetail type slug → AppError for all ACS slugs (real acs-service responses) | INT | P4 | INTACT |
| INT-FE-ACS-005 | Auth-session integration — authGuard + shared/auth-session JWT flow; session-absent redirects to /login | INT | P4 | INTACT |
| INT-FE-ACS-006 | proxy.conf.json — dev proxy for /acs/* routes to acs-service port (not through api-gateway for direct dev) | INT | P4 | INTACT |

---

## Totals

- **28 functional issues** (FE-ACS-001 through FE-ACS-028)
- **6 integration issues** (INT-FE-ACS-001 through INT-FE-ACS-006)
- **Total: 34 issues**

---

## By priority wave

| Wave | Issues | Focus |
|---|---|---|
| P1 — Foundation | FE-ACS-001..005 | Shell-entry contracts, routes, providers, descriptor |
| P2 — Data access | FE-ACS-006..010 | API services, facades, DTOs, mappers |
| P3 — Feature libs | FE-ACS-011..018 | Pages + components (caregivers, patient-sessions, tenant-admin) |
| P4 — Integration | INT-FE-ACS-001..006 | Live BE wiring, error contracts, proxy, auth flow |
| P5 — Guards | FE-ACS-019..020 | canManageAccessGuard, opsHostGuard |
| P6 — Navigation | FE-ACS-021 | AcsShellIntegrationService breadcrumbs + menu |
| P7 — UX polish | FE-ACS-022..024 | Loading/empty/error states, error mapper, degraded-roster banner |
| P8 — Observability | FE-ACS-025 | Telemetry forwarding to @neuroassist/shared/observability |
| P9 — E2E | FE-ACS-026..028 | Playwright stubs + implemented scenarios |

---

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (routes + guards) | FE-ACS-001, FE-ACS-002, FE-ACS-019, FE-ACS-020, INT-FE-ACS-005 |
| SPEC-02 (component hierarchy) | FE-ACS-011..018 |
| SPEC-03 (view models) | FE-ACS-007, FE-ACS-009, FE-ACS-022, FE-ACS-024 |
| SPEC-04 (data access) | FE-ACS-006, FE-ACS-008, FE-ACS-010, INT-FE-ACS-001..003 |
| SPEC-05 (module contract) | FE-ACS-001, FE-ACS-003, FE-ACS-004, FE-ACS-005, FE-ACS-010 |
| SPEC-06 (shell integration) | FE-ACS-021, FE-ACS-025 |
| SPEC-07 (error handling) | FE-ACS-023, INT-FE-ACS-004 |
| SPEC-08 (e2e scenarios) | FE-ACS-026..028 |

---

## Critical dependency path

```
FE-ACS-001 (contract)
  └── FE-ACS-002 (routes)
        └── FE-ACS-004 (providers: http-default)
              ├── FE-ACS-006 (CaregiverApiService)
              │     └── FE-ACS-007 (CaregiverFacade)
              │           └── FE-ACS-011 (CaregiverListPage)
              │                 └── FE-ACS-012..013 (table + register)
              ├── FE-ACS-008 (PatientSessionApiService)
              │     └── FE-ACS-009 (PatientSessionFacade)
              │           └── FE-ACS-014..017 (sessions pages + provision)
              └── INT-FE-ACS-001..006 (live wiring)
                    └── FE-ACS-027..028 (e2e scenarios)
```

---

## Key architectural constraints tracked across all issues

- **SEC-001:** RevokeButton always visible; pessimistic provision/revoke (FE-ACS-009, FE-ACS-016, FE-ACS-017, INT-FE-ACS-002)
- **G3 gap:** No GET /acs/caregivers list-all — degradedRoster=true (FE-ACS-007, FE-ACS-024)
- **Gateway prefix:** `/acs` not `/api/v1` (FE-ACS-006, FE-ACS-008, FE-ACS-010, INT-FE-ACS-001..003)
- **Default adapter:** `http` (not mock) since acs-service exists (FE-ACS-004)
- **INV-7:** FE permission keys equal BE authority constants exactly (FE-ACS-001)
- **ARCH-033:** JWT in-memory; no localStorage (INT-FE-ACS-005)
