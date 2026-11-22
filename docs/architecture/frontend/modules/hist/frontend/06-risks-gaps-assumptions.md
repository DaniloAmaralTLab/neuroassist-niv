# 06 — Risks, Gaps and Assumptions — hist (HIST)

> Scope: what could go wrong and what is still unknown. No Angular code at this stage.

## 1. Risks

| # | Risk | Area | Mitigation |
|---|---|---|---|
| R1 | **BE read-model undefined.** `hist-service`'s M0 contract names only the write sink `POST /audit`; the caregiver-facing **read** endpoints HIST needs do not exist yet. Building against a guessed shape risks churn. | Contract | Mark every endpoint *pending BE confirmation*; code to the `HISTORY_PORT` seam so the adapter absorbs the final shape; align at M1.5. |
| R2 | **Read-only boundary erosion.** The prototype history screen *writes* feedback; promoting it naïvely would give HIST a write path and duplicate EVNT's `evnt.feedback.record`. | Boundaries | ADR-005: HIST owns no write; feedback delegates to EVNT; HIST re-reads. Lint/review for zero write endpoints in `@neuroassist/hist`. |
| R3 | **HIST vs DASH overlap.** Both are "review history" surfaces; widgets could be built twice or in the wrong module. | Boundaries | Q1 below (open); interim rule: HIST owns the per-patient immutable timeline, DASH owns cross-patient aggregation and *embeds* HIST — confirm at M1.5. |
| R4 | **Escalation/detection-lapse trail has no prototype parity.** SAFETY-GEST-1 surfaces are new; UX is unvalidated against a wireframe. | UX | Treat as a thin read-only list behind `hist.escalation-trail` flag; validate copy with a caregiver; keep it additive to the proven history screen. |
| R5 | **PII leakage.** Escalation targets (phone/email) are sensitive (LGPD). | Privacy | BE masks targets; FE renders as-received, never unmasks, never logs raw targets to observability. |
| R6 | **List growth / performance.** A long history (months of events) could bloat the in-memory window and the DOM. | Performance | Window by period; virtualise/paginate the list if volume justifies (assumption A1); measure CLS/TTI on the pilot machine. |
| R7 | **Authority-name drift.** FE assumes `hist.history.read` / `hist.audit.read`; BE may publish different keys. | Contract | G1; publish the same `hist.<resource>.<action>` set on both sides at M1.5; guards read the agreed keys only. |

## 2. Known gaps

- **G1 — `hist.*` authorities not yet published by the BE.** FE assumes `hist.history.read` and
  `hist.audit.read`; the BE vision is authoritative and must confirm/rename. Resolve at M1.5.
- **G2 — Admin/full audit console undefined.** The non-event audit facts (caregiver lifecycle, device
  enrolment, engine versions — M0 producer facts) are out of the caregiver MVP; whether they belong to a
  HIST admin surface, to ACS/EDGE admin screens, or to DASH is undecided (relates to Q1/Q2).
- **G3 — Escalation/detection-lapse read shape.** The read-model for `EscalationAttempted` and
  `DetectionLapse*` (fields, masking, pagination) is pending BE/EVNT alignment (SAFETY-GEST-1).
- **G4 — Feedback delegation seam.** Whether the "Was it real?" affordance is surfaced inside HIST's
  history list (delegating to EVNT) or lives only on EVNT's recent-events surface is a UX decision for
  Specs; both honour "HIST writes nothing".

## 3. Assumptions to validate

- **A1 — Data volume.** Pilot history per patient is small (handful of events/day); an in-memory
  windowed list is adequate and virtualisation is deferred until measured.
- **A2 — Period semantics.** `today/week/month` windows nest (today ⊂ week ⊂ month), enabling in-memory
  re-filter without refetch for narrowing — matches the prototype's `PERIODO_DIAS`.
- **A3 — Caregiver mental model.** Caregivers read history by recency and by "was it attended"; the
  event-card + confirmation-status layout from the prototype is the right default surface.
- **A4 — Masking is a BE responsibility.** The FE will always receive masked escalation targets and
  never needs an unmask path.
- **A5 — HIST is not a live surface.** Caregivers accept that `/history` reflects the record *as of the
  last read* (with explicit refresh); live awareness is EVNT's job, not HIST's. No polling in HIST.

## 4. Critical dependencies

- **`hist-service` read endpoints** (history timeline + audit/escalation trail) — *pending BE*; the
  single hardest blocker (R1/G1/G3).
- **EVNT feedback write** (`evnt.feedback.record`) — HIST's only write affordance delegates to it.
- **ACS** — JWT with `hist.*` authorities and the tenant claim (tenant server-derived, never a param).
- **`@neuroassist/shared/*`** — access-http-base, access-decision, error-model, ui-feedback, ui-tokens,
  observability (same platform seams every NIV module consumes).
- **BA prototype** — `screens/history/history.component.ts` + `.build-plans/history.plan.md` (parity
  source for the caregiver history surface; the escalation/lapse trail has no parity).

## 5. Open questions

- **Q1 — HIST vs DASH boundary (host/consumer).** DASH ("Dashboard and Notifications") is described as
  the caregiver's place to *review history* and is a likely **host** that embeds HIST widgets. Does DASH
  host/embed HIST's read-only timeline widget, with HIST owning only the per-patient immutable read-model
  and the `/history` detail route? Or does HIST also own a standalone history page outside DASH? **Stated
  as an open boundary, not a decision** — resolve with the DASH vision + BE at M1.5.
- **Q2 — Scope of the "audit trail" for caregivers.** Is the caregiver trail limited to event-centric
  facts (events, confirmations, escalation, detection lapses), with the broader producer audit
  (caregiver/device/engine lifecycle) reserved for an admin surface? (Relates to G2.)
- **Q3 — Feedback affordance placement.** Surface "Was it real?" inside HIST's list (delegating to EVNT)
  or only on EVNT's recent-events surface? (Relates to G4; a Specs/UX call.)
