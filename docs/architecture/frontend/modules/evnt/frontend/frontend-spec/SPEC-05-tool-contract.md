# SPEC-05 — Module Contract — evnt (EVNT) Frontend

> Content of `libs/evnt/src/lib/evnt.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. Permission keys equal the BE authority constants
> (INV-EVNT-7, D-639). Sources: `frontend/04-frontend-architecture-direction.md` §7,
> BE api-contract §1 (authority→endpoint matrix), BE `spec/backend/SPEC-03` (safety flags).

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'evnt';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'evnt',
  title: 'Alarms',
  icon: 'emergency_home',          // Material Symbols (self-hosted @font-face) — the takeover glyph
  section: 'care',
  order: 10,                       // the parent flow (flow 4.2) — highest-priority surface
  // EVNT contributes NO standalone top-level destination that a caregiver navigates to on purpose: the
  // emergency reaches them by TAKEOVER (/alarm) and routine requests by the Home/topbar notice surfaces.
  // The entry below is a contextual descriptor the Shell surfaces WHILE an active emergency exists.
  entries: [
    { label: 'Emergency alarm', route: '/alarm', requires: 'evnt.event.read', contextual: true },
  ],
};
```

Menu/visibility is derived from the permission map by `NavigationService`, never built ad hoc in a
component. The always-present **topbar `RoutineNoticeIndicator`** and the **Home notice slot** are not
menu entries — they are Shell-hosted presentationals fed by `AlarmFacade` (SPEC-06 §2, doc 02 §3).

## 2. `MODULE_PERMISSION_MAP` (BE-canonical authorities, INV-EVNT-7)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'evnt.event.read':    { label: 'Read alarms/events', justification: 'Read the active-alarm projection and recent events for the takeover and routine notices — CAREGIVER + CLINIC_COORDINATOR (api-contract §3.1/§3.2/§3.3).' },
  'evnt.event.confirm': { label: 'Acknowledge alarm',  justification: 'Explicit human acknowledgement of an emergency (sets confirmedAt/confirmedBy; closes the parent flow) — CAREGIVER + CLINIC_COORDINATOR (api-contract §4.1, INV-EVNT-5).' },
  'evnt.event.record':  { label: 'Record feedback',    justification: 'Record a real / false_positive verdict on an event, independent of acknowledgement — CAREGIVER + CLINIC_COORDINATOR (api-contract §5.1).' },
  'evnt.subscription.create': { label: 'Enable push alarms', justification: 'Register the browser Web Push subscription as the Tier 0 out-of-band channel (SAFETY-1 closure) — CAREGIVER + CLINIC_COORDINATOR (api-contract §6.1, ADR-005 / SPEC-11).' },
  'evnt.subscription.delete': { label: 'Disable push alarms', justification: 'Remove the caregiver\'s Web Push subscription so the backend stops targeting a dead endpoint — CAREGIVER + CLINIC_COORDINATOR (api-contract §6.2).' },
  'evnt.escalation.read':     { label: 'Read escalation trail', justification: 'Read the masked out-of-band escalation attempts (who was notified, channel, outcome) for an emergency — CAREGIVER + CLINIC_COORDINATOR (api-contract §3.4, SPEC-11).' },
  'evnt.detection-lapse.read':    { label: 'Read detection lapses', justification: 'Read the distinct "station not detecting" list for a linked patient (SAFETY-GEST-1) — CAREGIVER + CLINIC_COORDINATOR (api-contract §11.1, ADR-006 / SPEC-12).' },
  'evnt.detection-lapse.confirm': { label: 'Acknowledge lapse',    justification: 'Acknowledge a detection-lapse alert (stops BE escalation; same human-ack shape as evnt.event.confirm) — CAREGIVER + CLINIC_COORDINATOR (api-contract §12.1, SPEC-12 LAPSE-5).' },
};
```

> **SAFETY-1 closure (gap G-EVNT-7, ADR-005 / BE SPEC-11, 2026-11-20).** The three keys above are the
> new BE authorities for the out-of-band escalation client (op→action parity: `createPushSubscription` →
> `create`, `deletePushSubscription` → `delete`, `listEscalationAttempts` → `read`). They equal the BE
> constants exactly (INV-EVNT-7) and gate the §2a push-enrollment / channel-status / escalation-trail
> surfaces. They are caregiver authorities — **not** device-token ones (the device/caregiver separation
> of INV-EVNT-6 is unchanged; `evnt.event.ingest` stays absent from this map).

> Reconciliation (gap G-EVNT-1): the FE vision (`frontend/04` §7, `frontend/05` §2) sketched
> `evnt.event.feedback`. The BE authority is **`evnt.event.record`** (api-contract §1 op-name parity:
> `recordFeedback` → `record`); this map and every guard/affordance use `evnt.event.record`.
> Reconciliation (gap G-EVNT-5): **`evnt.event.ingest`** is a device-token authority minted on the
> `edge.device` identity token for `POST /evnt/gesture-reports` (api-contract §2.1) — it is **never** a
> dashboard menu/guard/permission key and is **absent** from this map (INV-EVNT-6). A patient-session /
> device token never carries a caregiver `evnt.*` authority, and a caregiver token never carries
> `evnt.event.ingest`. The FE permission map holds only **caregiver** authorities.

> **SAFETY-GEST-1 closure (ADR-006 / BE SPEC-12, 2026-11-20).** The two keys
> `evnt.detection-lapse.read` (op `listDetectionLapses` → `read`) and `evnt.detection-lapse.confirm` (op
> `acknowledgeDetectionLapse` → `confirm`) are the caregiver authorities for the detection-lapse alert.
> They equal the BE constants exactly (INV-EVNT-7) and gate the "station not detecting" alert surface
> (SPEC-02 §2b) and its acknowledge action. The **service-client** authorities `evnt.detection-lapse.create`
> (raise) and `evnt.detection-lapse.resolve` are minted on the `edge-service` principal for the EDGE
> backend (api-contract §10) — they are **never** dashboard menu/guard/permission keys and are **absent**
> from this map, exactly like `evnt.event.ingest` (device/service-client separation, INV-EVNT-6). A
> caregiver token never carries `create`/`resolve`; the `edge-service` token never carries the caregiver
> `read`/`confirm` lapse authorities.

Every gate goes through `AccessDecisionService.can(<authority>)`; guards consume its output and MUST
NOT hardcode `return true` (carry-forward `guard:stub-permissive`).

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'evnt.routine-notice':      { defaultState: true,  justification: 'Discreet routine-notice surfaces (Home slot + topbar); off → only the emergency takeover ships (doc 02 §3.2.E).' },
  'evnt.alarm-autoroute':     { defaultState: true,  justification: 'Shell auto-routes / overlays /alarm when the projection reports an active emergency — the takeover behaviour (ADR-005 §3, doc 05 §6).' },
  'evnt.alarm-notification':  { defaultState: true,  justification: 'Foreground in-page Notification + audio cue — a courtesy, NOT a delivery channel (SPEC-04 §5.5).' },
  'evnt.push-escalation':     { defaultState: true,  justification: 'The real out-of-band Tier 0 Web Push client (service-worker enrollment + subscription lifecycle) that closes SAFETY-1 alongside BE SMS/voice — off → the push-enrollment surface and SW registration ship dark, in-app polling still runs (SPEC-04 §5.6, ADR-005 / SPEC-11).' },
  'evnt.detection-lapse-alert': { defaultState: true, justification: 'The distinct "station not detecting" alert (SAFETY-GEST-1): lapse list poll + acknowledge, reusing the AlarmFacade monitoring model — off → the lapse alert surface and its poll ship dark, the emergency path is unaffected (SPEC-04 §6, ADR-006 / SPEC-12).' },
};
```

