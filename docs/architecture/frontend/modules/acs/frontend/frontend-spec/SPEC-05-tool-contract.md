# SPEC-05 — Module Contract — acs (ACS) Frontend

> Content of `libs/acs/shell-entry/src/lib/acs.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. Permission keys equal the BE authority constants
> (INV-7). Sources: `frontend/04-frontend-architecture-direction.md` §7,
> BE api-contract §7 (authority→endpoint matrix).

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'acs';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'acs',
  title: 'Access',
  icon: 'group',                  // Material Symbols (self-hosted @font-face)
  section: 'admin',
  order: 40,
  entries: [
    { label: 'Caregivers',       route: '/access/caregivers',       requires: 'acs.caregiver.create.or.read' },
    { label: 'Patient sessions', route: '/access/patient-sessions', requires: 'acs.patient-session.provision' },
    { label: 'Tenants (ops)',    route: '/ops/tenants',             requires: 'acs.tenant.onboard', hostRestricted: true },
  ],
};
```

The `Tenants (ops)` entry is emitted **only** when `opsHostGuard` resolves `onAdminHost = true`
(SPEC-06). Menu visibility is derived from the permission map by `NavigationService`, never built
ad hoc in a component.

## 2. `MODULE_PERMISSION_MAP` (BE-canonical authorities, INV-7)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'acs.caregiver.create':            { label: 'Register caregiver',   justification: 'Create a caregiver in the active tenant — CLINIC_COORDINATOR (api-contract §2.1).' },
  'acs.caregiver.deactivate':        { label: 'Deactivate caregiver', justification: 'Soft-deactivate a caregiver — CLINIC_COORDINATOR (§2.2).' },
  'acs.patient-link.link':           { label: 'Link patient',         justification: 'Create a caregiver↔patient authorization edge (§3.1).' },
  'acs.patient-link.unlink':         { label: 'Unlink patient',       justification: 'Remove a caregiver↔patient edge (§3.2).' },
  'acs.patient-session.provision':   { label: 'Provision session',    justification: 'Turn the patient phone on as an operable device (§4.1, ADR-012).' },
  'acs.patient-session.revoke':      { label: 'Revoke session',       justification: 'Immediately revoke a patient session (§4.2, SEC-001).' },
  'acs.tenant.onboard':              { label: 'Onboard tenant',       justification: 'Create a care unit — platform-ops only (§5.1, ADR-011, INV-5).' },
};
```

> Reconciliation (gap G1/G4): the vision keys `acs.caregiver.invite`, `acs.caregiver.role.edit`,
> `acs.session.provision`, `acs.session.revoke`, `acs.tenant.create` are **superseded** by the BE
> authority strings above. `acs.caregiver.role.edit` has no BE endpoint (no role PATCH exists —
> gap G4); the role-edit UI event stays out of the MVP contract until BE adds it.

Every gate goes through `AccessDecisionService.can(<authority>)`; guards consume its output and
MUST NOT hardcode `return true` (carry-forward `guard:stub-permissive`). `acs.tenant.onboard`
additionally requires `opsHostGuard` (network restriction) on top of the RBAC decision.

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'acs.patient-sessions': { defaultState: true,  justification: 'Screen 07 is core MVP.' },
  'acs.tenant-admin':     { defaultState: false, justification: 'Ops-only; enabled on the admin host via opsHostGuard (ADR-011).' },
  'acs.caregiver-list':   { defaultState: false, justification: 'Full roster depends on a BE list endpoint that does not yet exist (G3); enable when GET /acs/caregivers lands.' },
};
```

## 4. Ops-host detection (resolves gap G5 from `frontend/06`)

`opsHostGuard` decides `onAdminHost` by a **served-from-host flag** injected at bootstrap:
the shell reads a build-time/environment token `ACS_OPS_HOST` (an origin allowlist evaluated against
`window.location.origin`). Rationale: it needs no extra request, works with the Access Layer, and
keeps the restriction a deployment concern (ADR-011 Option 1). Defense-in-depth only — the BE
enforces `acs.tenant.onboard` regardless (api-contract §5.1, INV-5).

## Criterios de aceite (EARS)

- WHILE the session lacks `acs.caregiver.create`, THE SYSTEM SHALL hide the "Register caregiver" action.
- WHILE the session lacks `acs.patient-session.revoke`, THE SYSTEM SHALL disable the revoke action on every session row.
- WHILE the session lacks `acs.patient-session.provision`, THE SYSTEM SHALL hide the provision action.
- WHILE the browser is not on the admin host, THE SYSTEM SHALL omit the "Tenants (ops)" menu entry regardless of the session authorities.
- THE SYSTEM SHALL evaluate every ACS action through `AccessDecisionService.can(<authority>)` and SHALL NOT evaluate a role inline in a component.
- IF `AccessDecisionService` grants `acs.tenant.onboard` but `opsHostGuard` resolves `onAdminHost = false`, THEN THE SYSTEM SHALL block the tenant-onboard action.
