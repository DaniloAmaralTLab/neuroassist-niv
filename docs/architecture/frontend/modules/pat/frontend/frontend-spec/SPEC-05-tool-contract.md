# SPEC-05 — Module Contract — pat (PAT) Frontend

> Content of `libs/pat/src/lib/pat.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. Permission keys equal the BE authority constants
> (INV-PAT-8). Sources: `frontend/04-frontend-architecture-direction.md` §7,
> BE api-contract §5 (authority→endpoint matrix).

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'pat';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'pat',
  title: 'Patients & Commands',
  icon: 'tune',                   // Material Symbols (self-hosted @font-face)
  section: 'care',
  order: 20,
  entries: [
    { label: 'Patients & Commands', route: '/patients',          requires: 'pat.command.read' },
    { label: 'Register patient',    route: '/patients/register',  requires: 'pat.patient.create' },
  ],
};
```

Menu visibility is derived from the permission map by `NavigationService`, never built ad hoc in a
component. The catalog breadcrumb carries the active patient's name resolved by `PatientFacade`.

## 2. `MODULE_PERMISSION_MAP` (BE-canonical authorities, INV-PAT-8)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'pat.patient.create':      { label: 'Register patient',  justification: 'Register a patient in the active tenant — CAREGIVER / CLINIC_COORDINATOR (api-contract §1.1).' },
  'pat.patient.read':          { label: 'View patients',     justification: 'List / read patients of the tenant for the catalog and breadcrumb (§1.2/§1.3).' },
  'pat.command.read':          { label: 'View catalog',      justification: 'Read a patient command catalog (§2.2/§2.3).' },
  'pat.command.create':        { label: 'Add command',       justification: 'Add a command to the patient catalog (§2.1).' },
  'pat.command.calibrate':     { label: 'Calibrate command', justification: 'Re-map / recalibrate a command — anchor CommandCalibrated (§2.4).' },
  'pat.command.retire':        { label: 'Retire command',    justification: 'Soft-retire a command (§2.5).' },
  'pat.gesture-type.read':     { label: 'View gesture types',justification: 'Read the global primitive vocabulary (§3.1/§3.2).' },
  'pat.gesture-type.create': { label: 'Register gesture type', justification: 'Append a primitive to the global vocabulary inline (§3.3).' },
};
```

> Reconciliation (gap G1): the vision keys `pat.patient.view`, `pat.command.view`, `pat.command.edit`,
> `pat.command.remove`, `pat.gesture-type.view`, `pat.gesture-type.create` are **superseded** by the BE
> authority strings above (`.read` / `.calibrate` / `.retire` / `.register`). The BE also defines
> `pat.patient.deactivate` and `pat.patient.activate` (CLINIC_COORDINATOR, §1.4/§1.5); these have no
> prototype screen and stay out of the MVP FE contract until a patient-lifecycle UI is specified
> (gap G2). No authority is evaluated inline; `AccessDecisionService.can(<authority>)` gates every
> action and guards consume its output (carry-forward `guard:stub-permissive`).

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'pat.live-gesture-test': { defaultState: true,  justification: 'Webcam live-test affordance in the command editor (tactile preview only; no recognition — R3).' },
  'pat.compound-gestures': { defaultState: true,  justification: 'Optional second primitive → compound command; recommends (never forces) a live test (LBC Amendment 1).' },
};
```

## 4. UI RBAC gating

- The catalog list is read-gated by `pat.command.read` (route guard, SPEC-01).
- "New command" / editor save-in-new-mode is gated by `pat.command.create`.
- Editor save-in-edit-mode (calibration) is gated by `pat.command.calibrate`.
- Row "Remove" (retire) is gated by `pat.command.retire`.
- "+ register new type" is gated by `pat.gesture-type.create`.
- "Register patient" is gated by `pat.patient.create`.

A `patient-session` token carries only `conv.*` / `gest.*` authorities (ACS INV-3) and therefore
satisfies none of the above — a patient device can never see or act on any PAT surface (INV-PAT-7).

## Criterios de aceite (EARS)

- WHILE the session lacks `pat.command.create`, THE SYSTEM SHALL hide the "New command" action.
- WHILE the session lacks `pat.command.calibrate`, THE SYSTEM SHALL disable the calibration save control on every command row.
- WHILE the session lacks `pat.command.retire`, THE SYSTEM SHALL hide the retire action on every command row.
- WHILE the session lacks `pat.gesture-type.create`, THE SYSTEM SHALL hide the inline "register new type" action.
- WHILE the session lacks `pat.patient.create`, THE SYSTEM SHALL hide the "Register patient" action.
- THE SYSTEM SHALL evaluate every PAT action through the `AccessDecisionService` decision and SHALL NOT evaluate a role inline in a component.
- IF a patient-session token holds only `conv.*` / `gest.*` authorities, THEN THE SYSTEM SHALL expose no PAT catalog or registry action to it.
