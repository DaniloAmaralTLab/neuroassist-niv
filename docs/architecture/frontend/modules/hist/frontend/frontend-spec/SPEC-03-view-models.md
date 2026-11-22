# SPEC-03 — View Models — hist (HIST) Frontend

> View-models are `signal`-derived read-only records exposed by `HistoryFacade`. The facade holds a
> **read-only window** over `hist-service`'s immutable trail (ADR-005, doc 05 §1): `signal<T>` private +
> `.asReadonly()`, `computed` for the period filter and summary. **No mutator of the record** — only
> `load` / `loadMore` / `setPeriod` / `refresh`. The code blocks below are **illustration**, not EARS
> contracts (ears-notation standard). Sources: `frontend/03-domain-framing-frontend.md` §2, BE
> api-contract §2 response shape, the promoted prototype `screens/history/history.component.ts`.

## 1. Wire → VM (the BE entry shape is authoritative — BE api-contract §2)

The caregiver timeline `GET /hist/patients/{patientId}/history` returns a flat, newest-first `entries[]`
of **atomic audit facts** plus a `window` and a `nextCursor`. Each entry is the canonical shape below;
the FE maps `kind` (the BE fact name) to a presentational `HistoryEntryKind` and **never fabricates** a
field the contract does not carry (see gaps G-HIST-1..5 in `../contracts/backend-api-cross-link.md`).

```ts
// mirror of GET /hist/patients/{patientId}/history (BE api-contract §2) — 1:1, read verbatim
interface HistoryPageWire {
  patientId: string;
  window: { from: string; to: string };            // ISO instants; the resolved period window
  entries: HistoryEntryWire[];                       // newest-first (occurredAt desc, id desc)
  nextCursor: string | null;                         // keyset cursor; null → last page
}
interface HistoryEntryWire {
  id: string;
  kind: string;                                      // BE fact name: EventGenerated | AlarmConfirmed | FeedbackRecorded | EscalationAttempted | DetectionLapseStarted | DetectionLapseResolved | DetectionLapseAcknowledged
  source: string;                                    // producer service id (evnt-service | edge-service | …) — used to disambiguate DetectionLapseResolved (BE api-contract §2, doc 06 R4)
  subjectType: string;                               // 'event' | 'detection-lapse' | 'edge-device' | … — stored verbatim
  subjectId: string;                                 // stable subject id (event entries → the eventId) — BE §2
  relatedEventId?: string;                           // = subjectId for event-subject entries; the JOIN KEY to fold onto the originating event (G-HIST-2 CLOSED)
  occurredAt: string;                                // producer-side instant
  title: string;                                     // BE-composed human title ("Alarm confirmed")
  detail: string;                                    // BE-composed human detail ("Emergency alarm confirmed by caregiver")
  commandId?: string;                                // event-kind entries — opaque PAT command ref (G-HIST-1 CLOSED)
  commandLabel?: string;                             // event-kind entries — the family's word ("Water"); absent when EVNT payload omits it (upstream amendment) → FE falls back to title/detail (G-HIST-1)
  urgency?: 'emergency' | 'routine';                 // present on event-kind entries
  confirmation?: { confirmedAt: string; confirmedBy: string };  // server-side fold onto the EventGenerated entry (G-HIST-2 CLOSED)
  channel?: 'web_push' | 'sms' | 'voice';            // EscalationAttempted — structured channel (G-HIST-3 CLOSED)
  maskedTarget?: string;                             // EscalationAttempted — ALREADY masked BE-side; render verbatim, NEVER unmask (G-HIST-3)
  outcome?: 'real' | 'false_positive' | 'not_evaluated' | 'sent' | 'failed' | 'started' | 'resolved' | 'acknowledged';  // enumerated per kind (G-HIST-5 CLOSED — BE §2)
}
```

## 2. `HistoryEntryVM` — one timeline row

```ts
type HistoryEntryKind = 'event' | 'escalation' | 'detection-lapse';   // doc 03 §2 (SAFETY-GEST-1 surfaces: 'escalation' | 'detection-lapse')

interface HistoryEntryVM {
  id: string;
  kind: HistoryEntryKind;             // mapped from HistoryEntryWire.kind + (source, subjectType)
  occurredAt: string;                 // display "11/18 at 14:32" (prototype dateTime)
  title: string;                      // from wire.title (BE-composed) — see G-HIST-1
  detail: string;                     // from wire.detail
  // event rows:
  commandLabel?: string;              // the family's word in quotes ("Water") — from wire.commandLabel (G-HIST-1 CLOSED); absent when the BE omits it → FE shows title/detail
  urgency?: 'emergency' | 'routine';
  relatedEventId?: string;            // wire.relatedEventId — the join key (G-HIST-2 CLOSED)
  confirmation?: 'confirmed' | 'not-yet-confirmed';   // from the server-side folded wire.confirmation on the EventGenerated entry (G-HIST-2 CLOSED): present → 'confirmed', absent → 'not-yet-confirmed'
  confirmedAt?: string;               // from wire.confirmation.confirmedAt — the prototype's "You confirmed at 14:33" (G-HIST-2)
  feedbackOutcome?: 'real' | 'false_positive' | 'not_evaluated';  // from the FeedbackRecorded fact / wire.outcome (G-HIST-5 CLOSED)
  canRecordFeedback: boolean;         // AccessDecisionService.can(EVNT 'evnt.event.record') AND feedback not yet recorded — drives the delegated affordance (SPEC-05 §4)
  // escalation rows (kind='escalation'):
  channel?: 'web_push' | 'sms' | 'voice';  // from wire.channel (G-HIST-3 CLOSED)
  maskedTarget?: string;              // from wire.maskedTarget — ALREADY masked BE-side; rendered verbatim, NEVER unmasked (doc 01 §6)
  // detection-lapse rows (kind='detection-lapse'):
  lapseState?: 'started' | 'resolved' | 'acknowledged';   // derived from wire.kind + source
  isSafetySurface: boolean;           // true for 'escalation' | 'detection-lapse' → neutral/info styling, NEVER emergency styling (SPEC-02 §2)
}
```

