# ADR-005 — Read-only history/audit reader: ownership boundary and no-write stance (HIST)

> Module-local record in the HIST namespace. It does **not** occupy the shared ADR-005 slot
> (the project's shared folder reserves 005 for "design tokens" — see `../README.md` and the
> shared `../../../../adr/README.md`). Keep the two separate when cross-referencing.

| Section | Content |
|---|---|
| **Status** | proposed · 2026-11-20 |
| **Scope** | `@neuroassist/hist` — the caregiver history surface (`/history`), the escalation & detection-lapse trail (SAFETY-GEST-1), and the read seam with `hist-service` (immutable trail), EVNT (writes/live) and DASH (aggregation). |

## Context

The `Event` collection and the audit trail are read by several modules for different jobs: EVNT (live
alarm + confirm/feedback **writes**), HIST (immutable listing + audit) and DASH (cross-patient
aggregation). In the BA prototype, one in-memory `EventsFacade` serves all of them, and the history
screen (`screens/history/history.component.ts`) both **lists** events and **writes** feedback
("Was it real?" → `Event.feedback`). Promoted naïvely this would (a) give HIST a write path that
duplicates EVNT's `evnt.feedback.record` authority, and (b) make HIST hold a growing event store with
ambiguous ownership versus EVNT's live projection and DASH's rollups.

Two further forces are specific to HIST:

- **The record is an immutable audit trail.** M0 defines `hist-service` as the audit **sink**
  (`POST {hist.baseUrl}/audit`) that ACS/PAT/EDGE/EVNT/GEST write to server-side over sync REST
  (messaging disabled). HIST's job on the FE is to *read it back*, not to produce or edit it.
- **The caregiver-facing read endpoints do not exist yet.** M0 names only the write sink; the read-model
  HIST needs is **pending BE confirmation** (the BE vision is authoritative and runs in parallel).

We must decide **what state HIST owns** and **whether HIST writes anything**.

## Decision

1. **HIST is a read-only reader of the immutable trail.** `HistoryFacade` holds a **read-only** signal
   window over `hist-service` for the current patient/period and exposes `.asReadonly()` + `computed`
   derivations (filtered list, `PeriodSummaryVM`). It has **no mutator of the record** — only
   load/refresh. `@neuroassist/hist` binds **zero write endpoints**.
2. **Writes stay with their owner.** The confirm (`evnt.event.confirm`) and feedback
   (`evnt.feedback.record`) writes are **EVNT's**. If the "Was it real?" affordance is surfaced inside
   HIST's history list, it **delegates** to EVNT's public port and then calls `HistoryFacade.refresh()`;
   HIST never patches an entry locally and never calls a HIST write endpoint (there is none).
3. **Live awareness is EVNT's, aggregation is DASH's.** HIST serves the **historical** read (load on
   navigation, in-memory period re-filter, explicit refresh) and **does not poll**. The live
   active-emergency surface is EVNT; cross-patient KPIs/trends are DASH. HIST exposes a per-patient
   timeline that DASH **may embed** (host/consumer direction is an open question, doc 06 Q1 — not decided
   here).
4. **Contracts are owned by the BE and marked pending.** Every HIST read endpoint and `hist.*` authority
   is a placeholder (`${ACCESS_HTTP_BASE}/hist/...`, `hist.history.read`, `hist.audit.read`) absorbed by
   the `HISTORY_PORT` seam and aligned at M1.5. The FE invents nothing it will not reconcile with the BE.

## Alternatives considered

- **Promote the prototype history screen as-is (list + feedback write) into HIST** — rejected:
  duplicates EVNT's feedback authority, gives HIST a write path, and blurs the audit-reader boundary.
- **One shared `EventsFacade` across EVNT/HIST/DASH** — rejected (same reason EVNT ADR-005 rejected it):
  duplicated growing state and ambiguous write ownership.
- **HIST polls like EVNT for a "live" history** — rejected: HIST is a review surface, not an alarm;
  polling the full trail is wasteful and conflates HIST's historical read with EVNT's live projection.
  HIST reads on navigation with explicit refresh.
- **HIST owns the full cross-module audit console (caregiver/device/engine lifecycle) in the MVP** —
  deferred: the caregiver MVP is event-centric history + escalation/detection-lapse; the broader admin
  audit is a secondary surface (doc 06 G2/Q2).
- **Guess the read endpoints now and hard-wire them** — rejected: the BE is authoritative; endpoints are
  marked pending and isolated behind the port to avoid churn (doc 06 R1).

## Consequences

- **Positive:** a single, unambiguous owner for each concern (HIST read / EVNT write+live / DASH
  aggregation); no duplicated event store; the immutable trail cannot be mutated from the FE; works with
  messaging disabled; the port seam absorbs the pending BE contract with minimal rework.
- **Negative / mitigations:** HIST depends on EVNT for the one write it surfaces (coupling) — mitigated
  by delegating through EVNT's public port and re-reading, never reimplementing the write; `/history`
  reflects the record only as of the last read (not live) — accepted (A5), with explicit refresh and
  EVNT owning live awareness; read endpoints are unresolved (R1) — mitigated by the pending-BE markers
  and M1.5 sync.

## References

- `_brief.md` §4–8 (scope, anchor "Audit entry recorded" / "History reviewed"); docs 01 §4–6, 02 §1/§3,
  03 §1/§5, 04 §6–7, 05 §1–5, 06 R1/R2/R3/G1/G3/Q1.
- M0 handoff (state.json): `hist-service` audit sink `POST /audit`; producer facts
  (ACS/PAT/EDGE/EVNT/GEST); EVNT `AlarmConfirmed`/`FeedbackRecorded`/`EscalationAttempted`/
  `DetectionLapseRaised/Resolved/Acknowledged`; EDGE `DetectionLapseStarted/Resolved` (SAFETY-GEST-1).
- Sibling: EVNT ADR-005 (alarm-projection ownership & live delivery) — the write/live counterpart.
- Shared ADR-006 (module-entry-as-library); project shared-ADR scheme `../../../../adr/README.md`.
- Prototype parity: `screens/history/history.component.ts`, `.build-plans/history.plan.md`
  (the feedback write in the prototype re-homes to EVNT).
- Learning carry-forwards: `scaffold:mock-adapter-default` (http default), `guard:stub-permissive`
  (non-permissive guards), D-639 (canonical `hist.<resource>.<action>` with `.read`).
