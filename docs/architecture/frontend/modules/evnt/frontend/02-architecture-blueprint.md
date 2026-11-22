# 02 — Architecture Blueprint — evnt (EVNT) Frontend

> Scope: frontend boundaries and flows. No Angular code is produced at this stage.

## 1. System boundary

The EVNT frontend is a **client of `evnt-service`** through the shared Access Layer
(`@neuroassist/shared/access-http-base`, base `${ACCESS_HTTP_BASE}/evnt`). It makes **no direct calls
to any legacy system** and never talks to the edge agent, HIST or DASH services directly. Its job is to
render the alarm/notification projection and to send the acknowledge write. Because **messaging is
disabled** (project-context `messaging.enabled = false`), EVNT learns of new events over **sync REST**
(a live-read cycle, doc 05 §2), not a broker push; the acknowledge write is likewise sync REST, and
`evnt-service` audits it to HIST server-side.

## 2. External actors and systems

| Actor / system | Relationship to EVNT FE |
|---|---|
| Browser (authenticated caregiver, JWT) | Operates the alarm/notification surfaces. |
| `evnt-service` (via `${ACCESS_HTTP_BASE}/evnt`) | Event read-model (live projection) + acknowledge write + routine-notice feed. Source of truth for `urgency`. |
| `acs-service` (ACS) | Issues the JWT carrying `evnt.*` authorities and the tenant claim. |
| `hist-service` (HIST) | Receives the audited acknowledgement — **server-side**, written by `evnt-service`; the FE never calls HIST. |
| GEST / edge (agent) | Upstream producer of the recognition that becomes an event; **not** a FE actor. |
| EDGE device-status | Sibling surface; its offline state is amber, never an EVNT alarm. |

## 3. End-to-end user flows

### Golden path — emergency (flow 4.2, the parent flow)

```
patient gesture (GEST)
   -> evnt-service raises Event (command.urgency = emergency)
      -> EVNT live projection reports an ACTIVE emergency
         -> Shell routes / takes over with full-screen AlarmComponent
+--------------------------------------------------+
|  (full-bleed --color-alarm)                      |
|            emergency_home (icon)                 |
|        Márcio needs help                         |
|        "Help"  (command label)                   |
|        Gesture detected at 14:32                 |
|   [ Confirm I attended to Márcio ]  <-- only act |
+--------------------------------------------------+
   -> caregiver clicks Confirm  (guard evnt.event.confirm)
      -> POST acknowledge -> confirmedAt/confirmedBy/feedback='real'
         -> evnt-service audits to HIST
            -> projection: no active emergency
               -> "Attendance confirmed at 14:33 by Jamilly" (session feedback)
                  -> return to normal (Home)
```

### Alternative — routine (discreet notice, §3.2.E)

```
patient gesture -> evnt-service raises Event (urgency = routine)
   -> EVNT projection adds a routine notice (NOT an active emergency)
      -> discreet toast / inline card on Home: ""<label>" requested at 14:32"
         -> caregiver dismisses (acknowledge, feedback='real') OR marks false_positive
            -> never a full-screen takeover
```

### Edge cases

- **No active alarm** — `/alarm` renders a calm "no active emergency right now" empty state.
- **Already acknowledged** — the active-emergency derivation only counts events **without**
  `confirmedAt`; a resolved alarm (even if most recent) never reappears (prototype parity:
  `AlarmComponent.eventPending`).
- **Multiple pending emergencies** — the most recent unconfirmed emergency is shown; others queue
  behind it and surface after acknowledgement (doc 05 §1).
- **False positive** — the caregiver can mark a routine notice / resolved event `false_positive`
  (`evnt.event.feedback`); this is a feedback write, distinct from acknowledgement.
- **Device offline (EDGE)** — amber EDGE badge; EVNT shows no alarm (no event was raised).
- **Load / error** — read failure shows a feedback banner via `@neuroassist/shared/ui-feedback`;
  the FE never fabricates an "all clear" when the projection could not be read.

## 4. Internal boundaries (library structure, mirrors EDGE/ACS/PAT)

```
libs/evnt/                                 # @neuroassist/evnt
+-- src/index.ts                           # public API (routes, provideEvnt, facade, VMs, port token)
+-- src/lib/
    +-- evnt.module.ts                     # lazy NgModule entry (shared ADR-006)
    +-- evnt.routes.ts                     # EVNT_ROUTES[] (/alarm, ...)
    +-- evnt.providers.ts                  # provideEvnt({ adapter }) — default 'http'
    +-- access/
    |   +-- can-read-event.guard.ts        # AccessDecisionService.can('evnt.event.read')
    |   +-- can-confirm-event.guard.ts     # AccessDecisionService.can('evnt.event.confirm')
    +-- api/
    |   +-- event.port.ts                  # EVENT_PORT token + *Wire types (mirror evnt-service)
    |   +-- event-http.adapter.ts          # base ${ACCESS_HTTP_BASE}/evnt (DEFAULT)
    |   +-- event-mock.adapter.ts          # wire-shaped fixtures (dev/test only)
    +-- alarm.facade.ts                    # signals: activeEmergency, routineNotices, acknowledge()
    +-- feature-alarm/
    |   +-- alarm-page.component.ts         # full-screen emergency alarm (route /alarm)
    +-- feature-notifications/
    |   +-- routine-notice.component.ts     # discreet routine toast/inline (Home/topbar embed)
    |   +-- notification-center.component.ts (optional) recent-notices list surface
    +-- ui/ (optional)                      # alarm-local presentational bits
    +-- styles/ (optional)                  # Tailwind utilities bound to --color-alarm token
```

> EVNT exposes **one facade** (`AlarmFacade`) that owns the live alarm/notification projection. The
> Shell injects it to feed the Home notice slot; the `/alarm` feature consumes it lazily. EVNT does
> **not** expose a history-listing facade (that is HIST) nor an aggregation facade (that is DASH).

## 5. Cross-cutting concerns

- **Auth / entitlement** — route guards `canReadEventGuard` / `canConfirmEventGuard` call
  `AccessDecisionService.can('evnt.event.read' | 'evnt.event.confirm')`; **never** a hardcoded `true`.
- **Observability** — alarm-raised-shown, acknowledge, false-positive and read-error are reported
  through `@neuroassist/shared/observability` with the correlation id from the Access Layer.
- **Error model** — `evnt-service` `ProblemDetail` → `AppError` via `@neuroassist/shared/error-model`
  → caregiver message via `@neuroassist/shared/ui-feedback`.
- **Design tokens** — `--color-alarm` and all colour/spacing from `@neuroassist/shared/ui-tokens`
  (oklch); no hardcoded red; dark is the default theme.
- **i18n** — none; English-only (ADR-018).
