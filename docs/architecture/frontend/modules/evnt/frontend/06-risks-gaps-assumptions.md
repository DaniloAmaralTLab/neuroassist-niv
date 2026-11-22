# 06 — Risks, Gaps and Assumptions — evnt (EVNT)

> Scope: what could go wrong and what must be validated. No Angular code at this stage.

## 1. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Polling latency** on the emergency path (messaging disabled) — a long interval delays the full-screen alarm. | High (mother flow) | Short foreground interval + pause-when-hidden (ADR-005); measure event-raised→shown; SSE/WebSocket deferred as a future upgrade (doc 02 §1). |
| R2 | **Mock-adapter-default regression** — shipping `provideEvnt()` with `mock`. | High | Default is `http` from vision; providers spec proves the default (Learning `scaffold:mock-adapter-default`, 7×). |
| R3 | **Permissive guard stub** — a guard returning hardcoded `true`. | High (security) | Guards call `AccessDecisionService.can('evnt.event.read' \| 'evnt.event.confirm')`; guard spec asserts non-permissive (Learning `guard:stub-permissive`, 6×). |
| R4 | **Permission-key drift** FE↔BE — FE uses `.view`/`.edit` or a resource name the BE did not publish. | High | Canonical `evnt.<resource>.<action>` with `.read` (D-639); reconcile with the parallel BE vision (gap G1). |
| R5 | **Urgency misroute** — an emergency rendered as a toast, or vice-versa. | High | Route strictly on BE `Command.urgency`; unknown → routine; emergency never without a BE `emergency` classification (doc 03 §5). |
| R6 | **Browser tab backgrounded** during an emergency — the takeover is not seen. | Medium | v1 is in-app only; OS/push escalation deferred (gap G3) and flagged as a safety assumption (A4). |
| R7 | **Ownership bleed** — EVNT starts accumulating full history or cross-patient totals. | Medium | ADR-005 fixes the projection-as-live-slice boundary; history→HIST, aggregation→DASH. |
| R8 | **CLS on the Home notice slot** when a notice appears. | Low | Reserved notice slot; token spacing; CLS budget < 0.1. |

## 2. Known gaps

- **G1 — BE authority list not yet published.** `evnt-service` vision runs in parallel; FE assumes
  `evnt.event.read` / `evnt.event.confirm` / `evnt.event.feedback`. Reconcile the exact strings and the
  acknowledge endpoint shape when the BE api-contract lands.
- **G2 — Acknowledge endpoint contract.** Path/body assumed
  (`POST /evnt/events/{id}/acknowledgement`); confirm against the BE contract (idempotency, whether the
  caregiver id is server-derived or body-supplied — FE assumes server-derived from JWT).
- **G3 — Emergency escalation channel.** OS/push, SMS or voice fallback when the dashboard tab is not
  foregrounded is out of scope for v1; needed before relying on EVNT as the *sole* emergency channel.
- **G4 — Multiple concurrent emergencies.** UX for a queue of unconfirmed emergencies is sketched
  (most-recent-first) but not fully specified; confirm with design.
- **G5 — Routine-notice persistence.** Whether a dismissed routine notice stays dismissed across
  devices/sessions (server `seen`) or only in-session (local) — assumed local in v1 (A3).

## 3. Assumptions to validate

- **A1** — The event read-model projects `Command.label` + `urgency` into the event payload, so EVNT
  need not import PAT's lib.
- **A2** — Acknowledgement is audited to HIST **server-side** by `evnt-service`; the FE never calls
  HIST (doc 02 §1).
- **A3** — Routine-notice dismissal is in-session/local in v1 (no server `seen`).
- **A4** — The caregiver keeps the dashboard open/foregrounded during monitoring (in-app-only
  emergency channel) — a safety assumption pending G3.
- **A5** — Device target: desktop/tablet dashboard (caregiver); the full-screen alarm is sized for the
  caregiver's screen, not the patient's phone.
- **A6** — Poll volume is low (one patient per caregiver in the pilot; a handful per clinic coordinator)
  so sync-REST polling is acceptable for v1.

## 4. Critical dependencies

- `evnt-service` — event projection endpoint + acknowledge/feedback writes + HIST audit (BE, parallel).
- `@neuroassist/shared/access-http-base`, `access-decision`, `error-model`, `ui-feedback`, `ui-tokens`,
  `observability` (all promoted).
- `Command.urgency` classification semantics owned by **PAT**, projected by `evnt-service`.
- Shared FE ADR-006 (module-entry-as-library) and the project shared-ADR scheme (`../../../../adr/`).
