# 02 — Architecture Blueprint — hist (HIST) Frontend

> Scope: frontend boundaries and flows. No Angular code is produced at this stage.

## 1. System boundary

The HIST frontend is a **read-only client of `hist-service`** through the shared Access Layer
(`@neuroassist/shared/access-http-base`, base `${ACCESS_HTTP_BASE}/hist`). It makes **no direct calls**
to any legacy system and never talks to the edge agent, EVNT, EDGE or DASH services directly. Its only
job is to **render the immutable history / audit trail**; it issues **no writes**. Because **messaging
is disabled** (project-context `messaging.enabled = false`), HIST reads over **sync REST** — a plain
pull on navigation (doc 05 §2), not a broker push and not a live poll (the live surface is EVNT's).

> **Read endpoints are pending BE.** `hist-service`'s M0 contract so far names only the write sink
> `POST {hist.baseUrl}/audit` (producers → HIST). The caregiver-facing **read** endpoints this FE needs
> are **not yet defined**; they are marked *pending BE confirmation* throughout and aligned at M1.5.

## 2. External actors and systems

| Actor / system | Relationship to HIST FE |
|---|---|
| Browser (authenticated caregiver, JWT) | Operates the history surfaces (read-only). |
| `hist-service` (via `${ACCESS_HTTP_BASE}/hist`) | Immutable history + audit-trail read-model. **Read endpoints pending BE confirmation.** |
| `acs-service` (ACS) | Issues the JWT carrying `hist.*` authorities and the tenant claim. |
| `evnt-service` (EVNT) | Owns the **write** path the history reflects (confirm / feedback) and the **live** recent-events surface; the FE's feedback affordance (if surfaced in the history list) calls EVNT, not HIST (ADR-005). |
| `dash-service` (DASH) | Sibling aggregation surface; a likely **host** that embeds HIST widgets. HIST does not call DASH; the embedding direction is an open question (doc 06 Q1). |
| ACS / PAT / EDGE / GEST / EVNT (producers) | Upstream **audit producers** (they `POST /audit` server-side); **not** FE actors. HIST FE never sees the producer path, only the resulting read-model. |

## 3. End-to-end user flows

### Golden path — review the week's history (flow 4.4)

```
caregiver opens History (/history)  [guard hist.history.read]
   -> HIST reads the immutable timeline for the patient (period = week)
+----------------------------------------------------------+
|  History                        [ Today ][ Week ][ Month ]|
|  Events recorded by <patient>'s device                    |
|                                                           |
|  "Water"  [routine]  — 11/18 at 14:32                     |
|     You confirmed at 14:33                                |
|  "Help"   [emergency] — 11/18 at 08:05                    |
|     Not yet confirmed                                     |
|  --- escalation attempt (SAFETY-GEST-1) -----------------|
|  Voice call to •••••12 — no answer — 08:06               |
|  --- detection lapse ------------------------------------|
|  Engine stopped seeing patient 09:10 → resolved 09:12     |
|                                       [ period summary ]  |
+----------------------------------------------------------+
   -> caregiver switches period (today/week/month) -> list re-derives (no record change)
```

### Alternative — empty / short history

```
caregiver opens History, period = today, no entries
   -> calm empty state: "No events in this period." (no error, no fabricated rows)
```

### Edge cases

- **Read failure** — a degraded banner via `@neuroassist/shared/ui-feedback`; HIST never fabricates
  history and never shows a stale list as if fresh (marks it stale).
- **Partial trail** (events present, escalation/lapse feed unavailable) — render what loaded, flag the
  missing section; never imply "no escalations" when the feed failed to load.
- **Feedback affordance on a history row** — delegates to **EVNT** (`evnt.feedback.record`); on success
  HIST re-reads its own read-model to reflect the new outcome. HIST itself writes nothing (ADR-005).
- **Masked escalation target** — rendered exactly as the BE masked it; the FE never unmasks (LGPD).
- **Immutability** — there is no edit/delete affordance anywhere in HIST; the record is append-only and
  server-owned.

## 4. Internal boundaries (library structure, mirrors EVNT/EDGE/ACS/PAT)

```
libs/hist/                                 # @neuroassist/hist
+-- src/index.ts                           # public API (routes, provideHist, facade, VMs, port token)
+-- src/lib/
    +-- hist.module.ts                     # lazy NgModule entry (shared ADR-006)
    +-- hist.routes.ts                     # HIST_ROUTES[] (/history, ...)
    +-- hist.providers.ts                  # provideHist({ adapter }) — default 'http'
    +-- access/
    |   +-- can-read-history.guard.ts      # AccessDecisionService.can('hist.history.read')
    |   +-- can-read-audit.guard.ts        # AccessDecisionService.can('hist.audit.read')  [pending BE authority]
    +-- api/
    |   +-- history.port.ts                # HISTORY_PORT token + *Wire types (mirror hist-service read-model)
    |   +-- history-http.adapter.ts        # base ${ACCESS_HTTP_BASE}/hist (DEFAULT)  [endpoints pending BE]
    |   +-- history-mock.adapter.ts        # wire-shaped fixtures (dev/test only)
    +-- history.facade.ts                  # signals: entries, period, summary, loading, error (READ-ONLY)
    +-- feature-history/
    |   +-- history-page.component.ts       # period tabs + event list + summary (route /history)
    +-- feature-trail/ (optional)
    |   +-- escalation-trail.component.ts    # escalation attempts + detection lapses (SAFETY-GEST-1)
    +-- ui/ (optional)                      # history-local presentational bits (event row, summary card)
    +-- styles/ (optional)                  # Tailwind utilities bound to ui-tokens
```

> HIST exposes **one read-only facade** (`HistoryFacade`) over the immutable trail. It does **not**
> expose an acknowledge/feedback facade (that is EVNT) nor an aggregation facade (that is DASH). The
> Shell/DASH may inject a small read slice to embed a history widget (boundary open, doc 06 Q1).

## 5. Cross-cutting concerns

- **Auth / entitlement** — route guards `canReadHistoryGuard` / `canReadAuditGuard` call
  `AccessDecisionService.can('hist.history.read' | 'hist.audit.read')`; **never** a hardcoded `true`.
  (`hist.*` authorities are **pending BE confirmation** — FE and BE must publish the same keys, M1.5.)
- **Observability** — history-read, period-switch and read-error are reported through
  `@neuroassist/shared/observability` with the Access-Layer correlation id.
- **Error model** — `hist-service` `ProblemDetail` → `AppError` via `@neuroassist/shared/error-model`
  → caregiver message via `@neuroassist/shared/ui-feedback`.
- **Design tokens** — all colour/spacing from `@neuroassist/shared/ui-tokens` (oklch); no hardcoded
  colours; dark is default.
- **Privacy (LGPD)** — HIST renders already-masked escalation targets; it never unmasks and never logs
  raw PII to observability.
- **i18n** — none; English-only (ADR-018).
