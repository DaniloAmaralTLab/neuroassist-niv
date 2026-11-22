# ADR-005 — Alarm/notification projection ownership and live delivery (EVNT)

> Module-local record in the EVNT namespace. It does **not** occupy the shared ADR-005 slot
> (the project's shared folder reserves 005 for "design tokens" — see `../README.md` and the
> shared `../../../../adr/README.md`). Keep the two separate when cross-referencing.

| Section | Content |
|---|---|
| **Status** | proposed · 2026-11-20 |
| **Scope** | `@neuroassist/evnt` — the alarm surface (`/alarm`), the discreet routine notice, and the Home/topbar notice surfaces; the event read-model seam with HIST and DASH. |

> **Amendment (2026-11-20, SAFETY-1 closure — BE ADR-005 / SPEC-11).** The in-app **projection delivery**
> below is **unchanged**: the dashboard still owns a read-only live projection by **polling** (no
> WebSocket/SSE for the projection — that rejection stands). What changed is additive and separate: an
> **out-of-band escalation channel** (Web Push Tier 0 → SMS → voice, BE-driven) now runs **alongside**
> polling to reach a backgrounded/offline caregiver, closing SAFETY-1. The FE's half (Web Push
> enrollment + the honest channel-status + the masked escalation trail) is specified in SPEC-04 §5.6/§5.7,
> SPEC-03 §4a/§4b, SPEC-02 §2a and SPEC-06 §5 — it does **not** change projection ownership or the
> "alarm is read, never derived" invariant.

## Context

The `Event` collection is read by three modules for three different jobs: EVNT (alarm/notice),
HIST (immutable listing + audit) and DASH (cross-patient aggregation). In the BA prototype all three
read one in-memory `EventsFacade`, which, promoted naïvely, would make every module hold a growing copy
of the full event list and would blur who owns the acknowledge write. Separately, the emergency path is
the product's parent flow (flow 4.2) and must be *fast and unmissable*, but **messaging is disabled**
(`messaging.enabled = false`) — there is no broker to push a new event to the browser. We must decide
(a) **what state EVNT owns** of the shared event model and (b) **how the FE learns of a new emergency
in near-real-time** without a broker.

## Decision

1. **EVNT owns a *live projection*, not a store.** `AlarmFacade` holds only the slice the alarm and
   notice surfaces need right now — the most recent **unconfirmed** `emergency` event and the recent
   `routine` notices — sourced from `evnt-service`. It never accumulates the full event history and
   never aggregates across patients.
   - **HIST** owns the immutable listing + audit trail (its own facade/service). EVNT *emits* the
     acknowledgement; `evnt-service` audits it to HIST **server-side**. EVNT never renders the log.
   - **DASH** owns cross-patient aggregation / KPIs from its own read-model. EVNT never computes totals.
2. **EVNT owns the write path** — `acknowledge` (`evnt.event.confirm`) and `markFalsePositive`
   (`evnt.event.feedback`) over the event read-model. Confirm-then-clear is the default (await the
   write); optimistic clear is allowed only with a rollback that re-raises the alarm on failure.
3. **Live delivery is sync-REST polling** while the dashboard is foregrounded, with a short interval
   (emergency budget: one read cycle) and **pause-when-hidden**. The FE renders what the projection
   reports and never infers an emergency from a client-side timer.
4. **Urgency routing is read-only.** The FE routes presentation on the BE `Command.urgency`; an unknown
   urgency degrades to a routine notice; an emergency is never rendered without a BE `emergency`
   classification.

## Alternatives considered

- **One shared `EventsFacade` promoted as-is across EVNT/HIST/DASH** — rejected: duplicated growing
  state, ambiguous write ownership, and history/aggregation leaking into the alarm module.
- **WebSocket / SSE push for live events** — rejected for v1: messaging is disabled and no push
  transport is provisioned; polling meets the pilot's low event volume (doc 06 A6). Kept as a future
  upgrade once a transport exists (doc 02 §1).
- **Client-side liveness/urgency inference** (derive "emergency" from timers or device state) —
  rejected: unsafe; urgency and event existence are BE truths (EDGE offline is amber, never an alarm).
- **FE writes the audit record to HIST directly** — rejected: the FE never calls HIST; `evnt-service`
  owns the audited write (single source, server-trusted caregiver id).

## Consequences

- **Positive:** clear ownership (live projection vs history vs aggregation); no duplicated event store;
  the acknowledge write has one owner and is always audited; works with messaging disabled.
- **Negative / mitigations:** polling adds latency on the emergency path (R1) — mitigated by a short
  foreground interval + pause-when-hidden and by measuring event-raised→shown; a backgrounded tab can
  miss the takeover (R6/G3) — flagged as a safety assumption pending an escalation channel.

## References

- `_brief.md` §7 (anchor event "Help requested"); docs 01 §4–5, 02 §1/§3, 03 §5, 05 §1–4, 06 R1/R6/G3.
- Shared ADR-006 (module-entry-as-library); project shared-ADR scheme `../../../../adr/README.md`.
- Prototype parity: `screens/alarm/alarm.component.ts` (`eventPending`, `confirmedInThisSessionId`).
- Learning: `scaffold:mock-adapter-default` (http default), `guard:stub-permissive` (non-permissive
  guards), D-639 (canonical `evnt.<resource>.<action>` with `.read`).
