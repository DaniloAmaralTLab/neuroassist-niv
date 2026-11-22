---
service: gest-service
module: GEST
title: Gesture Detection (Edge) — Detection-Engine Capability Registry
stack: java-21-spring-boot
schema: neuroassist_global
messaging: disabled
status: specs
---

# GEST — Service Spec (entry point)

> Module **GEST — Gesture Detection (Edge)** · Service `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal — `../../adr/ADR-001-hexagonal-architecture.md`, key
> `hexagonal_java`) · Multi-tenant project, but **GEST persists to the global schema
> `neuroassist_global`** (INV-GEST-3, local ADR-003) · Messaging **disabled** (sync REST only).
> EARS authoring guide: `../../standards/ears-notation.md`.

## What GEST is (and is not)

GEST is a **thin, advisory, read-mostly** service. Its entire reason to exist is the
**detection-engine capability registry**: the authoritative answer to *"which `GestureType`
primitive codes does engine/model version V detect?"* — the truth INV-PAT-6 delegates to GEST.

GEST does **not** run detection (webcam, landmarks, classification are 100% on the station
frontend `gest-ui`), does **not** own the command catalog or calibration (**PAT**), device identity
or pairing (**EDGE**), event ingestion (**EVNT**), or token minting (**ACS**). See `_brief.md` §5.

## Map of this spec set

| Area | File |
|---|---|
| REST surface (HARD BARRIER for FE specs) | `contracts/api-contract.md` |
| Persistence (global schema, executable DDL) | `contracts/data-model.md` |
| Domain audit records (no broker) | `contracts/event-contracts.md`, `events/event-catalog.md` |
| Hub dependencies (ACS, PAT, HIST) | `contracts/hub-integration.md` |
| External systems (none) | `contracts/integration-contracts.md` |
| Specs | `spec/backend/SPEC-01..10.md` |
| Executable BDD | `tests/cucumber/*.feature` |
| C4 | `diagrams/c4-{context,container,component}.puml` |
| Local run | `setup-local.md` |

## Invariants (declared in the vision `03-initial-domain-framing.md`, cited here)

INV-GEST-1 (code exists in PAT vocab at declare), INV-GEST-2 (`(engineVersionId, code)` unique),
INV-GEST-3 (global, no `tenant_id`), INV-GEST-4 (advisory, never blocks PAT), INV-GEST-5
(admin-only writes; read-only tokens can never mutate), INV-GEST-6 (retired `(V,C)` not silently
re-supported).

**INV-GEST-7 — the "detectable" gate.** Declared **here at the contract layer** (not a domain
aggregate invariant): see `contracts/api-contract.md` §3.3. It is the read contract the patient
station depends on to decide, per catalog command, whether the running engine can detect it.

## Cross-module items left open (INT TODOs — GEST does not edit other modules)

- **INT-GEST-PAT-1** — compound-gesture inter-primitive window (`compoundWindowMs`): see
  `contracts/integration-contracts.md` §4 and `spec/backend/SPEC-10-integrations.md`.
- **INT-GEST-PAT-2** — PAT/DASH consumption of the capability read to surface the
  "not yet detectable" marker (INV-PAT-6): see `contracts/integration-contracts.md` §5.
- **INT-GEST-ACS-1** — the station `edge.device` token must carry authority
  `gest.capability.read` (and `gest.engine.read`): see `contracts/api-contract.md` §1.2.
