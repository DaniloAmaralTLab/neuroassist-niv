# 03 — Domain Framing (Frontend) — acs (ACS)

> Mirrors the backend ubiquitous language. This document does **not** redefine domain terms — it
> references the shared glossary and `_brief.md`, and frames the UI-side view models, events and
> state transitions.

## 1. Ubiquitous language (mirror — do not redefine)

Canonical definitions live in `techlab-ba/projects/neuroassist-niv/business/glossary.md` and the
project data model. ACS-relevant terms:

| Term | Source of truth | ACS FE note |
|---|---|---|
| Tenant | glossary · ADR-003 | Care unit (family or clinic). Active tenant via `tenant-context`. |
| Caregiver | glossary | Human actor with dashboard access; `role` ∈ {`caregiver`, `clinic_coordinator`}. |
| Patient | data model | Subject of a session; never an ACS operator. |
| PatientSession | data model · ADR-012 | Persistent, non-expiring, revocable session provisioned by a caregiver; `status` ∈ {`active`, `revoked`}. |
| platform-ops | ADR-011 | Service client that creates tenants; not a human role. |

## 2. View models (draft, per screen)

### `CaregiverListVM`
```
tenantName: string
caregivers: {
  id: string
  name: string
  email: string
  role: 'caregiver' | 'clinic_coordinator'
  linkedPatients: { id: string; name: string }[]
  status: 'active' | 'pending'
}[]
canInvite: boolean          // from AccessDecisionService.can('acs.caregiver.invite')
```

### `InviteCaregiverVM`
```
form: { name: string; email: string; role: 'caregiver' | 'clinic_coordinator' }
submitting: boolean
fieldErrors: Record<'name'|'email'|'role', string | null>
```

### `PatientSessionsVM` (Screen 07)
```
patient: { id: string; name: string; deviceOnline: boolean }
sessions: {
  id: string
  label: string             // e.g. "Márcio's phone"
  status: 'active' | 'revoked'
  activeSince: string        // ISO
  revokedAt: string | null
  revokedBy: string | null
}[]
canProvision: boolean
canRevoke: boolean
}
```

### `TenantAdminVM` (ops-only, ADR-011)
```
onAdminHost: boolean         // from opsHostGuard
form: { name: string; type: 'family' | 'clinic' }
submitting: boolean
```

## 3. UI events (user-triggered, change state)

| Event | Trigger | Effect |
|---|---|---|
| `inviteCaregiverSubmitted` | Screen 05 form submit | POST invite; append pending caregiver on success. |
| `patientSessionProvisioned` | Screen 07 confirm after `PersistentSessionWarning` | POST provision; prepend active session. |
| `patientSessionRevoked` | Screen 07 `RevokeButton` confirm | POST revoke; mark session `revoked` (SEC-001 immediate). |
| `tenantCreated` | Ops wizard submit | POST to `platform-ops`; show new tenant. |
| `roleChanged` | Caregiver row role edit | PATCH caregiver role; re-evaluate access. |

## 4. State transitions (UI level)

```
Caregiver list:       idle → loading → success | error
Invite form:          editing → submitting → success(appended) | error(fieldErrors)
Patient session:      none → provisioning → active → revoking → revoked
                      (revoking is terminal-forward; a revoked session never returns to active)
Tenant admin:         off-host(denied) | on-host(idle → submitting → success | error)
```

## 5. Invariants (client-side)

- A persistent patient session has **no expiry** — the UI never shows a countdown; it shows only
  `active since …` and an always-visible revoke action (SEC-001).
- `RevokeButton` is never hidden behind advanced settings (SEC-001).
- Role is a closed set: `caregiver | clinic_coordinator`. No `PLATFORM_ADMIN` option is rendered
  (ADR-011).
- Email required + format-validated before enabling invite submit.
- The tenant-creation screen renders only when `opsHostGuard` resolves `onAdminHost = true`.
- A tenant must keep **≥ 1 active caregiver**; removing the last one is blocked client-side (and
  server-side).
- No permission is evaluated inline; `AccessDecisionService.can(...)` gates every action.
- All copy is English (ADR-018); no locale toggle.
