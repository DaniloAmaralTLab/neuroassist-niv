---
service: evnt-service
module: EVNT
moduleName: Events and Alarms
project: NeuroAssist NIV
stack: java-21-spring-boot
multiTenancy: schema-per-tenant
messaging: disabled
basePath: /evnt
flywayRange: V0040-V0046
status: specs
---

# EVNT — Service Spec (entry point)

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal — `../../adr/ADR-001-hexagonal-architecture.md`, key
> `hexagonal_java`) · Multi-tenant schema-per-tenant (`../../adr/ADR-003-multi-tenancy.md`) ·
> Messaging disabled. EARS authoring guide: `../../standards/ears-notation.md`.

EVNT turns a recognized gesture (reported by the edge station) into a durable, auditable **Event**
and orchestrates its delivery to the caregiver — an unmistakable full-screen alarm for `emergency`,
a discreet toast for `routine` — **without a push transport**. Delivery is caregiver-dashboard
**polling** (ADR-003 local). This file is the map; the contracts and SPECs below are implementable
without re-reading the vision (docs 01–06).

## Contract map

| Artifact | Purpose |
|---|---|
| [`contracts/api-contract.md`](contracts/api-contract.md) | **HARD BARRIER for FE** — every endpoint: method, path, authority, status codes, headers, RFC 7807 errors |
| [`contracts/data-model.md`](contracts/data-model.md) | `event` / `push_subscription` / `escalation_attempt` / `detection_lapse` DDL (executable `sql`), indexes, Flyway plan `V0040`–`V0046` |
| [`contracts/event-contracts.md`](contracts/event-contracts.md) | audited domain actions → HIST (envelope aligned with ACS/PAT/EDGE), idempotency, versioning |
| [`contracts/hub-integration.md`](contracts/hub-integration.md) | TechLab AI hub: **none** (`ai.hasAi = false`) + propagation headers |
| [`contracts/integration-contracts.md`](contracts/integration-contracts.md) | intra-project sync REST: EDGE, PAT, ACS, HIST; degrade / retry policy; downstream exposure |

## SPEC map

| SPEC | Theme |
|---|---|
| [SPEC-01](spec/backend/SPEC-01-api-surface.md) | API surface |
| [SPEC-02](spec/backend/SPEC-02-event-generation.md) | Core orchestration — ingest gesture report → generate Event |
| [SPEC-03](spec/backend/SPEC-03-alarm-delivery-safety.md) | **Alarm delivery & safety** — polling contract, latency budget, SAFETY-1 closed (out-of-band), residual risks |
| [SPEC-04](spec/backend/SPEC-04-data-model-migrations.md) | Data model + migrations |
| [SPEC-05](spec/backend/SPEC-05-idempotency-concurrency.md) | Idempotency + concurrency |
| [SPEC-06](spec/backend/SPEC-06-security.md) | Security — dual JWT issuer, authorities, tenant isolation |
| [SPEC-07](spec/backend/SPEC-07-observability-health.md) | Observability + health |
| [SPEC-08](spec/backend/SPEC-08-bdd-test-scenarios.md) | BDD test scenarios |
| [SPEC-09](spec/backend/SPEC-09-messaging-architecture.md) | Messaging architecture (disabled; sync posture) |
| [SPEC-10](spec/backend/SPEC-10-integrations.md) | Integrations |
| [SPEC-11](spec/backend/SPEC-11-emergency-escalation.md) | **Out-of-band emergency escalation** — tiers (push→SMS→voice), timings, idempotency, stop-on-confirm (ADR-005, closes SAFETY-1) |
| [SPEC-12](spec/backend/SPEC-12-detection-lapse-alerting.md) | **Detection-lapse alerting** — EDGE raises (service-client), EVNT alerts + reuses the SPEC-11 ladder, stops on resolve/ack, emergency outranks (ADR-006, SAFETY-GEST-1) |

Gherkin features: [`tests/cucumber/`](tests/cucumber/). Event catalog:
[`events/event-catalog.md`](events/event-catalog.md). Diagrams: [`diagrams/`](diagrams/).

## Declared domain invariants (cited, never redeclared)

Declared once in [03-initial-domain-framing.md](03-initial-domain-framing.md) §Invariants:
`INV-EVNT-1` tenant from JWT claim · `INV-EVNT-2` one Command, snapshot urgency+label ·
`INV-EVNT-3` active alarm is a read-time query (no second table) · `INV-EVNT-4` ingest idempotent on
`(deviceId, reportId)` · `INV-EVNT-5` only emergency confirmable, confirm idempotent ·
`INV-EVNT-6` report path trusts only an `edge.device` token, identity from claims ·
`INV-EVNT-7` caregiver reads only linked patients within tenant.

## Open TODO[architect] carried into backlog/scaffold

- **SAFETY-1 — CLOSED by design (product decision 2026-11-20, ADR-005 / SPEC-11).** An out-of-band
  channel is now IN v1, inside EVNT: Web Push → SMS → voice escalates while an emergency is
  unconfirmed and stops on confirmation. Residual limits (no cellular coverage, provisioning, ACS phone
  source) are stated in SPEC-03, not hidden. Messaging is **not** reopened (outbound integration).
- **SAFETY-2 — partially addressed.** Time-based channel escalation to **linked** caregivers now
  exists (SPEC-11); routing to an **unlinked** secondary/coordinator role is the deferred residual
  (reuses `EmergencyNotificationPort`). See SPEC-03.
- **AWS End User Messaging (SMS + Voice)** — confirm the project's **selected Region**, the **+55
  origination/sender requirements**, and **account-plan** support before enabling Tiers 1–2; no
  cross-Region. See integration-contracts §8.
- **SAFETY-GEST-1 — OWNED by EVNT alerting (product decision 2026-11-20, ADR-006 / SPEC-12).** EDGE
  raises a detection lapse (station connected but not detecting, or heartbeat stopped, for `N` s) over
  an `edge-service` service-client token (api §10); EVNT surfaces a distinct "station not detecting"
  caregiver alert (api §11) + **reuses** the SPEC-11 ladder (push→SMS→voice) until **resolved** (EDGE)
  or **acknowledged** (api §12). A real emergency always outranks a lapse. Residual limits identical to
  SAFETY-1 (SPEC-03 Decision 5).
- **INT-EVNT-ACS-001 (cross-module)** — ACS must expose the caregiver **phone / capability / consent**
  for SMS/voice; ACS does not today. Open at backlog; do not edit ACS here. See integration-contracts §3.1.
- **INT-EVNT-ACS-002 (cross-module, SAFETY-GEST-1)** — ACS must mint an **`edge-service` service-client
  JWT** carrying `evnt.detection-lapse.create` + `evnt.detection-lapse.resolve` so EDGE can raise/
  resolve detection lapses. Closes EDGE integration-contracts §6.2's INT TODO on the EVNT side. Open at
  backlog; do not edit ACS/EDGE here. See integration-contracts §9.
- **HIST failure policy** — hard `502` vs enqueue on an audit-write failure (same open item
  ACS/PAT/EDGE flagged); confirm against the live `hist-service` contract.
- **ACS service-client minting path** for EVNT→PAT/EDGE-introspect/HIST calls (client-credentials vs
  provisioned principal); confirm against the live ACS contract.
