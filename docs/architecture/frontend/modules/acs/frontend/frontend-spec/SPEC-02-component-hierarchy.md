# SPEC-02 — Component Hierarchy — acs (ACS) Frontend

> Standalone-first, OnPush mandatory. Smart components consume facades (signals);
> presentational components receive `input()`s and emit `output()`s and hold no HttpClient.
> Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/03-domain-framing-frontend.md` §2,
> `frontend/04-frontend-architecture-direction.md` §3. SPEC-02 is prose (no EARS section).

## 1. `feature-caregivers` (Screen 05)

```
CaregiverListPageComponent            (smart · OnPush)
│  reads:  caregiverFacade.caregivers()      Signal<CaregiverRowVM[]>
│          caregiverFacade.listState()        Signal<'idle'|'loading'|'success'|'error'>
│          accessDecision.can('acs.caregiver.create')  → canRegister
├── CaregiverTableComponent           (presentational)
│     input:  rows: CaregiverRowVM[]
│     input:  canRegister: boolean
│     output: roleEdit = { caregiverId, role }
│     output: deactivate = caregiverId
│   └── CaregiverRowComponent         (presentational)  → emits roleEdit / deactivate
├── PatientLinksCellComponent         (presentational)   input: links: PatientLinkVM[]
├── EmptyStateComponent               (shared ui-feedback) — shown WHILE listState = 'success' and rows empty
└── PageErrorComponent                (shared ui-feedback) — shown WHILE listState = 'error'

RegisterCaregiverPageComponent        (smart · OnPush)   route /access/caregivers/new
│  reads:  caregiverFacade.submitState()  Signal<'editing'|'submitting'|'error'>
└── RegisterCaregiverFormComponent     (presentational)
      input:  submitting: boolean
      input:  fieldErrors: Record<'username'|'password'|'role', string|null>
      output: submit = { username, password, role }
```

> Vision Screen 05 is titled "Invite caregiver". The BE contract exposes
> `POST /acs/caregivers` (register with `username` + `password` + `role`), not an email invite —
> there is no BE invite endpoint (gap G2). This hierarchy implements the BE-backed **register**
> flow; the email-invite UX stays a vision aspiration pending a BE invite endpoint.

## 2. `feature-patient-sessions` (Screen 07)

```
PatientSessionsPageComponent          (smart · OnPush)   route /access/patient-sessions/:patientId
│  reads:  sessionFacade.vm()          Signal<PatientSessionsVM>
│          sessionFacade.opState()     Signal<'idle'|'provisioning'|'revoking'|'error'>
│          accessDecision.can('acs.patient-session.provision') → canProvision
│          accessDecision.can('acs.patient-session.revoke')    → canRevoke
├── PatientHeaderComponent            (presentational)  input: patient, deviceOnline → 🟢/⚪ badge
├── PersistentSessionWarningComponent (presentational)  input: visible; output: confirm / cancel
│       (SEC-001: states a persistent session never expires and is revocable at any time)
├── ActiveSessionsListComponent       (presentational)
│     input:  sessions: PatientSessionRowVM[]
│     input:  canRevoke: boolean
│     output: revoke = sessionId
│   └── SessionRowComponent           (presentational)
│         shows label, "active since", or revoked badge (revokedAt / revokedBy)
│         RevokeButton always visible (SEC-001) — never behind advanced settings
└── ProvisionButtonComponent          (presentational)  input: canProvision, disabled(inFlight)
```

## 3. `feature-tenant-admin` (ops-only, ADR-011)

```
TenantAdminPageComponent              (smart · OnPush)   route /ops/tenants  [opsHostGuard]
│  reads:  tenantAdminFacade.submitState()  Signal<'idle'|'submitting'|'error'>
│          (opsHostGuard already guaranteed onAdminHost = true to reach here)
└── TenantWizardFormComponent         (presentational)
      input:  submitting: boolean
      input:  fieldErrors: Record<'name'|'type', string|null>
      output: submit = { name, type }   // type ∈ family | clinic — no PLATFORM_ADMIN option
```

## 4. Component rules (all features)

- Every component is `standalone: true`, `changeDetection: OnPush`.
- No component imports `HttpClient`; all server access is through a facade (SPEC-04).
- No component evaluates a role inline; gating booleans come from `AccessDecisionService.can(...)`.
- Presentational components are pure: inputs in, outputs out, no injected facade.
- Accessibility carry-forwards (Learning): `<select>` role controls carry an accessible name
  (`fe-component:a11y-select-name`); the revoke/provision trigger returns focus after an in-flight
  action completes (`fe-component:modal-focus-return`); KPI/time formatting uses locale-aware
  pipes, never `toFixed` (`fe-component:kpi-decimal-format`).
- Styling via Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`); dark is
  default; no hardcoded colour/spacing (see `contracts/design-tokens.md`).
