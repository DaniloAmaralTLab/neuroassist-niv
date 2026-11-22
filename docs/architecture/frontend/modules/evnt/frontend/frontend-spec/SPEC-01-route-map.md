# SPEC-01 — Route Map — evnt (EVNT) Frontend

> Module **EVNT — Events and Alarms** · Entry lib `@neuroassist/evnt`
> (`frontend/libs/evnt`, shared ADR-006) · Shell `neuroassist-niv-web`.
> Sources: `frontend/04-frontend-architecture-direction.md` §2/§5, `frontend/02-architecture-blueprint.md` §3/§4,
> `frontend/05-state-and-data-flow.md` §6, local `adr/ADR-005-alarm-projection-ownership-and-live-delivery.md`.
> BE authorities are canonical in
> `../../../../backend/services/evnt-service/contracts/api-contract.md` §1 and SPEC-03 (alarm safety).

EVNT exposes **one routed surface** — the full-screen emergency alarm `/alarm` — plus Shell-embedded,
non-routed notice surfaces (the Home notice slot, the topbar notice, and the active-emergency home
takeover). The alarm is a **takeover**, not merely a reachable page: when the EVNT live projection
reports an active emergency the Shell either auto-routes to `/alarm` or renders the takeover overlay
(ADR-005 §3, doc 05 §6). The Shell lazy-loads `@neuroassist/evnt` via `loadChildren`; the alarm page is
lazy via `loadComponent`. EVNT contributes **no** standalone top-level sidebar destination — the
emergency reaches the caregiver by takeover, and routine requests reach them in context (Home / topbar).

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/alarm` | `AlarmPageComponent` | `libs/evnt/feature-alarm` | `authGuard`, `canReadEventGuard` | "Emergency alarm" | — (modal takeover, no breadcrumb — doc 05 §6) |

- `authGuard` is the shared session guard (`@neuroassist/shared/auth-session`). On an absent/expired
  session it redirects to the shell login route and never renders the alarm surface — carry-forward
  `guard:unauth-redirect:session-absent-must-go-to-login`.
- `canReadEventGuard` (`libs/evnt/access`) consumes `AccessDecisionService.can('evnt.event.read')` — it
  **never** hardcodes `return true` (carry-forward `guard:stub-permissive:hardcoded-return-true`).
- The acknowledge action is **additionally** gated at the handler by `canConfirmEventGuard`
  (`AccessDecisionService.can('evnt.event.confirm')`), not only by the route — a caregiver may read the
  alarm yet lack confirm (doc 04 §5).
- `/alarm` carries **no** breadcrumb: the emergency takeover is modal and demands total focus
  (Principle 2.3, doc 05 §6). On acknowledgement the Shell returns to the prior context (Home).

### 1.1 Patient resolution for the patient-scoped read (gap G-EVNT-4)

The BE active-alarm read is **patient-scoped** (`GET /evnt/patients/{patientId}/active-alarm`), while the
FE takeover is global `/alarm`. The route carries **no** `patientId`: the `AlarmFacade` polls
`active-alarm` for each patient the caregiver is linked to (resolved from the session / ACS link, doc 04
§1), and the `/alarm` takeover renders the **most recent unconfirmed emergency across those patients**;
its `patientId` travels inside the projected event, not in the URL. The pilot family tenant has a single
linked patient, so this reduces to one poll; a clinic tenant polls each linked patient (doc 04 §6). The
Confirm handler targets the **event-scoped** `POST /evnt/events/{eventId}/confirmation`, so it needs no
`patientId`.

## 2. Embedded (non-routed) surfaces

```
Shell neuroassist-niv-web (scope:web)
  topbar → RoutineNoticeIndicatorComponent (libs/evnt/feature-notifications) fed by AlarmFacade
           ← discreet routine-notice count/affordance, never a full-screen takeover (§3.2.E)
  Home   → RoutineNoticeListComponent (feature-notifications)   ← Home notice slot ("anything to attend to now?")
  Home   → active-emergency takeover overlay driven by AlarmFacade.activeEmergency
           ← the Shell overlays / auto-routes to /alarm when an active emergency appears (ADR-005 §3)
```

The emergency takeover and the routine notices are the **same projection** read two ways: an
`emergency` event takes over the screen; a `routine` event is a discreet, non-blocking notice and
**never** reaches `/alarm` (doc 03 §1, INV client-side "The FE never decides urgency").

## 3. Lazy-loading topology

```
Shell neuroassist-niv-web (scope:web)
  config/module-descriptors.ts → import('@neuroassist/evnt')  [loadChildren → EVNT_ROUTES]
    /alarm → loadComponent feature-alarm/AlarmPageComponent
  (the routine-notice surfaces are presentationals contributed from feature-notifications, fed by the
   Shell-injected AlarmFacade; they are embedded in Home/topbar, not routes of their own.)
