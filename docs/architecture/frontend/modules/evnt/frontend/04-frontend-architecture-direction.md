# 04 — Frontend Architecture Direction — evnt (EVNT)

> Scope: how EVNT is built within the Nx workspace. No Angular code at this stage.

## 1. Stack

Angular 21 · Nx 22.x · TypeScript strict · RxJS 7.8 + Signals · Jest · Playwright (e2e).
Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`). English-only (ADR-018).

## 2. App boundary

`@neuroassist/evnt` is a **library with a lazy NgModule entry** (`evnt.module.ts`, shared ADR-006).
The `neuroassist-niv-web` Shell loads it via `loadChildren` and merges `EVNT_ROUTES` (`/alarm`) into
the shell router. The routine-notice presentational is additionally embedded by the Shell on Home /
topbar, fed by the EVNT facade the Shell injects (so a routine request is noticed without opening
`/alarm`).

## 3. Library organization (Nx tags, mirrors EDGE/ACS/PAT)

| Sublib | Nx tag | Role |
|---|---|---|
| `access/` | `type:access` | route guards (`evnt.event.read` / `evnt.event.confirm`) |
| `api/` | `type:data-access` | `EVENT_PORT` + Http/Mock adapters + `*Wire` types |
| `alarm.facade.ts` | `type:data-access` | signals facade (live projection + acknowledge) |
| `feature-alarm/` | `type:feature` | full-screen alarm page (`/alarm`) |
| `feature-notifications/` | `type:feature` | routine-notice + optional notification center |
| `ui/` | `type:ui` | alarm-local presentational components |

Boundary rule: `feature-*` may depend on `data-access` + `ui` + `shared/*`; `ui` depends on nothing
app-specific; adapters depend only on `shared/access-http-base`. No feature imports another feature.

## 4. Hub library dependencies

- `@neuroassist/shared/access-http-base` — `${ACCESS_HTTP_BASE}` base + correlation-id/JWT interceptor
  (tenant server-derived from the JWT claim).
- `@neuroassist/shared/access-decision` — `AccessDecisionService.can('evnt.*')` for all guards.
- `@neuroassist/shared/error-model` — `ProblemDetail → AppError`.
- `@neuroassist/shared/ui-feedback` — toast/banner for routine notices and errors.
- `@neuroassist/shared/ui-tokens` — `--color-alarm` and all design tokens.
- `@neuroassist/shared/observability` — alarm/acknowledge telemetry.
- Read-only cross-module: `Command` label/urgency resolution comes from the event read-model projected
  by `evnt-service` (EVNT does not import PAT's lib; the BE joins the command into the event payload).

## 5. Routing strategy

- Shell → `@neuroassist/evnt` via `loadChildren`; `/alarm` via `loadComponent`.
- Guards: `canActivate: [authGuard, canReadEventGuard]` on the alarm surface; the acknowledge action
  is additionally gated by `canConfirmEventGuard` at the handler (not only the route).
- The Shell may **auto-route** to `/alarm` (or render the takeover overlay) when the EVNT projection
  reports an active emergency — the alarm is a takeover, not merely a reachable page.

## 6. State strategy

- **Signals-only.** `AlarmFacade` holds `private signal<Event[]>` of the live projection +
  `.asReadonly()`; `computed` derives `activeEmergency` (most recent unconfirmed emergency) and
  `routineNotices`. **No NgRx, no manual `BehaviorSubject`** as source of truth.
- `acknowledge(eventId)` calls the port, then re-reads / updates the projection signal; the transient
  "just acknowledged" feedback is a feature-local signal (not persisted projection state), matching the
  prototype's `confirmedInThisSessionId`.
- Local dismissal (`seen`) for routine notices is feature-local signal state.

## 7. Tool contract strategy (`evnt.contract.ts`)

| Field | Value |
|---|---|
| `toolKey` | `evnt` |
| `permissions` | `evnt.event.read`, `evnt.event.confirm`, `evnt.event.feedback` |
| `routes` | `/alarm` (+ Shell-embedded routine-notice surface) |
| `featureFlags` | `evnt.routine-notice` (toggle discreet notices), `evnt.alarm-autoroute` |
| `shellSurfaces` | Home notice slot + topbar notice (routine); full-screen takeover (emergency) |

> Permission keys mirror BE authorities `evnt.<resource>.<action>` with English-canonical verbs
> (D-639): reads are `.read` — never `.view` / `.edit`. The BE vision runs in parallel; FE and BE
> must publish the **same** `evnt.event.read|confirm|feedback` authorities (gap flagged in doc 06).
