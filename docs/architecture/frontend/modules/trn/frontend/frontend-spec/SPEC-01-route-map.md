# SPEC-01 — Route Map — trn (TRN) Frontend

> The route surface `@neuroassist/trn` exposes. TRN is the **authoring** front of the speech tree: a
> caregiver training surface (Screen 08) and an **assisted patient-assent** surface (Screen 09). Both
> run under the **caregiver** ACS JWT — there is **one identity**, not two (orchestrator decision, see
> §4 and the ADR-005 amendment). Sources: `frontend/04-frontend-architecture-direction.md` §5,
> `frontend/05-state-and-data-flow.md` §6, `adr/ADR-005` (+ Specs amendment), `adr/ADR-007`, BE
> `contracts/api-contract.md` §0–§7 and §10 (authority matrix). Code fences are illustration — no
> Angular code is generated at this stage.

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/training` | `TrainingSessionPageComponent` | `libs/trn/feature-training` | `caregiverAuthoringGuard` | "Training" | `[Home, Training]` |
| `/training/assent` | `PatientAssentPageComponent` | `libs/trn/feature-patient-assent` | `caregiverAuthoringGuard` | "Patient assent" | `[Home, Training, Patient assent]` |

- `/training` is the Screen 08 caregiver authoring surface, registered in the caregiver web Shell
  `neuroassist-niv-web` via `TRN_MODULE_DESCRIPTOR` (`section:'care'`, "Training" menu item).
- `/training/assent` is the Screen 09 **assisted patient-assent** surface. Per the orchestrator decision
  it runs **inside the same caregiver session** (the caregiver and the patient operate it together), not
  under a separate patient identity; it is reached from within the training surface (the caregiver opens
  it for a proposal that already carries the caregiver half and needs the patient/guardian assent). It is
  built host-portable (large targets, switch-scan) so it **can** later be mounted in the Patient-Mode host
  (gap G1, undecided), but that is **not required** for v1.
- Both routes are lazy (`loadComponent`). The caregiver Shell mounts TRN via
  `loadChildren: () => import('@neuroassist/trn').then(r => r.TRN_ROUTES)` under the `training` base and
  applies `canActivate: [caregiverAuthoringGuard]`.

## 2. Why there is no patient-session route (reconciliation)

The FE vision assumed a second surface under an ACS **patient-session** token carrying a
`trn.proposal.confirm` authority (Screen 09 under the Patient-Mode host). The **BE contract and the
orchestrator decision supersede that**: ACS **INV-3** keeps the patient-session token restricted to
`conv.*`/`gest.*`, so there is **no** `trn.proposal.confirm` authority and **no** patient-session token is
ever presented to `/trn` (BE api-contract §0.1/§0.2 — a patient-session token is `403` on every `/trn`
path). The patient/guardian assent is instead an **in-session domain fact** attested under the
**caregiver's** authority (`POST /trn/proposals/{pid}/patient-assent`, authority `trn.proposal.approve`,
BE api-contract §4.2; ADR-002 Option C). TRN therefore registers **no** `/patient/confirm-training`
route and runs entirely under the caregiver JWT. The ADR-005 wording is amended accordingly (status
stays `aceita`).

## 3. `TRN_ROUTES` shape (illustration)

```ts
export const TRN_ROUTES: Routes = [
  {
    path: '',                                  // /training
    canActivate: [caregiverAuthoringGuard],    // real caregiver session; never a hardcoded true
    loadComponent: () =>
      import('./feature-training/training-session-page.component')
        .then(m => m.TrainingSessionPageComponent),
    title: 'Training',
    data: { breadcrumb: 'Training' },
  },
  {
    path: 'assent',                            // /training/assent
    canActivate: [caregiverAuthoringGuard],    // same caregiver session; assisted patient-assent capture
    loadComponent: () =>
      import('./feature-patient-assent/patient-assent-page.component')
        .then(m => m.PatientAssentPageComponent),
    title: 'Patient assent',
    data: { breadcrumb: 'Patient assent' },
  },
];
```

## 4. Guards

- **`caregiverAuthoringGuard`** (`libs/trn/access`) — authorises **both** `/training` and
  `/training/assent` by the **caregiver-session identity** (the ACS caregiver JWT carrying the `trn.*`
  authorities, BE api-contract §0.2), read from `@neuroassist/shared/auth-session`. On an absent /
  expired / revoked (401) session it routes to the caregiver Shell sign-in / "session ended" surface and
  **never** renders an authoring surface.
  - **Carry-forward `guard:stub-permissive` (Learning D-611, 6 occurrences):** the guard **never**
    hardcodes `return true`. Its fine-grained `trn.*` authority refinement rides on
    `@neuroassist/shared/access-decision`, which today is a **Wave-0 stub** (interface only —
    `can(permission): boolean`). Until the **PLATFORM / frontend `routeGuards`** ledger item fleshes it
    out, `caregiverAuthoringGuard` decides from caregiver-session **presence/validity** only and the
    per-authority gate is deferred to that platform work. TRN does **not** invent a working
    `access-decision` here, and it does **not** ship a hardcoded true.
- There is **no** `patientConfirmGuard` and **no** patient-session guard (superseding the vision): the
  assent surface is caregiver-session only.

## 5. The Patient-Mode host is optional for TRN (gap G1)

The Patient-Mode host that CONV/GEST need (gap G1, shared) is **not** a blocker for TRN: because the
assent surface runs under the caregiver session, Screen 09 ships in the caregiver web Shell today. The
`feature-patient-assent` surface is nonetheless built host-portable (large targets, switch-scan, a
`NAVIGATION_INTENT_PORT` consumer with a no-op default) so that, **if** the owner later decides to render
it inside the Patient-Mode host, it can be mounted there without a rewrite — but that remains an optional
future (G1 undecided), not a v1 dependency.

## Acceptance criteria (EARS)

- WHEN a caregiver presenting a valid caregiver session navigates to `/training`, THE SYSTEM SHALL render the training-session authoring surface.
- WHEN a caregiver presenting a valid caregiver session navigates to `/training/assent`, THE SYSTEM SHALL render the assisted patient-assent surface.
- IF the `caregiverAuthoringGuard` finds no active caregiver session on a TRN route, THEN THE SYSTEM SHALL redirect to the caregiver sign-in surface and SHALL NOT render any authoring surface.
- THE SYSTEM SHALL evaluate the `caregiverAuthoringGuard` from the real caregiver session and SHALL NOT return a hardcoded true from the guard.
- THE SYSTEM SHALL register no patient-session route and no `/patient/confirm-training` route, and SHALL present no patient-session token on any `/trn` endpoint.
- THE SYSTEM SHALL register exactly the two caregiver routes `/training` and `/training/assent` under the single caregiver identity.