```

## 4. Route → authority mapping (BE-canonical, INV-EVNT-7, D-639)

| Route / action | UI action gated | BE authority (`RoleAuthorityPolicy`) |
|---|---|---|
| `/alarm` (read projection) | read the active-alarm / event projection | `evnt.event.read` |
| `/alarm` → Confirm I attended | acknowledge an emergency | `evnt.event.confirm` |
| routine notice → Dismiss (acknowledge) | record attendance on a routine event | `evnt.event.confirm` |
| routine notice / event → Mark not real | record a `false_positive` verdict | `evnt.event.record` |
| escalation-status → Enable alarm notifications | register the Web Push subscription (Tier 0) | `evnt.subscription.create` |
| escalation-status → Turn push off | remove the Web Push subscription | `evnt.subscription.delete` |
| `/alarm` / event detail → view escalation attempts | read the masked out-of-band attempt trail | `evnt.escalation.read` |
| detection-lapse alert (embedded) → read the "station not detecting" list | read the detection-lapse list for a linked patient | `evnt.detection-lapse.read` |
| detection-lapse alert → Acknowledge "I see it" | acknowledge a detection lapse (stops escalation) | `evnt.detection-lapse.confirm` |

> **SAFETY-1 closure (ADR-005 / BE SPEC-11, 2026-11-20).** The Web Push enrollment / channel-status
> surface and the masked escalation-attempts trail are **embedded** on the `/alarm` takeover and the
> settings/escalation slot (SPEC-02 §2a) — they add **no new route**: `/alarm` stays the module's single
> routed surface. The three authorities above equal the BE constants exactly (INV-EVNT-7, D-639):
> `evnt.subscription.create`, `evnt.subscription.delete`, `evnt.escalation.read`.

> **SAFETY-GEST-1 — detection-lapse alert (ADR-006 / BE SPEC-12, 2026-11-20).** EDGE raises a
> **detection lapse** (a station connected but not *detecting*) over a service-client path EVNT owns the
> alerting for (BE api-contract §10–12). The FE surfaces a **distinct "station not detecting" alert** to
> the patient's linked caregivers on an **embedded** surface (the Home notice region / escalation-status
> slot, SPEC-02 §2b) — it adds **no new route**; `/alarm` stays the module's single routed surface. The
> lapse is **never** rendered as the emergency takeover, and an unconfirmed emergency always outranks it
> (BE SPEC-12 LAPSE-3 / LAPSE-6, mirrored in SPEC-03 §4c / SPEC-06 §2). The two caregiver authorities
> above equal the BE constants exactly (INV-EVNT-7): `evnt.detection-lapse.read` (list) and
> `evnt.detection-lapse.confirm` (acknowledge). The service-client raise/resolve authorities
> (`evnt.detection-lapse.create`, `evnt.detection-lapse.resolve`) are the EDGE backend's — **never** a
> dashboard route/guard/menu key (same device/service separation posture as `evnt.event.ingest`, SPEC-05 §2).

> Reconciliation (gap G-EVNT-1, see `contracts/backend-api-cross-link.md`): the FE vision (`frontend/04`
> §7, `frontend/05` §2) sketched `evnt.event.feedback`. The BE contract is the source of truth, so this
> and all downstream specs use **`evnt.event.record`** for the feedback write. INV-EVNT-7 requires the FE
> decision keys to equal the BE authority constants.
>
> `evnt.event.ingest` (gesture-report ingest) is an **`edge.device` device-token** authority
> (api-contract §2.1), **never** a dashboard route/guard/menu key (gap G-EVNT-5). No EVNT dashboard
> route reads it; no caregiver guard evaluates it.

## Criterios de aceite (EARS)

- WHEN a signed-in caregiver with `evnt.event.read` opens the alarm surface, THE SYSTEM SHALL render the full-screen `/alarm` page.
- IF the session is absent or expired on the `/alarm` route, THEN THE SYSTEM SHALL redirect to the login route and SHALL NOT render any EVNT alarm surface.
- IF `canReadEventGuard` denies `/alarm`, THEN THE SYSTEM SHALL redirect to the forbidden route and SHALL NOT load the alarm feature library.
- WHILE the session lacks `evnt.event.confirm`, THE SYSTEM SHALL hide the acknowledge action on the alarm even while the alarm is rendered under `evnt.event.read`.
- WHEN the live projection reports an active emergency, THE SYSTEM SHALL take over the screen with the full-screen alarm and SHALL NOT require the caregiver to navigate to it manually.
- THE SYSTEM SHALL render the `/alarm` takeover without a breadcrumb and SHALL NOT embed it in the normal navigation chrome.
- THE SYSTEM SHALL load the EVNT alarm feature route lazily via `loadComponent` and SHALL NOT eager-bundle the alarm feature library into the shell.
- THE SYSTEM SHALL evaluate `evnt.event.ingest` as a device-token authority only and SHALL NOT expose it as any EVNT dashboard route, guard or menu key.
- WHILE the session lacks `evnt.subscription.create`, THE SYSTEM SHALL hide the enable-push affordance on the escalation-status surface.
- WHILE the session lacks `evnt.escalation.read`, THE SYSTEM SHALL hide the escalation-attempts trail on the alarm and event-detail surfaces.
- THE SYSTEM SHALL embed the Web Push enrollment, channel-status and escalation-attempts surfaces on the existing `/alarm` and settings surfaces and SHALL NOT introduce an additional routed destination for them.
- THE SYSTEM SHALL surface the detection-lapse "station not detecting" alert on an embedded caregiver surface and SHALL NOT introduce an additional routed destination for it.
- WHILE the session lacks `evnt.detection-lapse.read`, THE SYSTEM SHALL hide the detection-lapse alert surface.
- WHILE the session lacks `evnt.detection-lapse.confirm`, THE SYSTEM SHALL hide the acknowledge action on the detection-lapse alert while still rendering the alert under `evnt.detection-lapse.read`.
- THE SYSTEM SHALL treat the detection-lapse raise and resolve authorities as service-client only and SHALL NOT expose them as an EVNT dashboard route, guard or menu key.
