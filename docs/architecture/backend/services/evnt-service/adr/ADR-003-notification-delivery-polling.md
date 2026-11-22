<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Notification delivery via caregiver polling (no push, messaging disabled)

## Status
aceita

## Contexto
EVNT must deliver the event to the caregiver with the urgency the family assigned to the command:
an `emergency` takes over the whole screen and demands confirmation; a `routine` shows a discreet,
non-blocking toast (BA wireframe §Screen 02 / §3.2.E). The natural implementation of "real-time
alarm" is a server push (WebSocket / SSE) or a broker fan-out. But `stack.messaging.enabled = false`
for this project — there is no broker, no outbox — and the shared direction (ADR-006) names async/
push only as a future signal. EVNT must choose how the recognized event reaches the dashboard
without a push transport.

## Decisão
We deliver notifications **pull-based**: EVNT exposes a read surface and the caregiver dashboard
(`evnt-ui` / DASH) **polls** it. EVNT pushes nothing and opens no socket.

- `GET /evnt/patients/{patientId}/active-alarm` returns the single active emergency event (the
  read-time query of ADR-010) or empty; the dashboard polls it on a short interval and renders the
  full-screen alarm when present.
- `GET /evnt/patients/{patientId}/events` returns recent events; a new `routine` event surfaces as a
  discreet toast, an `emergency` as the alarm.
- **Urgency drives the client's rendering mode**, not a separate EVNT channel: the event carries
  `urgency`, and full-screen-vs-toast is a client decision over one uniform surface.

## Consequências
- Positive: zero messaging infrastructure; consistent with the whole project's sync-REST posture and
  the hub convention; no new failure modes from a broker.
- Positive: one surface, one source of truth (ADR-010) — Alarm, Home and History all read the same
  events; a confirmation is seen everywhere on the next poll.
- Negative / trade-off (Risk R1): **alarm latency is bounded by the poll interval** — an emergency is
  only seen on the next poll, not instantly. For a life-safety alarm this is the main accepted cost;
  mitigated by a short interval and documented as the budget. A real-time push transport (SSE /
  WebSocket) or a broker is the explicit future upgrade path (ADR-006 shared) and would not change
  the event model, only the delivery.
- Reversible: adding push later is additive (the same `Event` surface gains a push channel); no data
  migration.
