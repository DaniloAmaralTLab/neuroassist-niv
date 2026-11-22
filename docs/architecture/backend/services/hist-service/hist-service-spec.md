---
service: hist-service
module: HIST
moduleName: History and Audit Trail
project: NeuroAssist NIV
stack: java-21-spring-boot
basePath: /hist
port: 8083
multiTenancy: schema-per-tenant
messaging: disabled
ai: none
stage: specs
---

# HIST — `hist-service` — Specification Map

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV
> Append-only system of record (audit sink for 5 producers) + caregiver-facing history read model.
> Vision: `01..06` + `adr/ADR-001..006`. Hexagonal: `../../adr/ADR-001-hexagonal-architecture.md`.

HIST is a **contracted downstream**: the ingress `POST {hist.baseUrl}/audit` already exists in
the five producers' contracts (ACS, PAT, EDGE, EVNT, GEST). These specs **reconcile** those
contracts into one canonical envelope, close the five upstream `TODO[architect]` failure-policy
items (ADR-005, accepted), and define the caregiver read surface — they do not invent a new API.

## Final resolved surface (D-640)

| Surface | Verb + path | Authority (D-639/D-641) | Caller |
|---|---|---|---|
| Audit ingest | `POST /hist/audit` | `hist.audit.record` | ACS, PAT, EDGE, EVNT, GEST (service-client) |
| Caregiver timeline | `GET /hist/patients/{patientId}/history` | `hist.history.read` | DASH / caregiver JWT |
| Operator audit trail | `GET /hist/audit` | `hist.audit.read` | compliance operator |
| Subject erasure | `POST /hist/subjects/{subjectId}/erasure` | `hist.erasure.create` | ACS / compliance operator (service-client) |

> **Path reconciliation (D-640).** Producers keep the exact literal call `POST {hist.baseUrl}/audit`.
> The controller base path is `/hist` (D-640, `base_path`), the resource path is `/audit`, so the
> **final URL is `POST /hist/audit`**. The only change is a **configuration value**: each producer's
> `hist.base-url` / `HIST_BASE_URL` must resolve to the service root **including** `/hist`
> (dev: `http://localhost:8083/hist`). No producer code or contract changes — the call-site template
> is unchanged. See `contracts/integration-contracts.md` §1.

## Document map

| Area | File |
|---|---|
| REST contract | `contracts/api-contract.md` |
| Data model + DDL | `contracts/data-model.md` |
| Event (audit fact) contract | `contracts/event-contracts.md` |
| Hub integration (ACS, MIG, producers) | `contracts/hub-integration.md` |
| External integration + failure policy | `contracts/integration-contracts.md` |
| Event catalog | `events/event-catalog.md` |
| SPECs | `spec/backend/SPEC-01..10.md` |
| BDD features (Gherkin) | `tests/cucumber/*.feature` |
| C4 diagrams | `diagrams/c4-{context,container,component}.puml` |
| Local setup | `setup-local.md` |

## Invariants (declared in vision 03, cited here)

`INV-HIST-1` append-only · `INV-HIST-2` mandatory fields · `INV-HIST-3` idempotency-key dedup ·
`INV-HIST-4` unknown action/version stored+flagged · `INV-HIST-5` tenant vs global placement ·
`INV-HIST-6` read surface tenant+patient scoped.
