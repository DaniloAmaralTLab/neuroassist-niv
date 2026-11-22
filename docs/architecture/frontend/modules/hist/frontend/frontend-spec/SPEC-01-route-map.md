# SPEC-01 — Route Map — hist (HIST) Frontend

> Routes the `@neuroassist/hist` lazy entry contributes to the `neuroassist-niv-web` shell. HIST is a
> **read-only** surface (ADR-005): it has **no** create/edit/delete route by design. Sources:
> `frontend/04-frontend-architecture-direction.md` §5, `frontend/05-state-and-data-flow.md` §6, BE
> `../../../../backend/services/hist-service/contracts/api-contract.md` §2 (caregiver timeline) and §3
> (operator audit trail). Permission keys equal the BE authority constants (D-639, BE api-contract §2/§3).

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/history` | `HistoryPageComponent` | `frontend/libs/hist/feature-history` | `authGuard`, `canReadHistoryGuard` | "History" | `[History]` |
| `/history` → trail section | `EscalationTrailSectionComponent` (section, not a child route) | `frontend/libs/hist/feature-trail` | inherits `authGuard`, `canReadHistoryGuard`; gated by feature flag `hist.escalation-trail` | "History" | `[History]` |

> **Single route, one authority.** HIST contributes exactly **one** navigable route, `/history`, guarded
> by `authGuard` + `canReadHistoryGuard` (`hist.history.read`). The escalation & detection-lapse trail is a
> **section of the same page fed by the same read** (BE api-contract §2 surfaces `EscalationAttempted` and
> the detection-lapse facts inside `GET /hist/patients/{patientId}/history`), not a separately-authorized
> route — see §4 and the decision in `../contracts/backend-api-cross-link.md` §2.

## 2. Lazy loading

- The shell loads `@neuroassist/hist` via `loadChildren` and merges `HIST_ROUTES` into the shell router
  (shared ADR-006, module-entry-as-library). `/history` resolves via `loadComponent`.
- No eager HIST code is in the shell initial bundle; the `/history` chunk is cold-loaded on first navigation
  (TTI target doc 01 §7).

## 3. Patient scope on the route

- `/history` reads the **active patient** from the shell patient-context (the caregiver's linked patient /
  the selected patient for a `clinic_coordinator`); the `patientId` is a path segment of the **backend** call
  `GET /hist/patients/{patientId}/history`, **never** a tenant path/query param (tenant is JWT-derived,
  doc 01 §6). HIST does not own a patient-picker (ACS/DASH concern); it reads the patient the shell supplies.

## 4. No-write / no-audit-console stance (ADR-005, decisions recorded)

- **No write routes.** HIST exposes no create/edit/delete route; the only write affordance (feedback) is
  **delegated to EVNT** through EVNT's port (SPEC-04 §4, SPEC-05 §4) — HIST contributes no route for it.
- **Operator audit console deferred.** The backend operator trail `GET /hist/audit` (`hist.audit.read`, BE
  api-contract §3) is **not** routed in the caregiver UI for MVP (decision, `../contracts/backend-api-cross-link.md`
  §2, doc 06 G2/Q2). A future admin audit console would live behind the `hist.audit-console` feature flag
  (off by default, SPEC-05 §3); it ships **no route** while the flag is off.

## Acceptance criteria (EARS)

- WHERE the `/history` route is reached without an authenticated session, THE SYSTEM SHALL redirect to the login route and SHALL NOT reveal patient history.
- WHILE the session lacks `hist.history.read`, THE SYSTEM SHALL deny the `/history` route through `canReadHistoryGuard` and SHALL NOT render the history timeline.
- IF a caregiver opens the history of a patient they are not linked to, THEN THE SYSTEM SHALL surface the backend forbidden outcome and SHALL NOT render any history entry.
- THE SYSTEM SHALL expose no create, edit or delete route under `/history` and SHALL NOT contribute a write route for feedback.
- THE SYSTEM SHALL route the escalation and detection-lapse trail as a section of the `/history` page under `hist.history.read` and SHALL NOT gate it behind the operator `hist.audit.read` authority.
