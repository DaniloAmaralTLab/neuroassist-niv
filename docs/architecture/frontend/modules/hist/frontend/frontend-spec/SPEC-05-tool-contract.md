# SPEC-05 — Module Contract — hist (HIST) Frontend

> Content of `libs/hist/src/lib/hist.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. Permission keys **equal the BE authority constants**
> (D-639, BE api-contract §2/§3) — reads are `.read`, never `.view`. HIST exposes **read-only**
> authorities only (ADR-005). Sources: `frontend/04-frontend-architecture-direction.md` §7, BE
> api-contract §2 (`hist.history.read`) and §3 (`hist.audit.read`). The code blocks are **illustration**,
> not EARS contracts.

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'hist';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'hist',
  title: 'History',
  icon: 'history',                 // Material Symbols (self-hosted @font-face)
  section: 'care',
  order: 40,                       // a calm, always-available review destination (unlike EVNT's contextual takeover)
  entries: [
    { label: 'History', route: '/history', requires: 'hist.history.read' },
  ],
};
```

Menu/visibility is derived from the permission map by `NavigationService`, never built ad hoc in a
component. HIST contributes a **standalone navigable** `/history` destination (contrast EVNT, whose
surfaces are contextual takeovers). An optional **read-only history widget** may be embedded by DASH/Home
(SPEC-06 §4) — that is a Shell/DASH host surface, not a HIST menu entry.

## 2. `MODULE_PERMISSION_MAP` (BE-canonical authorities, D-639)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'hist.history.read': { label: 'Read patient history', justification: 'Read the per-patient immutable timeline (events, confirmations, feedback outcomes, escalation attempts and detection lapses) for a linked patient — CAREGIVER + CLINIC_COORDINATOR (BE api-contract §2; link/tenant scope enforced server-side).' },
};
```

> **Only one caregiver authority.** The caregiver surface uses **`hist.history.read`** exclusively. The BE
> caregiver timeline (`GET /hist/patients/{patientId}/history`) already interleaves `EscalationAttempted`
> and the detection-lapse facts (BE api-contract §2), so the escalation & detection-lapse trail is served
> by **the same read** under **the same authority** — it is **not** gated by `hist.audit.read`.
>
> **Correction of the vision (gap G1/R7 resolved, decision 2026-11-20).** `frontend/04` §7 and `frontend/05`
> §2 sketched a second caregiver authority `hist.audit.read` *(pending BE)* for the escalation/audit
> sub-view. The BE is authoritative: `hist.audit.read` is the **operator / compliance** authority on the
> **full producer trail** `GET /hist/audit` (BE api-contract §3, operator-only). It is therefore **NOT** a
> caregiver authority and is **absent** from this map. See the decision in
> `../contracts/backend-api-cross-link.md` §2 and gap closures §4.

> **Out of this map (not caregiver authorities).** `hist.audit.record` (producer service-client ingest,
> BE §1), `hist.audit.read` (operator full trail, BE §3) and `hist.erasure.create` (operator/service-client
> erasure, BE §4) are **never** caregiver dashboard menu/guard/permission keys and are absent here — the
> same service-client/operator separation EVNT applies to `evnt.event.ingest` (EVNT SPEC-05).

Every gate goes through `AccessDecisionService.can('hist.history.read')`; guards consume its output and
MUST NOT hardcode `return true` (carry-forward `guard:stub-permissive`).

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'hist.escalation-trail': { defaultState: true,  justification: 'Show the SAFETY-GEST-1 escalation & detection-lapse section on /history (fed by the same hist.history.read read). Off → only the proven event history ships; the timeline is unaffected (doc 01 §4, doc 06 R4).' },
  'hist.audit-console':    { defaultState: false, justification: 'Future operator/admin audit console over GET /hist/audit (hist.audit.read). OFF by default and un-routed for the caregiver MVP (SPEC-01 §4, doc 06 G2/Q2); shipping it is a separate admin-surface decision.' },
};
```

## 4. RBAC-of-UI rule and the delegated feedback affordance

- Action/surfaces are hidden/disabled by **authority**, not by role inspection. The whole `/history`
  surface (timeline + trail section) requires `hist.history.read`; WHILE the session lacks it, the surface
  and its menu entry are hidden (defense-in-depth — the BE enforces it regardless, BE api-contract §2).
- **Feedback affordance placement (gap G4/Q3 resolved, decision 2026-11-20).** The "Was it real?" affordance
  **is surfaced** on an event row in HIST's list, but the **write is delegated to EVNT** through EVNT's port
  via the shell (SPEC-04 §4, SPEC-06 §3) — HIST owns **no** write. Its visibility is gated by EVNT's
  authority **`evnt.event.record`** (`HistoryEntryVM.canRecordFeedback = AccessDecisionService.can('evnt.event.record')`),
  **not** by a HIST authority: HIST publishes no feedback/write authority of its own (ADR-005). Rationale:
  the caregiver mental model (doc 06 A3) keeps "was it real?" next to the event it judges, while ownership
  stays clean (HIST reads, EVNT writes). Recorded in `../contracts/backend-api-cross-link.md` §3.

## Acceptance criteria (EARS)

- WHILE the session lacks `hist.history.read`, THE SYSTEM SHALL hide the history surface, its menu entry and the escalation/detection-lapse trail section.
- THE SYSTEM SHALL evaluate every HIST access decision through `AccessDecisionService.can(<authority>)` and SHALL NOT evaluate a role inline in a component or return a hardcoded true from a guard.
- THE SYSTEM SHALL bind zero write endpoints in `@neuroassist/hist` and SHALL delegate the feedback write to EVNT's `evnt.event.record` port.
- WHILE the session lacks EVNT's `evnt.event.record`, THE SYSTEM SHALL hide the delegated "Was it real?" feedback affordance on the event row.
- THE SYSTEM SHALL use the authority `hist.history.read` exactly as the backend authority constant and SHALL NOT rename it to `hist.history.view` (`hist-authority-exact`).
- THE SYSTEM SHALL keep the operator authority `hist.audit.read` out of the caregiver permission map and SHALL NOT gate the caregiver escalation trail behind it (`hist-audit-read-operator-only`).
- WHILE the `hist.audit-console` flag is off, THE SYSTEM SHALL ship no operator audit-console route or surface and SHALL NOT call `GET /hist/audit` from the caregiver UI.
- THE SYSTEM SHALL treat `hist.audit.record` and `hist.erasure.create` as service-client or operator authorities only and SHALL NOT include them in the HIST permission map or any caregiver guard (`hist-producer-erasure-operator-only`).