## 4. RBAC-of-UI rule

Action affordances are hidden/disabled by authority, not by role inspection: the acknowledge action on
the takeover is hidden WHILE the session lacks `evnt.event.confirm`; the "Mark not real" action on a
notice/event is hidden WHILE the session lacks `evnt.event.record`; the whole alarm/notice surface
requires `evnt.event.read`. Defense-in-depth only — the BE enforces every authority regardless
(api-contract §1, INV-EVNT-7). A caregiver who can read but not confirm still sees the alarm (so the
limitation is visible) but cannot acknowledge it.

## Criterios de aceite (EARS)

- WHILE the session lacks `evnt.event.read`, THE SYSTEM SHALL hide the alarm surface and the routine-notice surfaces.
- WHILE the session lacks `evnt.event.confirm`, THE SYSTEM SHALL hide the acknowledge action on the alarm.
- WHILE the session lacks `evnt.event.record`, THE SYSTEM SHALL hide the mark-not-real feedback action.
- THE SYSTEM SHALL evaluate every EVNT action through `AccessDecisionService.can(<authority>)` and SHALL NOT evaluate a role inline in a component.
- THE SYSTEM SHALL use the authority `evnt.event.record` for the feedback write and SHALL NOT use the superseded `evnt.event.feedback` key.
- THE SYSTEM SHALL treat the ingest authority as a device-token authority only and SHALL NOT include it in the EVNT permission map or any caregiver guard.
- WHILE the session lacks `evnt.subscription.create`, THE SYSTEM SHALL hide the enable-push affordance.
- WHILE the session lacks `evnt.subscription.delete`, THE SYSTEM SHALL hide the disable-push affordance.
- WHILE the session lacks `evnt.escalation.read`, THE SYSTEM SHALL hide the escalation-attempts trail.
- THE SYSTEM SHALL use the subscription and escalation authorities `evnt.subscription.create`, `evnt.subscription.delete` and `evnt.escalation.read` exactly as the backend authority constants (`authority-constants-exact`) and SHALL NOT rename them.
- WHILE the session lacks `evnt.detection-lapse.read`, THE SYSTEM SHALL hide the detection-lapse alert surface and its list.
- WHILE the session lacks `evnt.detection-lapse.confirm`, THE SYSTEM SHALL hide the acknowledge action on the detection-lapse alert.
- THE SYSTEM SHALL use the detection-lapse authorities `evnt.detection-lapse.read` and `evnt.detection-lapse.confirm` exactly as the backend authority constants and SHALL NOT rename them.
- THE SYSTEM SHALL treat the detection-lapse raise and resolve authorities as service-client only and SHALL NOT include them in the EVNT permission map or any caregiver guard.
