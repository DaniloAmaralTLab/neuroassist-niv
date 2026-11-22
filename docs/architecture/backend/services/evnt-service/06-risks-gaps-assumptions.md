<!-- OUTPUT-SCHEMA
- Risks
- Known Gaps
- Assumptions to Validate
- Critical Dependencies
-->

# 06 — Risks, Gaps and Assumptions

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV

## Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Alarm latency bounded by poll interval.** No push transport (messaging disabled) → an emergency is only seen on the next dashboard poll. | A life-safety alarm could be delayed by the poll period. | Short poll interval for `active-alarm`; document the budget; ADR-003 local records the trade-off; push (SSE/broker) is the named future signal (ADR-006 shared). |
| R2 | **Forged report.** A compromised client could POST a fabricated gesture report. | False events / false alarms. | Trust only an `edge.device` token (EDGE JWKS + introspection); take identity from claims, never body (INV-EVNT-6). |
| R3 | **Duplicate events** from station retries (at-least-once delivery). | Noise, double alarms. | DB UNIQUE `(device_id, report_id)` + idempotent ingest (INV-EVNT-4). |
| R4 | **PAT unavailable at generation** → cannot resolve urgency/label. | Event cannot be correctly typed. | Fail the report so the station retries (ADR-004 local); do not guess urgency. Confirm exact degrade at specs. |
| R5 | **Stale snapshot vs recalibration.** Command urgency/label changed in PAT after the event. | Historical event shows the old urgency. | Intended (ADR-004 local): the snapshot is the historical truth of what fired; live catalog is PAT's. |
| R6 | **HIST audit failure** on a state-changing action. | Incomplete audit trail. | Follow project HIST failure policy (hard `502` vs enqueue) — TODO[architect] at specs, same open item ACS/PAT/EDGE flagged. |

## Known Gaps

- **G5 / INT-EDGE-001 — EVNT closes it here.** EDGE left the gesture-report contract to EVNT. This
  vision fixes: endpoint `POST /evnt/gesture-reports`, token-claim-sourced identity, idempotency on
  `(deviceId, reportId)`, and the authority **`evnt.event.ingest`** that the `edge.device` token must
  carry (ADR-002 local). The exact request/response schema is finalized at `/be-architect-specs`.
- **Report payload granularity (open at specs):** the station reports a resolved `commandId` (it runs
  the offline catalog and classifies locally — GEST/EDGE truth). Whether EVNT also accepts a
  confidence/timing envelope for later tuning is deferred to specs. **Assumption:** `commandId` +
  `reportId` + `occurredAt` is the minimum.
- **Who-to-notify scoping (open at specs):** read scoping by tenant alone vs tenant **and** ACS
  caregiver↔patient link. Family tenants (1 caregiver / 1 patient) are trivially covered by tenant
  scope; clinic tenants need link scoping (INV-EVNT-7). **Decision proposed:** scope by both.
- **ACS service-client minting path** for EVNT→PAT/HIST/EDGE calls — unspecified ACS-side (same open
  item EDGE/PAT flagged). TODO[architect] at backlog/scaffold.
- **HIST contract shape** (`POST /audit` envelope) assumed identical to EDGE's audited-action
  envelope; confirm against the live HIST contract when HIST is architected.
- **Flyway version range** not yet reserved with MIG (doc 05 TODO).

## Assumptions to Validate

- The edge station resolves the recognized **Command** locally (offline catalog, ADR-004 PAT) and
  reports a `commandId`, not raw landmarks — EVNT never classifies.
- The `edge.device` token carries `deviceId`, `patientId`, `tenantId`, `actorType = edge-device` and
  the `evnt.event.ingest` right (EDGE integration-contracts §6; EDGE embeds it).
- A `routine` event requires **no** blocking confirmation (toast + History only); only `emergency`
  takes over the screen and is confirmable (BA wireframe §Screen 02 / §3.2.E).
- Domain verbs `ingest`, `confirm`, `record` must be registered in
  `scripts/arch_decisions.py _OP_VERB_TO_ACTION` before scaffold (Learning D-531; D-639).

## Critical Dependencies

| Dependency | Nature | Failure mode if absent |
|---|---|---|
| **EDGE** (JWKS + introspection + token right) | hard — report path trust | No trusted ingest; EVNT cannot accept reports (G5). |
| **PAT** (`GET /pat/commands/{id}`) | hard — at generation | Cannot resolve urgency/label (R4). |
| **ACS** (JWKS + introspection + links) | hard — caregiver path | No caregiver auth / routing. |
| **HIST** (`POST /audit`) | hard — audit | Incomplete audit trail (R6). |
| **MIG** (central Flyway) | build-time | No schema. |
| **REG / GWY** | infra | Discovery/fronting; `*.base-url` fallback. |
