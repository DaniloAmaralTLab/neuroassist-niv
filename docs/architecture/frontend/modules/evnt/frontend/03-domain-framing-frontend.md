# 03 — Domain Framing (Frontend) — evnt (EVNT)

> Mirrors the BE ubiquitous language; it does **not** redefine it. See `_brief.md` and the BE
> framing / data-model (entities `Event`, `Command`). No Angular code at this stage.

## 1. Ubiquitous language (mirror of BE)

| Term | Meaning (as used by EVNT FE) |
|---|---|
| Event | A structured occurrence raised when a configured command is recognized (`Event`: `id`, `patientId`, `command`, `timestamp`, `confirmedAt`, `confirmedBy`, `feedback`). |
| Command | The catalog item the event matches; carries `urgency` (`emergency` \| `routine`) and `label`. Owned by **PAT**; EVNT reads it to route presentation. |
| Urgency | `emergency` → full-screen alarm; `routine` → discreet notice. A BE property; the FE never re-classifies it. |
| Active emergency | The most recent `emergency` event **without** `confirmedAt`. The alarm surface exists only while one exists. |
| Acknowledgement | The caregiver's explicit "I attended" — sets `confirmedAt`, `confirmedBy`, `feedback='real'`. Closes the parent flow; audited to HIST. |
| Feedback | `not_evaluated` \| `real` \| `false_positive` — the caregiver's judgement of the event; `false_positive` is a distinct write from acknowledgement. |
| Routine notice | A non-blocking surface for a `routine` event; noticed, not alarming. |

> EVNT does **not** own `Command` authoring (PAT), the immutable event log (HIST) or cross-patient
> rollups (DASH). It owns the **live alarm/notification projection** and the **acknowledge / feedback
> writes** over the event read-model.

## 2. View models (draft)

```
AlarmVM {
  patientName: string           # resolved display name
  commandLabel: string          # from Command.label
  detectedAt: string            # Event.timestamp (display: "14:32")
  state: 'active' | 'acknowledged' | 'none' | 'loading' | 'error'
}

RoutineNoticeVM {
  eventId: string
  commandLabel: string
  requestedAt: string           # Event.timestamp
  seen: boolean                 # local dismissal state
}

AcknowledgedVM {               # transient session feedback after Confirm
  patientName: string
  confirmedAt: string
  confirmedByName: string
}
```

## 3. UI events (user-driven)

| UI event | Trigger | Effect |
|---|---|---|
| `AcknowledgeEmergency` | Click "Confirm I attended to …" | guarded write → `confirmedAt/confirmedBy/feedback='real'`; projection clears the active emergency. |
| `DismissRoutineNotice` | Dismiss a routine toast/card | local `seen=true`; optional acknowledge write (`feedback='real'`). |
| `MarkFalsePositive` | Mark a notice/event not real | `evnt.event.feedback` write → `feedback='false_positive'`. |
| `OpenAlarmSurface` | Navigate to `/alarm` | guarded read; renders active / acknowledged / none. |

## 4. State transitions (UI level)

```
Alarm surface:
  loading -> none            (no active emergency)
  loading -> active          (an unconfirmed emergency exists)
  active  -> acknowledging   (Confirm clicked, write in flight)
  acknowledging -> acknowledged (write ok; session feedback)  | error (write failed)
  acknowledged -> none       (next read cycle; return to normal)

Routine notice:
  hidden -> shown            (a routine event appears in the projection)
  shown  -> dismissed        (local seen)  | false_positive (feedback write)
```

## 5. Invariants (client-side)

- **The FE never decides urgency.** Routing (`emergency` vs `routine`) reads `Command.urgency`
  from the BE; an event with unknown urgency is treated conservatively as a **routine notice**, never
  silently dropped and never promoted to a full-screen alarm without a BE `emergency` classification.
- **Active emergency = unconfirmed.** The derivation counts only `emergency` events with
  `confirmedAt == null`; a resolved alarm never reappears.
- **Acknowledgement is irreversible forward.** Once `confirmedAt` is set the alarm returns to normal;
  the FE never clears `confirmedAt` to "re-raise" an alarm.
- **Acknowledgement requires a known caregiver.** The write carries the caregiver id from the session;
  it is never sent anonymously.
- **Offline ≠ alarm.** No event ⇒ no alarm. The FE never synthesizes an emergency from device/network
  state (that is EDGE's amber badge).
- **Feedback is explicit.** `false_positive` is only ever set by a deliberate caregiver action, never
  inferred.
