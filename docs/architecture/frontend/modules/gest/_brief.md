# GEST — Structured Brief

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)
> Source brief for the downstream commands (specs, backlog, scaffold).

## 1. Canonical name and prefix
- Prefix: `GEST` · canonical id: `gest` · service: `gest-service` · frontend lib: `gest-ui`.

## 2. Problem the module solves
People with ALS/MND make residual voluntary facial micro-movements. The product must turn those
movements into structured help requests. **Detection itself runs locally** on the patient station
(browser webcam → facial landmarks → multi-class classification of the active command), per product
ADR-002 (embedded AI edge), ADR-006 (hybrid edge+cloud) and ADR-014 (mobile phone as edge). The
open architectural question this brief answers is: **what, if anything, does the backend
`gest-service` own**, given that capture/landmarks/classification are on the station, the catalog is
PAT's, the device is EDGE's, and event ingestion is EVNT's.

## 3. Personas
- **Primary — Patient station app (edge runtime).** A browser/PWA on a fixed PC or the patient's
  own phone that captures video, extracts landmarks, classifies the active command locally and
  reports the resolved `commandId` to EVNT. Acts under two ACS/EDGE identities: the `edge.device`
  token (EDGE-minted; heartbeat, catalog, gesture-report) and the patient-session token
  (ACS-minted, `gest.*`/`conv.*` authorities, ADR-012). It **reads** GEST's engine-capability
  registry.
- **Secondary — Caregiver / Clinic coordinator.** Maps commands to gesture primitives in PAT.
  Needs to know whether a chosen primitive is actually detectable by the shipped engine (the
  INV-PAT-6 gap). Consumes GEST's capability registry (directly or surfaced by PAT/DASH).

## 4. MVP scope (in)
- An authoritative **detection-engine capability registry**: the truth INV-PAT-6 delegates to GEST —
  which `GestureType` primitive **codes** the detection engine actually supports, keyed by engine /
  model **version**.
- A small **engine-version registry** (the engine/model bundles the product recognises).
- Read surface consumed by the station (self-check) and by PAT/DASH (warn a caregiver who maps a
  command to an unsupported primitive).
- Admin write surface to declare / retire support as new engine versions ship.

## 5. Out of scope (MVP)
- Any detection runtime: video capture, landmark extraction, classification, calibration UX — all on
  the **station frontend** (`gest-ui`), never the backend.
- The command catalog and calibration parameters (sensitivity, min/max gesture duration) — **PAT**.
- Device identity, pairing, `edge.device` token, offline catalog `GET /edge/catalog` — **EDGE**.
- Structured-event generation / alarm routing / `POST /evnt/gesture-reports` ingest — **EVNT**.
- Caregiver/patient-session identity and `gest.*` authority minting — **ACS**.
- Detection-model binary distribution (frontend asset under prototype-to-production; not a backend
  responsibility in v1).
- Calibration test-run telemetry ingestion — **deferred** (would overlap EVNT `report_meta`; local
  ADR-004).

## 6. Mandatory external integrations
- None external. Internal, synchronous REST only (messaging disabled). GEST is an **ACS resource
  server** (validates ACS caregiver + patient-session JWTs via JWKS). It consumes PAT's gesture-type
  vocabulary (`GET /pat/gesture-types`) read-only to key capability rows by a known `code`.

## 7. TechLab AI / cross-module dependencies
- No TechLab AI bounded context. `stack.messaging.enabled = false` → no broker; all cross-module
  contact is sync REST. Upstream contracts GEST must respect: **ACS** (tokens), **PAT** (gesture-type
  vocabulary + INV-PAT-6 handshake), **EDGE** (device identity), **EVNT** (event ingestion). GEST is
  read-for-support by PAT/DASH and by the station.

## 8. Domain anchor event
- **EngineCapabilityDeclared** — "an engine version is declared to support (or no longer support) a
  gesture-type primitive". This is the one state-changing domain fact GEST owns.
