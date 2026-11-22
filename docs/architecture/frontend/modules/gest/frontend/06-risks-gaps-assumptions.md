# 06 — Risks, Gaps, Assumptions — gest (GEST)

## 1. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| **R1** | **Tab backgrounding / device sleep throttles `requestAnimationFrame`** → the loop stalls and a real gesture is missed. This is a **safety** failure, not a perf one. | High | Screen Wake Lock API; `visibilitychange` handling that surfaces "detection paused" honestly (INV-GEST-6); recommend a dedicated/kiosk station tab; a push cadence is a later SPEC. **Open feasibility question — validate on the pilot station.** |
| **R2** | **Real-time in-browser facial-landmark classification may not hold ≥ 10 fps** on a low-end phone (thermal/battery throttling). | High | Web Worker isolation; model-size budget in ADR-005; downscale capture resolution; measure fps as a first-class success signal; fall back to a lower-cadence mode with honest status. |
| **R3** | **Compound-gesture false negatives** (LBC §12): the second primitive is faint/late and the window resets with no report. | High | Per-command `min/max` window from PAT; sensitivity→threshold tuning; diagnostics expose near-miss counts; recommend a tactile test in PAT before relying on a compound command. |
| **R4** | **"Naming ≠ engine support"** (PAT ADR-005 hazard): a catalog command names a `GestureType` the loaded model cannot detect. | High | INV-GEST-7 "detectable gate": classify only supported primitives, flag the rest as "not yet detectable"; never produce a false report; expose the supported-primitive set for PAT to render a marker. |
| **R5** | **Exactly-once under retries/races** — a duplicate event would raise a duplicate alarm. | Medium | Station-minted idempotent `reportId`; EVNT `(deviceId, reportId)` uniqueness (INV-EVNT-4) resolves replays to `200`; durable queue reuses the same `reportId`. |
| **R6** | **Queued report expiry** — a report stuck offline > 24h is rejected (`occurred-at-out-of-bounds`). | Medium | Surface pending age + "expires in …"; drop as `expired` with a visible diagnostics state rather than a silent loss (INV-GEST-5). |
| **R7** | **Device-token (`edge.device`) auth coupling** — GEST's report path depends on EDGE's token mint, which is provisional (EDGE `edge-service` not yet architected). | Medium | Keep the report adapter behind `GESTURE_REPORT_PORT`; `edge.device` token obtained via EDGE's seam; a 401/unpaired state is a first-class UI state, not a crash. |
| **R8** | **Privacy regression** — a future "debug frame upload" or analytics SDK could leak video. | High (LGPD) | ADR-005 makes on-device a binding invariant (INV-GEST-4); observability is schema-whitelisted (no frames/landmarks); e2e verifies zero video egress by network inspection. |
| **R9** | **Bundle / model asset weight** inflates station cold-start. | Low | Lazy entry (ADR-006); model cached; measure model TTI; model asset served from the station shell, not bundled into every chunk. |

## 2. Known gaps

- **G1 — Patient-Mode host shell undecided.** Which app/shell mounts GEST (detection) + CONV (speech
  tree) in "Patient Mode" is referenced by EDGE ADR-005 / ADR-012 §3.2.B but **not owned by GEST**.
  GEST exposes a clean `GEST_MODULE_DESCRIPTOR` + bootstrap; the host decision is a project-level SPEC.
- **G2 — `gest-service` BE not yet architected.** No `gest.*` API contract exists; the `gest.*`
  authorities and the diagnostics read-model are FE-declared and must be confirmed against the future
  BE. v1 egress is EVNT-only, so this does not block the detection runtime.
- **G3 — EDGE catalog-cache contract provisional.** The exact `CatalogReadPort` shape (how GEST reads
  EDGE's offline catalog + its "updated" signal) depends on EDGE's not-yet-final cache contract.
- **G4 — Landmark engine choice** (MediaPipe vs TF.js vs other) is proposed in ADR-005 but the final
  model + its supported-primitive set must be validated against the pilot's calibrated commands.
- **G5 — Supported-primitive ⇄ GestureType mapping** (which `GestureType` ids map to which model
  classes) is a contract GEST must publish for PAT's "not yet detectable" marker — not yet specified.

## 3. Assumptions to validate

- **A1** The pilot station is an Android/Chromium device (ADR-014) with a usable front camera and
  enough compute for ≥ 10 fps landmark inference.
- **A2** A single patient + single device per station in the pilot (project mock: 1 device) — no
  multi-patient station multiplexing in v1.
- **A3** Event volume is low (a handful of recognitions/hour), so a durable queue + polling-free
  egress is sufficient; no streaming transport is needed (messaging disabled project-wide).
- **A4** The caregiver keeps the station on a foregrounded/kiosk tab; backgrounding is the exception,
  handled by R1 mitigations, not the norm.
- **A5** The browser grants persistent camera permission on the station (not re-prompted each load).

## 4. Critical dependencies

- **EVNT** — `POST /evnt/gesture-reports` (authority `evnt.event.ingest`, device path), its
  idempotency + `occurredAt` bounds + `503 Retry-After` semantics (EVNT api-contract §2.1).
- **EDGE** — the `edge.device` identity token (ADR-014) and the offline command catalog cache.
- **PAT** — authoritative `Command` / `GestureType` catalog (consumed by id via EDGE).
- **ACS** — issuer of `gest.*` caregiver authorities (gest-service, planned; ADR-012 identity model).
- **shared/** — `access-decision`, `access-http-base` (device-token variant), `contracts`,
  `error-model`, `observability`, `ui-*`, `ui-tokens`.
- **In-browser landmark engine** — the WASM + model asset bundle (ADR-005 local).
