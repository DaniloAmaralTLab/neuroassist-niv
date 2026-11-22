<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal — `../../adr/ADR-001-hexagonal-architecture.md`,
> key `hexagonal_java`) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Intent
GEST is the module that turns a patient's residual facial micro-movements into a recognised command.
**Recognition runs on the edge**, not on the backend: the patient station (browser webcam → facial
landmarks → multi-class classification) resolves the active `commandId` locally and reports it to
EVNT (product ADR-002 embedded AI edge, ADR-006 hybrid edge+cloud, ADR-014 mobile phone as edge).
This document fixes the backend's share of that module.

**The backend `gest-service` is deliberately THIN.** It owns exactly one authoritative thing: the
**detection-engine capability registry** — the truth that PAT's INV-PAT-6 explicitly delegates to
GEST ("naming a `GestureType` does not mean the engine supports it; GEST owns support truth"). It
answers one question for the rest of the system: *does the shipped detection engine, at a given
model version, actually detect this gesture-type primitive?* Everything else about detection lives on
the station frontend (`gest-ui`) and is out of this service's scope.

## Problem Statement
PAT's `GestureType` vocabulary is **open and extensible** (LBC Amendment 2) and PAT validates only
that a referenced primitive *exists* in the vocabulary (INV-PAT-4, `unknown-gesture-type`). It does
**not** and must not assert that the landmark/classification pipeline can actually recognise that
primitive. So without an owner for "engine support truth" a caregiver can map a command to a
primitive the engine never detects — the alarm then silently never fires. INV-PAT-6 names GEST as
that owner. Nothing in ACS/PAT/EDGE/EVNT fills this gap, and nothing should: it is detection-engine
knowledge, which is GEST's domain. The backend materialises it as a small, read-mostly registry so
PAT/DASH can warn at calibration time and the station can self-check its loaded engine.

## Personas
- **Patient station app (edge runtime)** — primary consumer. Runs detection locally; reads
  GEST's capability registry to confirm its loaded engine version supports the primitives in the
  patient's catalog. Authenticates with a patient-session token (ACS, `gest.*` authorities, ADR-012)
  or an `edge.device` token (EDGE). Never writes to GEST.
- **Caregiver / Clinic coordinator** — secondary. When mapping/calibrating a command in PAT, needs to
  know whether the chosen primitive is detectable. Consumes the registry (directly or via PAT/DASH).
- **Platform / release admin** — the only writer. Declares or retires engine support as new detection
  model versions are released.

## MVP Scope
1. **Engine-capability registry** — `(engineVersion, gestureTypeCode) → supportStatus`, the INV-PAT-6
   truth. Read by the station and by PAT/DASH; append/retire by admin.
2. **Engine-version registry** — the detection engine / model bundles the product recognises
   (`version`, label, status), so capability rows are keyed by a known version.
3. **Support-check read** — resolve, for a given engine version and a set of gesture-type codes,
   which are supported / unsupported (the signal a caregiver UI needs).
4. GEST as an **ACS resource server** honouring `gest.*` authorities already reserved in ACS.

## Out of Scope
- Video capture, facial-landmark extraction, classification, calibration UX, on-device thresholds —
  **station frontend `gest-ui`** (product ADR-002 / ADR-014). The backend never sees video or
  landmarks.
- Command catalog, labels, sensitivity, `minGestureTimeMs`/`maxGestureTimeMs` — **PAT**.
- Device identity, pairing, `edge.device` token, offline catalog `GET /edge/catalog` — **EDGE**.
- Structured-event generation, alarm routing, `POST /evnt/gesture-reports` — **EVNT** (the station
  reports the resolved `commandId` to EVNT, never to GEST).
- Patient-session / caregiver identity and `gest.*` authority minting — **ACS**.
- Detection-model binary distribution (a frontend asset under prototype-to-production — not a backend
  endpoint in v1).
- Calibration test-run telemetry ingestion — **deferred** (local ADR-004; would overlap EVNT
  `report_meta`).

## Architectural Principles
- **Thin by intent.** GEST owns one fact (engine support truth) and resists absorbing detection,
  catalog, device or event responsibilities that already have owners.
- **INV-PAT-6 is the contract.** GEST is the authority PAT points to; GEST never duplicates PAT's
  vocabulary, it annotates it with support per engine version.
- **Global truth, not per-tenant.** Engine support is a product-wide fact (like PAT's global
  gesture-type catalog); it lives in the global schema, read by all tenants, written by admin only
  (local ADR-003).
- **Read-mostly, fail-open on read.** The registry is advisory: it lets consumers *warn*; it never
  blocks PAT command creation (PAT keeps its own INV-PAT-4 existence check).
- **Sync REST only.** Messaging disabled; no broker, no async coupling.
- **Hexagonal** (shared `ADR-001-hexagonal-architecture.md`, key `hexagonal_java`).

## Success Signals
- A caregiver mapping a command to an unsupported primitive is **warned** before relying on it (PAT/
  DASH read GEST and surface it), closing the silent-no-detection path that INV-PAT-6 anticipates.
- A station can answer "does my loaded engine support every primitive in this catalog?" with a single
  GEST read, with no second call.
- Zero detection logic, zero catalog data, zero event rows live in `gest-service`: the boundary with
  PAT/EDGE/EVNT holds under review.
