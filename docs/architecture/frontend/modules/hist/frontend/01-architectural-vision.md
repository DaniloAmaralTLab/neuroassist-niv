# 01 — Architectural Vision — hist (HIST) Frontend

> Module: History and Audit Trail · Shell: `neuroassist-niv-web` (caregiver / DASH shell)
> Scope: frontend vision only. No Angular code is produced at this stage.

## 1. Intent (UX-driven)

By the end of a HIST interaction, a caregiver can, without training and in plain language:

- **see what happened to their patient** — a per-period (today / week / month) list of events in
  human words: the command **label** the patient asked for ("Water", "Help"), an urgency badge, the
  time it was detected, and whether it was confirmed, by whom and when (wireframe §5.1–5.5, flow 4.4);
- **see how the system responded under stress** — the escalation attempts made to reach a caregiver
  (Web Push → SMS → voice, SAFETY-GEST-1) and the **detection lapses** when the engine stopped seeing
  the patient, in the same timeline;
- **trust the record** — the list is a faithful, **read-only** view of an **immutable** audit trail;
  the caregiver can read the past but can never rewrite it.

HIST is the module that answers "**what happened, when, and was it attended?**" — it turns the
immutable audit trail into a calm, legible, read-only caregiver history.

## 2. Problem statement (current journey vs new journey)

**Today (real system, pre-NIV):** events, confirmations and escalations are produced by several
modules (EVNT, EDGE, GEST, PAT, ACS) and audited server-side, but there is no single caregiver-facing
surface that lets a non-technical caregiver *read back* what happened in their own words, nor see the
escalation/detection-lapse story that SAFETY-GEST-1 introduced.

**New journey:** HIST presents one read-only timeline sourced from `hist-service`'s immutable trail.
Events show the family's own label and whether they were attended; escalation attempts and detection
lapses are visible so a caregiver understands *why* they were (or were not) reached. Nothing on a HIST
screen changes the record: HIST reads, EVNT writes (confirm/feedback), DASH aggregates.

## 3. Personas (jobs-to-be-done)

| Persona | Role / identity | Job-to-be-done in HIST |
|---|---|---|
| Family Caregiver | `caregiver` | Review the patient's event/alarm history by period; see confirmation status, escalation attempts and detection lapses; trust the record is immutable. |
| Clinic Coordinator | `clinic_coordinator` | The same read across the tenant's patients; consult the broader audit trail for accountability. |
| Patient | HIST subject | Subject only — the history exists *about* them; the patient never operates a HIST screen. |

## 4. MVP scope (in)

- **Caregiver event history** (`/history`, prototype parity) — period tabs (today/week/month), event
  cards (command label + urgency badge + detection time + confirmation status + feedback outcome), a
  period summary (events in period, confirmed, feedback counts). Required states: list, empty, loading,
  error. **Read-only** — the feedback affordance, if kept on this surface, delegates to EVNT (§6, ADR-005).
- **Escalation & detection-lapse trail** (SAFETY-GEST-1) — read-only entries for escalation attempts
  (channel + masked target + outcome) and detection-lapse episodes (started / resolved / acknowledged),
  interleaved in the timeline. No prototype parity (new surface).

## 5. Out of scope (MVP)

- **Any mutation of the record** — HIST never writes. Confirm / feedback are **EVNT**
  (`evnt.event.confirm`, `evnt.feedback.record`); HIST only reflects their outcome (ADR-005).
- **Live alarm / active-emergency projection** — owned by **EVNT** (its recent-events query drives the
  *live* surface; HIST serves the *immutable historical* read).
- **Cross-patient aggregation, KPIs, trend charts** — owned by **DASH**; HIST exposes the per-patient
  timeline that DASH may embed (boundary open, doc 06 Q1).
- **Admin/full audit console** (caregiver lifecycle, device enrolment, engine versions) — the
  non-event audit facts are a secondary/admin surface, deferred past the caregiver MVP (doc 06 G2).
- **i18n / locale switch** — English-only (ADR-018).

## 6. Architectural principles

- **Read-only by construction.** HIST owns **no write path and no live projection**; it is a reader of
  an immutable trail. This is the module's defining invariant (ADR-005).
- **Standalone-first** in every feature and component; **NgModule only** in the lazy entry
  (`libs/hist/.../hist.module.ts`) — shared ADR-006 (module-entry-as-library).
- **Signals-first** state: the facade exposes `signal<T>` private + `.asReadonly()`, `computed` for the
  period filter and summary; **no NgRx, no manual `BehaviorSubject`** as source of truth.
- **Lazy-by-default**: the Shell loads `@neuroassist/hist` via `loadChildren`; sub-routes via
  `loadComponent`.
- **OnPush mandatory** on all components.
- **Ports & adapters at the data edge**: features talk to a facade; the facade talks to a `HIST_*_PORT`
  token; **`provideHist({ adapter })` defaults to `http`** — never `mock` (carry-forward
  `scaffold:mock-adapter-default`); a wire-shaped `MockAdapter` exists for dev/test only.
- **Access decisions never inline**: every permission check goes through
  `@neuroassist/shared/access-decision` (`AccessDecisionService.can('hist.history.read' | …)`), never a
  role `if` and never a guard that returns a hardcoded `true` (carry-forward `guard:stub-permissive`).
- **HTTP only through the Access Layer**: `@neuroassist/shared/access-http-base`, base
  `${ACCESS_HTTP_BASE}/hist` (correlation id + JWT; **tenant server-derived from the JWT claim** — never
  a path/query param). Base is **never** `/api/v1`.
- **The FE never unmasks PII.** Escalation targets arrive already masked (LGPD, BE); HIST renders them
  as received and never reconstructs a phone/email.
- **Design tokens only**: Tailwind v4 utilities bound to oklch tokens from
  `@neuroassist/shared/ui-tokens`; no hardcoded colours; dark is the default theme.
- **English-only** copy (ADR-018); no locale layer in v1.

## 7. Success signals

| Signal | Target |
|---|---|
| Record fidelity | 100% of events rendered match the immutable trail (label, time, confirmation, feedback); zero FE-side mutation of the record |
| Read-only correctness | zero write endpoints bound in `@neuroassist/hist`; the only write affordance (feedback) delegates to EVNT (lint + review) |
| Access-decision correctness | zero inline role checks, zero permissive guard stubs (lint + guard spec) |
| Time-to-interactive, HIST lazy chunk cold | TTI < 2.5 s on the pilot machine |
| Period filter responsiveness | period switch (today/week/month) re-renders from in-memory signal with no refetch unless the window needs more data (doc 05 §3) |
| CLS on the history list | < 0.1 (reserved list/skeleton, no shift when items load) |
| Escalation/lapse legibility | escalation attempts and detection lapses are shown with masked targets and plain-language outcomes; zero unmasked PII |
