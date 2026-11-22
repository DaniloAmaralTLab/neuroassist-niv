# SPEC-03 — View Models — acs (ACS) Frontend

> View-models are TypeScript `record`-style read-only shapes exposed from facade signals.
> VMs carry only data the template renders; gating booleans come from `AccessDecisionService`.
> Facades MUST NOT fabricate missing fields as `null` fillers — a field absent from the BE wire
> record is modelled explicitly, not invented (carry-forward `fe-facade:fabricated-null-fields`).
> Sources: `frontend/03-domain-framing-frontend.md` §2–§5, `frontend/05-state-and-data-flow.md`.

## 1. `CaregiverListVM` (Screen 05)

```ts
type CaregiverRole = 'caregiver' | 'clinic_coordinator';          // closed set (ADR-011)
type CaregiverStatus = 'active' | 'deactivated';                   // BE status values

interface PatientLinkVM { patientId: string; }                     // from GET /acs/caregivers/{id}/links
interface CaregiverRowVM {
  id: string;
  username: string;                 // BE field (not "email"; BE registers by username)
  role: CaregiverRole;
  status: CaregiverStatus;
  links: PatientLinkVM[];
}
interface CaregiverListVM {
  tenantName: string;               // from tenant-context (display only)
  rows: CaregiverRowVM[];
  listState: 'idle' | 'loading' | 'success' | 'error';
  canRegister: boolean;             // AccessDecisionService.can('acs.caregiver.create')
}
```

> Gap G3: the BE contract has **no** `GET /acs/caregivers` list-all endpoint — only
> `GET /acs/caregivers/me` and `GET /acs/caregivers/{id}/links`. The caregiver roster therefore
> cannot be fully populated from the current BE. SPEC-04 marks the `list` operation as
> **pending-BE**; until it lands the page renders `me` plus any links and surfaces a degraded
> banner. UI events: `inviteCaregiverSubmitted` (register), `roleChanged` (PATCH not yet in BE — see
> G4), `caregiverDeactivated`.

## 2. `RegisterCaregiverVM` (Screen 05 form)

```ts
interface RegisterCaregiverVM {
  form: { username: string; password: string; role: CaregiverRole };
  submitState: 'editing' | 'submitting' | 'error';
  fieldErrors: Record<'username' | 'password' | 'role', string | null>;
}
```

- Invariant: submit is disabled while `username` is blank, `password` is blank, or `role` is unset.
- On `username-taken` (409) the BE `type` slug maps to `fieldErrors.username` (SPEC-07).

## 3. `PatientSessionsVM` (Screen 07)

```ts
type SessionStatus = 'active' | 'revoked';
interface PatientSessionRowVM {
  id: string;
  label: string;                    // e.g. "Márcio's phone" (patient name + device)
  status: SessionStatus;
  activeSince: string;              // ISO (BE createdAt); UI shows "active since …", never a countdown
  revokedAt: string | null;         // present only when status = revoked
  revokedBy: string | null;         // caregiver id/name; present only when revoked
}
interface PatientSessionsVM {
  patient: { id: string; name: string; deviceOnline: boolean };
  sessions: PatientSessionRowVM[];
  opState: 'idle' | 'provisioning' | 'revoking' | 'error';
  canProvision: boolean;            // AccessDecisionService.can('acs.patient-session.provision')
  canRevoke: boolean;               // AccessDecisionService.can('acs.patient-session.revoke')
}
```

- UI events: `patientSessionProvisioned` (after `PersistentSessionWarning` confirm),
  `patientSessionRevoked` (RevokeButton confirm).
- A persistent session has no expiry — the VM exposes `activeSince` only; there is no `expiresAt`.

## 4. `TenantAdminVM` (ops-only, ADR-011)

```ts
interface TenantAdminVM {
  form: { name: string; type: 'family' | 'clinic' };   // closed set; no PLATFORM_ADMIN
  submitState: 'idle' | 'submitting' | 'error';
  fieldErrors: Record<'name' | 'type', string | null>;
}
```

## 5. VM ↔ wire mapping

Each VM is produced by a `to<X>(wire)` mapper over a `<X>Wire` type that mirrors the BE record
shape 1:1 (carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`). Mappers live in
`libs/acs/data-access`; wire types mirror the BE JSON bodies in the api-contract.

## Criterios de aceite (EARS)

- WHILE `CaregiverListVM.listState = 'loading'`, THE SYSTEM SHALL render the list skeleton and SHALL NOT render the empty state.
- WHILE `CaregiverListVM.listState = 'success'` and `rows` is empty, THE SYSTEM SHALL render the empty state.
- WHILE `CaregiverListVM.canRegister = false`, THE SYSTEM SHALL hide the "Register caregiver" action.
- WHILE a patient session has `status = 'active'`, THE SYSTEM SHALL display "active since {activeSince}" and SHALL NOT display any expiry countdown.
- WHILE a patient session has `status = 'revoked'`, THE SYSTEM SHALL display the revoked badge with `revokedAt` and `revokedBy`.
- WHILE `PatientSessionsVM.canRevoke = true` on an active session, THE SYSTEM SHALL render the revoke action in the session row and SHALL NOT place it behind advanced settings.
- IF a BE wire record omits an optional field, THEN THE SYSTEM SHALL model it as explicitly absent and SHALL NOT fabricate a placeholder value.
