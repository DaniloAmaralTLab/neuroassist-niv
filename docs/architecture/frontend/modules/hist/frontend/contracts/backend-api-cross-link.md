# HIST — Backend API Cross-Link (FE ↔ BE)

> Maps the HIST frontend contracts to the **authoritative** backend contract
> `../../../../backend/services/hist-service/contracts/api-contract.md`. The BE specs are **DONE and
> authoritative**: this file replaces every "pending BE confirmation" the FE vision carried (doc 04 §7,
> doc 05 §2, doc 06 G1/G3/R1/R7) with the real endpoints, authorities and gaps. Anything the prototype /
> VM needs that the contract does **not** carry is flagged as **G-HIST-n** below — never invented.

## 1. Endpoint ↔ authority matrix (what the caregiver FE consumes)

| FE operation | BE endpoint | BE authority | FE scope |
|---|---|---|---|
| `getHistory` / `loadMore` | `GET /hist/patients/{patientId}/history` (BE §2) | `hist.history.read` | **IN** — the caregiver timeline; serves events, confirmations, feedback outcomes, escalation attempts and detection-lapse facts in one read |
| (delegated) feedback write | `POST /evnt/events/{eventId}/feedback` (EVNT §5.1) | `evnt.event.record` | **IN via EVNT** — HIST delegates, owns no write (§3) |
| operator full audit trail | `GET /hist/audit` (BE §3) | `hist.audit.read` | **OUT of caregiver UI** — operator/compliance only (§2) |
| producer audit ingest | `POST /hist/audit` (BE §1) | `hist.audit.record` | **OUT** — producer service-client only |
| subject erasure | `POST /hist/subjects/{subjectId}/erasure` (BE §4) | `hist.erasure.create` | **OUT** — operator/service-client only |

Patterns confirmed against the BE: base is the gateway prefix **`/hist`** (never `/api/v1`); **tenant is
JWT-derived** (BE §0/§6, never `X-Tenant-Id`); link/tenant scope enforced server-side (BE §2 → `403`,
leaks no record); keyset pagination on `occurredAt desc, id desc` with `cursor` + `size` (1..100, default
20); `period=today|week|month` (default `today`) **mutually exclusive** with `from`/`to` (both required
together, one alone → `400`).

## 2. Decision — operator audit trail NOT in the caregiver UI; trail is served by hist.history.read

**Decision (2026-11-20, orchestrator default, revisable).** The operator full producer trail
`GET /hist/audit` (`hist.audit.read`, BE §3, restricted to the compliance operator) is **not exposed in
the caregiver UI** for MVP. Rationale:

1. The BE **caregiver** timeline `GET /hist/patients/{patientId}/history` **already interleaves**
   `EscalationAttempted` and the detection-lapse facts (BE §2) — the caregiver's escalation & detection-lapse
   trail needs **no** `hist.audit.read` and **no** second call. It is a **section of `/history` under
   `hist.history.read`** (SPEC-01 §1, SPEC-04 §1, SPEC-05 §2).
2. `GET /hist/audit` is the **full 36-fact producer trail** (caregiver/device/engine lifecycle included) for
   incident reconstruction and access review — an **operator/compliance** surface, not a caregiver one
   (resolves doc 06 Q2/G2).

**Consequence — the vision's `hist.audit.read` caregiver authority is REMOVED** (resolves G1/R7). The
caregiver FE publishes **only** `hist.history.read`. A future operator/admin audit console over
`GET /hist/audit` is deferred behind the `hist.audit-console` feature flag (off, un-routed — SPEC-05 §3).

**HIST ↔ DASH boundary (interim framing, revisable).** HIST **owns** the per-patient immutable timeline +
the `/history` route; **DASH may embed** a read-only history widget by consuming a HIST-exported
component/facade slice (SPEC-06 §4) — DASH never re-queries `hist-service` and never re-implements the
timeline; cross-patient aggregation stays DASH-owned. Confirm with the DASH vision + BE at M1.5 (doc 06 Q1).

## 3. Decision — feedback write stays in EVNT; HIST delegates, owns no write (ADR-005)

