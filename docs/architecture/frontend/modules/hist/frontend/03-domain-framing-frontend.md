# 03 — Domain Framing (Frontend) — hist (HIST)

> Mirrors the BE ubiquitous language; it does **not** redefine it. See `_brief.md` and the BE
> framing / data-model (entities `Event`, `Command`, plus the audit facts in §1). No Angular code at
> this stage. The BE vision is authoritative; terms marked *(pending BE)* await M1.5 alignment.

## 1. Ubiquitous language (mirror of BE)

| Term | Meaning (as used by HIST FE) |
|---|---|
| Event | A structured occurrence recorded when a configured command is recognized (`Event`: `id`, `patientId`, `command`, `timestamp`, `confirmedAt`, `confirmedBy`, `feedback`). HIST reads it from the immutable trail; it never raises or edits one. |
| Command | The catalog item the event matches; carries `urgency` (`emergency` \| `routine`) and `label`. Owned by **PAT**; HIST reads `label` + `urgency` as projected into the event read-model. |
| Confirmation | The caregiver's recorded "I attended" (`confirmedAt`, `confirmedBy`). Written by **EVNT**; HIST **displays** it. |
| Feedback | `not_evaluated` \| `real` \| `false_positive` — the caregiver's judgement of an event. Written by **EVNT** (`evnt.feedback.record`); HIST **displays** the outcome and, if it surfaces the affordance, delegates the write to EVNT (ADR-005). |
| Audit entry | An immutable, append-only record of a domain fact written server-side by a producer (ACS/PAT/EDGE/EVNT/GEST) to `hist-service`. The thing HIST exists to preserve and read back. *(shape pending BE)* |
| Escalation attempt | A SAFETY-GEST-1 out-of-band reach attempt (Web Push → SMS → voice) with a **masked** target and an outcome; audited by EVNT (`EscalationAttempted`, `subjectType event \| detection-lapse`). HIST lists it read-only. *(read shape pending BE)* |
| Detection lapse | An episode where the engine stopped seeing the patient (`DetectionLapseStarted/Resolved` from EDGE; `DetectionLapseRaised/Resolved/Acknowledged` from EVNT, SAFETY-GEST-1). HIST lists it read-only. *(read shape pending BE)* |
| Period | The caregiver's view window: `today` \| `week` \| `month` (prototype `today/week/mes`). A FE-local filter, not a BE concept. |

> HIST does **not** own `Command` authoring (PAT), the confirm/feedback **writes** (EVNT), the live
> alarm projection (EVNT) or cross-patient rollups (DASH). It owns the **read-only presentation of the
> immutable history / audit trail**.

## 2. View models (draft)

```
HistoryEntryVM {                 # one row in the caregiver timeline
  id: string
  kind: 'event' | 'escalation' | 'detection-lapse'
  commandLabel?: string          # from Command.label (event rows)  e.g. "Water"
  urgency?: 'emergency' | 'routine'
  occurredAt: string             # Event.timestamp / episode start (display: "11/18 at 14:32")
  confirmedAt?: string           # event rows: confirmation time, else "Not yet confirmed"
  confirmedByName?: string
  feedback?: 'not_evaluated' | 'real' | 'false_positive'
  # escalation rows:
  channel?: 'web-push' | 'sms' | 'voice'
  maskedTarget?: string          # already masked by BE (LGPD); never unmasked
  outcome?: 'delivered' | 'no-answer' | 'failed' | 'acknowledged'
  # detection-lapse rows:
  resolvedAt?: string
  lapseState?: 'started' | 'resolved' | 'acknowledged'
}   # field names/shape PENDING BE read-model

PeriodSummaryVM {
  period: 'today' | 'week' | 'month'
  eventsInPeriod: number
  confirmed: number
  markedReal: number
  falsePositives: number
  notReviewed: number
}

HistoryViewState = 'loading' | 'list' | 'empty' | 'error'
```

## 3. UI events (user-driven)

| UI event | Trigger | Effect |
|---|---|---|
| `SelectPeriod` | Click today / week / month | sets the local `period` signal; list + summary re-derive (refetch only if the window needs more data, doc 05 §3). |
| `OpenHistory` | Navigate to `/history` | guarded read (`hist.history.read`); renders loading → list / empty / error. |
| `OpenEscalationTrail` | Expand / navigate the escalation & detection-lapse section | guarded read (`hist.audit.read`, *pending BE*); renders the trail rows. |
| `MarkFeedback` *(delegated)* | Click "Was it real?" on an event row *(if surfaced here)* | **EVNT** write `evnt.feedback.record`; on success HIST re-reads its own read-model. HIST writes nothing (ADR-005). |

## 4. State transitions (UI level)

```
History surface:
  loading -> list            (entries returned)
  loading -> empty           (no entries in period)
  loading -> error           (read failed; degraded banner, no fabricated rows)
  list    -> loading         (period change that needs a wider window)  | list (in-memory re-filter)
  error   -> loading         (retry)

Feedback (delegated to EVNT, shown here):
  displayed outcome is whatever the read-model reports; HIST never transitions it locally,
  it re-reads after EVNT confirms the write.
```

## 5. Invariants (client-side)

- **HIST never writes.** No HIST code path mutates the record; the only write affordance is EVNT's
  feedback, invoked through EVNT's port, and HIST re-reads afterwards (ADR-005).
- **The record is immutable and append-only.** No edit/delete UI anywhere; history can only be read.
- **The FE never decides urgency or confirmation truth.** `urgency`, `confirmedAt`, `feedback` are BE
  facts; HIST displays them and never recomputes or overrides them.
- **No fabricated history.** On read failure HIST shows a degraded state, never a synthesized "no
  events" that could hide a real one, and never a stale list presented as fresh.
- **PII stays masked.** Escalation targets are rendered exactly as the BE masked them; the FE never
  unmasks and never logs raw targets.
- **Period is a view, not a truth.** Changing period never changes what the record contains, only what
  is shown.
