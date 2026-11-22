# SPEC-03 — Caregiver History Timeline (critical sub-feature)

> Use case `QueryPatientHistory`. Endpoint `GET /hist/patients/{patientId}/history`.
> Contract: `../../contracts/api-contract.md` §2.

## Objective

Serve the caregiver-facing, patient-scoped, read-only timeline (events, alarms, confirmations, feedback,
escalation attempts, detection lapses) consumed by DASH.

## Scope

- **In** — per-patient timeline, period filter (`today`/`week`/`month`) + explicit `from`/`to`,
  keyset pagination, ACS link scoping, human-readable rendering, collision-safe lapse rendering.
- **Out** — cross-patient aggregation / KPIs (DASH), live unconfirmed-alarm projection (EVNT), any write.

## Decision — timeline source (stated)

**HIST builds the timeline from its own audit records; it does NOT proxy EVNT.** Rationale: the vision
makes HIST the durable **system of record** for history; EVNT owns only the *live* unconfirmed-alarm
projection. Proxying EVNT would (a) miss EDGE-side detection lapses (`subjectType=edge-device`) that
EVNT never holds, and (b) couple HIST reads to EVNT availability. HIST therefore queries its own
`audit_record` filtered to patient-relevant facts. (Confirmed by FE HIST ADR-005: HIST read-only reader
of the immutable trail.)

## Implementation

- Facts surfaced: `EventGenerated`, `AlarmConfirmed`, `FeedbackRecorded`, `EscalationAttempted`,
  `DetectionLapseRaised/Resolved/Acknowledged` (EVNT, `detection-lapse`) and
  `DetectionLapseStarted/Resolved` (EDGE, `edge-device`).
- Query: `SELECT ... FROM audit_record WHERE tenant_id = :tenant AND subject references :patientId AND
  occurred_at IN window AND action IN (<timeline set>) ORDER BY occurred_at DESC, id DESC` with keyset
  pagination (`ix_audit_record_subject_time`).
- Rendering: map each `(source, action, subjectType)` to a `HistoryEntry` (title/detail/urgency/outcome).
  `DetectionLapseResolved` renders distinctly per (source, subjectType) — `event-contracts.md` §5.
- Window resolution: `period` → computed `from`/`to`; explicit `from`/`to` overrides.
- **Structured projection (G-HIST-1..5, FE cross-link §4; api-contract §2 + data-model §7).** Beyond
  `title`/`detail`, each entry projects: `subjectId` + `relatedEventId` (= `subjectId` for event-subject
  entries — the join key, G-HIST-2); `commandId`/`commandLabel`/`urgency` for event-kind entries from the
  producer payload (G-HIST-1 — `commandLabel` omitted when the payload lacks it, never fabricated);
  a server-side `confirmation { confirmedAt, confirmedBy }` folded onto the `EventGenerated` entry from its
  sibling `AlarmConfirmed` (G-HIST-2); structured `channel` + already-masked `maskedTarget` on
  `EscalationAttempted` (G-HIST-3 — HIST never unmasks); and an enumerated `outcome` per `kind` (G-HIST-5).
- **Period summary (G-HIST-4).** On the **first page only** (no `cursor`) the response carries a `summary`
  object (`scope="period"`) aggregated over the **whole** requested window — per-`kind` counts plus
  confirmed/unconfirmed and feedback-verdict folds for event-kind facts — served by
  `ix_audit_record_patient_time` (data-model §4/§7). Keyset pages (cursor present) omit `summary`.
  **Decision (orchestrator default, revisable):** summary is inlined on the first page, not a separate
  `GET .../history/summary` endpoint (one authority, one round-trip; see api-contract §2).
- **Upstream payload dependencies (doc amendments, not invented here):** `commandLabel` on EVNT
  `EventGenerated` and `maskedTarget` on EVNT `EscalationAttempted` must be added to those producers'
  audit payloads (EVNT `event-contracts.md` §1.2); `commandId`/`urgency`/`channel`/`feedback`/`confirmedBy`
  are already carried.

## Edge cases

- Patient has no events in window → `200` with empty `entries`.
- `DetectionLapseResolved` from both EDGE and EVNT in the same window → two distinct entries.
- Patient belongs to tenant but caregiver is not linked → `403` (not `404`), leak nothing.

## Acceptance criteria (EARS)

- WHEN a linked caregiver requests a patient's history, THE SYSTEM SHALL return the newest-first timeline
  for the window built from HIST's own records (INV-HIST-6).
- IF the caregiver is not linked to `patientId` or it is outside their tenant, THEN THE SYSTEM SHALL
  respond `403` (INV-HIST-6).
- WHEN no period or range is given, THE SYSTEM SHALL default to `period=today`.
- IF only one of `from`/`to` is supplied, THEN THE SYSTEM SHALL respond `400`.
- WHILE rendering, THE SYSTEM SHALL keep EDGE and EVNT `DetectionLapseResolved` distinct by
  (source, subjectType).
- WHEN projecting an event-kind entry, THE SYSTEM SHALL carry `commandId`, `commandLabel`, `urgency`,
  `relatedEventId` and (where confirmed in-window) a folded `confirmation`, omitting any field the
  producer payload does not carry (G-HIST-1/G-HIST-2).
- WHEN projecting an `EscalationAttempted` entry, THE SYSTEM SHALL carry structured `channel` and an
  already-masked `maskedTarget` and SHALL NOT expose a raw target (G-HIST-3).
- WHEN the first page is requested, THE SYSTEM SHALL include a whole-period `summary` (`scope="period"`);
  WHILE paginating with a cursor, THE SYSTEM SHALL omit it (G-HIST-4).
- THE SYSTEM SHALL reject any non-GET method on this resource (read-only).
