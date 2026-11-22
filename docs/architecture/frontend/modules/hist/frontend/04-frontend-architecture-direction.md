# 04 — Frontend Architecture Direction — hist (HIST)

> Scope: how HIST is built within the Nx workspace. No Angular code at this stage.

## 1. Stack

Angular 21 · Nx 22.x · TypeScript strict · RxJS 7.8 + Signals · Jest · Playwright (e2e).
Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`). English-only (ADR-018).

## 2. App boundary

`@neuroassist/hist` is a **library with a lazy NgModule entry** (`hist.module.ts`, shared ADR-006).
The `neuroassist-niv-web` Shell loads it via `loadChildren` and merges `HIST_ROUTES` (`/history`) into
the shell router. A small read-only history widget may additionally be embedded by the Shell/DASH on a
dashboard surface, fed by a slice of the HIST facade the host injects — the embedding direction (DASH
hosts HIST vs HIST stands alone) is an open question (doc 06 Q1).

## 3. Library organization (Nx tags, mirrors EVNT/EDGE/ACS/PAT)

| Sublib | Nx tag | Role |
|---|---|---|
| `access/` | `type:access` | route guards (`hist.history.read` / `hist.audit.read`) |
| `api/` | `type:data-access` | `HISTORY_PORT` + Http/Mock adapters + `*Wire` types (read-only) |
| `history.facade.ts` | `type:data-access` | signals facade over the immutable trail (read-only) |
| `feature-history/` | `type:feature` | period tabs + event list + summary (`/history`) |
| `feature-trail/` | `type:feature` | escalation attempts + detection lapses (SAFETY-GEST-1) |
| `ui/` | `type:ui` | history-local presentational components (event row, summary card) |

Boundary rule: `feature-*` may depend on `data-access` + `ui` + `shared/*`; `ui` depends on nothing
app-specific; adapters depend only on `shared/access-http-base`. No feature imports another feature.

## 4. Hub library dependencies

- `@neuroassist/shared/access-http-base` — `${ACCESS_HTTP_BASE}` base + correlation-id/JWT interceptor
  (tenant server-derived from the JWT claim).
- `@neuroassist/shared/access-decision` — `AccessDecisionService.can('hist.*')` for all guards.
- `@neuroassist/shared/error-model` — `ProblemDetail → AppError`.
- `@neuroassist/shared/ui-feedback` — banner/toast for read errors and degraded states.
- `@neuroassist/shared/ui-tokens` — oklch design tokens; dark default.
- `@neuroassist/shared/observability` — history-read / period-switch / read-error telemetry.
- **Cross-module (write delegation):** the feedback affordance, if surfaced on a history row, calls
  **EVNT**'s `evnt.feedback.record` through EVNT's public port — HIST does **not** reimplement the
  write and does **not** import PAT (command label/urgency arrive projected in the event read-model).

## 5. Routing strategy

- Shell → `@neuroassist/hist` via `loadChildren`; `/history` via `loadComponent`.
- Guards: `canActivate: [authGuard, canReadHistoryGuard]` on the history surface; the escalation/audit
  trail sub-view is additionally gated by `canReadAuditGuard` (`hist.audit.read`, *pending BE*).
- No write routes — HIST has no create/edit/delete routes by design (ADR-005).

## 6. State strategy

- **Signals-only, read-only.** `HistoryFacade` holds `private signal<HistoryEntry[]>` of the loaded
  window + `.asReadonly()`; a `period` signal; `computed` derives the filtered list and the
  `PeriodSummaryVM`. **No NgRx, no manual `BehaviorSubject`** as source of truth.
- Loading a wider period calls the port and replaces/extends the window signal; narrowing re-filters
  in memory (doc 05 §3). The facade exposes **no mutator** of the record — only load/refresh.
- After an EVNT-delegated feedback write, HIST calls `refresh()` to re-read its own read-model; it never
  patches an entry locally to reflect a write it did not own.

## 7. Tool contract strategy (`hist.contract.ts`)

| Field | Value |
|---|---|
| `toolKey` | `hist` |
| `permissions` | `hist.history.read`, `hist.audit.read` *(both pending BE confirmation)* |
| `routes` | `/history` (+ escalation/detection-lapse trail sub-view) |
| `featureFlags` | `hist.escalation-trail` (toggle the SAFETY-GEST-1 trail), `hist.audit-console` (future admin audit, off by default) |
| `shellSurfaces` | `/history` route; optional embeddable read-only history widget for DASH/Home (boundary open, doc 06 Q1) |

> Permission keys mirror BE authorities `hist.<resource>.<action>` with English-canonical verbs
> (D-639): reads are `.read` — never `.view`. HIST exposes **read-only** authorities only. The BE vision
> runs in parallel and is authoritative; FE and BE must publish the **same** `hist.history.read` /
> `hist.audit.read` authorities — this is flagged as a contract gap in doc 06 (G1) and resolved at M1.5.