**Decision (2026-11-20).** The prototype history screen's "Was it real?" feedback write does **not** come to
HIST. The affordance **is surfaced** on an event row in HIST's list (caregiver mental model, doc 06 A3), but
the **write is delegated to EVNT** through EVNT's public port via the shell (SPEC-04 §4, SPEC-06 §3):
`POST /evnt/events/{eventId}/feedback`, authority **`evnt.event.record`**. On success HIST calls
`HistoryFacade.refresh()`; HIST never patches locally and never binds a write endpoint (ADR-005, resolves
G4/Q3). **Authority reconciliation:** the HIST vision (doc 03 §1, doc 05) and the M0/M1 handoff referred to
this as **`evnt.feedback.record`**; EVNT's authoritative contract reconciled it to **`evnt.event.record`**
(EVNT SPEC-05 gap G-EVNT-1, op-name parity `recordFeedback → record`). HIST uses EVNT's canonical
`evnt.event.record`.

## 4. Gaps — CLOSED by the amended BE contract (G-HIST-n)

All five gaps are **CLOSED** by the amended `hist-service` caregiver read (BE api-contract §2 "Structured
entry fields" + `summary`; data-model §7; SPEC-03). Each entry now carries structured fields, so the FE
renders the prototype **without** parsing prose or inventing a field. Two fields depend on an upstream EVNT
audit-payload amendment (flagged below, **not** invented FE-side).

- **G-HIST-1 — structured `commandLabel` + `urgency` on event entries — CLOSED.** BE §2 projects
  `commandId`, `commandLabel` and `urgency` onto event-kind entries from the producer payload. The FE binds
  `HistoryEntryVM.commandLabel` from `wire.commandLabel` (the family's quoted word, SPEC-03 §2). *Upstream
  dependency:* EVNT must add `commandLabel` to its `EventGenerated` audit payload (BE event-contracts §1.2 /
  data-model §7); **when the field is absent the BE omits it and the FE falls back to `title`/`detail`** —
  never fabricates.
- **G-HIST-2 — join key + confirmation fold — CLOSED.** BE §2 sets `relatedEventId` (= `subjectId` for
  event-subject entries) on every confirmation/feedback/escalation entry **and** folds a server-side
  `confirmation { confirmedAt, confirmedBy }` onto the `EventGenerated` entry. The FE renders the prototype's
  inline "You confirmed at 14:33" / "Not yet confirmed" from `wire.confirmation` (SPEC-03 §2), with
  `relatedEventId` available when it prefers to fold client-side.
- **G-HIST-3 — structured `channel` + `maskedTarget` on escalation entries — CLOSED.** BE §2 projects
  `channel` (`web_push`\|`sms`\|`voice`) and a **server-side-masked** `maskedTarget`; the FE renders both
  verbatim and **never** unmasks (SPEC-03 §2, doc 01 §6). *Upstream dependency:* EVNT must add `maskedTarget`
  (already masked) to its `EscalationAttempted` audit payload (raw `channel_target` stays out of the audit);
  masking stays BE-side.
- **G-HIST-4 — whole-period `summary` — CLOSED.** BE §2 returns a `summary` object **on the first page only**
  (cursor absent), `scope="period"`, computed over the **whole** requested window (events, confirmed,
  marked-real, false-positives, not-reviewed + per-`kind` counts). The FE binds `PeriodSummaryVM.scope='period'`
  when the summary is present and keeps `'loaded'` only as the degraded fallback when it must summarise a
  paginated-but-summaryless window (SPEC-03 §3).
- **G-HIST-5 — `outcome` enumerated per `kind` — CLOSED.** BE §2 enumerates `outcome`: feedback/event
  `real|false_positive|not_evaluated`, escalation `sent|failed`, detection-lapse
  `started|resolved|acknowledged`. The FE maps `outcome` → badge per kind without guessing (SPEC-03 §2).

## 5. Mapping notes (no gap — handled FE-side)

- `DetectionLapseResolved` is emitted by **both** EDGE (`subjectType=edge-device`) and EVNT
  (`subjectType=detection-lapse`); the FE disambiguates by (`source`, `subjectType`) exactly as BE §2 /
  doc 06 R4 require — distinct entries, never merged.
- Prototype `periodo` enum `today|week|mes` → FE `PeriodFilter` `today|week|month` (`mes` → `month`); the
  prototype default `week` is kept as the FE's initial selection while the BE endpoint default is `today`
  (the FE always sends `period` explicitly, SPEC-04 §3).
- Detection-lapse "episodes" (start→resolve) arrive as **separate atomic facts**, not a folded aggregate; the
  FE renders each transition as its own `detection-lapse` row (`lapseState` from `kind`) — consistent with the
  immutable-fact model (no gap).