`kind` mapping: `EventGenerated` → `event`; `AlarmConfirmed`/`FeedbackRecorded` → folded onto the event
row via `relatedEventId` (the join key now exists, G-HIST-2 CLOSED — `AlarmConfirmed` also arrives
pre-folded as `wire.confirmation` on the event entry); `EscalationAttempted` → `escalation`;
`DetectionLapse*` → `detection-lapse` (disambiguated by `source`+`subjectType`, BE §2).

## 3. `PeriodSummaryVM` and the view state

```ts
type PeriodFilter = 'today' | 'week' | 'month';            // 'month' replaces prototype 'mes'
type HistoryViewState = 'loading' | 'list' | 'empty' | 'error';

interface PeriodSummaryVM {
  period: PeriodFilter;
  scope: 'period' | 'loaded';          // 'period' when the BE first-page summary is present (G-HIST-4 CLOSED — whole-period totals); 'loaded' only as the degraded fallback when the FE must summarise a paginated-but-summaryless window
  eventsInPeriod: number;
  confirmed: number;
  markedReal: number;
  falsePositives: number;
  notReviewed: number;
}
```

The BE returns a `summary` object **on the first page only** (cursor absent), `scope="period"`, computed
over the **whole** requested window (BE api-contract §2 "`summary` object", G-HIST-4 CLOSED). The facade
binds `PeriodSummaryVM` **from `wire.summary` when present** (scope `'period'`), and only falls back to
deriving `scope='loaded'` from the in-memory window when it holds a paginated window with no summary
(e.g. after `loadMore` on a surface that dropped the first page). Wire shape:

```ts
interface PeriodSummaryWire {       // BE api-contract §2 — first page only
  scope: 'period';
  window: { from: string; to: string };
  counts: Record<string, number>;   // per BE kind
  events: { total: number; confirmed: number; unconfirmed: number;
            markedReal: number; falsePositives: number; notReviewed: number };
}

interface HistoryPageVM {
  state: HistoryViewState;
  entries: HistoryEntryVM[];           // already filtered by the current period (in-memory, doc 05 §3)
  window: { from: string; to: string } | null;
  hasMore: boolean;                    // nextCursor != null
  stale: boolean;                      // true when the last read failed and we hold the previous window
  trailDegraded: boolean;              // true when the escalation/lapse section failed while the timeline loaded (SPEC-07 §2.1)
}
```

## 4. UI events (user-driven)

| UI event | Trigger | Effect |
|---|---|---|
| `SelectPeriod` | Click today / week / month | sets the `period` signal; list + summary re-derive; refetch **only** if the window needs more data (doc 05 §3). |
| `LoadMore` | Reach the list end with `hasMore` | reads the next page via `nextCursor`; appends to the window. |
| `OpenHistory` | Navigate to `/history` | guarded read (`hist.history.read`); `loading → list / empty / error`. |
| `OpenEscalationTrail` | Expand the trail section (flag `hist.escalation-trail`) | renders escalation + detection-lapse rows from the **same** read (no extra authority). |
| `Refresh` | Click refresh | re-reads the current window (HIST does not poll, doc 05 §2). |
| `MarkFeedback` *(delegated)* | Click "Was it real?" on an event row | **EVNT** write `evnt.event.record` via the shell-wired EVNT port (SPEC-05 §4); on success `HistoryFacade.refresh()`. HIST writes nothing (ADR-005). |

## Acceptance criteria (EARS)

- WHILE the history read is in flight, THE SYSTEM SHALL render the loading skeleton with reserved rows and SHALL NOT render an empty-history message.
- WHEN the history read returns no entries for the period, THE SYSTEM SHALL render the empty state and SHALL NOT fabricate a history entry.
- IF the history read fails, THEN THE SYSTEM SHALL render the error state with a degraded banner, hold the last known window marked stale, and SHALL NOT render a false no-history state.
- THE SYSTEM SHALL render every escalation and detection-lapse entry visually distinct as an informational safety surface and SHALL NOT style a detection-lapse or escalation entry as an active emergency.
- THE SYSTEM SHALL render each escalation masked target exactly as the backend masked it and SHALL NOT unmask or reconstruct a phone or email.
- WHEN the backend returns a first-page period summary, THE SYSTEM SHALL bind the period summary from that whole-period summary and SHALL label the summary scope as period.
- WHERE no backend period summary is present, THE SYSTEM SHALL derive the period summary from the loaded history window and SHALL label the summary scope as loaded-entries when the period is paginated beyond the loaded window.
- THE SYSTEM SHALL render the structured command label and urgency on an event entry when the backend projects them and SHALL fall back to the title and detail when the command label is absent.
- THE SYSTEM SHALL fold the confirmation onto its originating event using the backend related event join key and SHALL render the escalation channel and masked target verbatim without unmasking.
- WHEN the caregiver switches the period within the already-loaded window, THE SYSTEM SHALL re-derive the timeline and the summary from the in-memory window and SHALL NOT change the immutable record.
