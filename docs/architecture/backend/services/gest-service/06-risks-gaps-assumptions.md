<!-- OUTPUT-SCHEMA
- Risks
- Known Gaps
- Assumptions to Validate
- Critical Dependencies
-->

# 06 — Risks, Gaps and Assumptions

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Risks
The two BA-flagged technical-feasibility risks (R1, R2) lead; R3–R4 are GEST-specific.

### R1 — Open GestureType vocabulary vs finite landmark pipeline (BA-flagged feasibility)
PAT's `GestureType` vocabulary is extensible (LBC Amendment 2); the on-station landmark/classification
pipeline only recognises a finite, *trained* set. The gap between "a primitive can be named" and
"the engine can detect it" is precisely what GEST's registry exists to make explicit (INV-PAT-6).
**Residual risk:** engine support lags the vocabulary, so a caregiver can still map a command to an
unsupported primitive and detection silently never fires. **Mitigation:** PAT/DASH must consult GEST
on command create/calibrate and warn; GEST stays advisory (INV-GEST-4) so it cannot itself block, but
the warning is only effective if consumers wire it. Severity: high (safety-adjacent — a missed alarm).

### R2 — Tolerated time window between primitives of a compound gesture (BA-flagged feasibility)
A `Command` may be compound (`primaryPrimitive` + `secondaryPrimitive`) with `minGestureTimeMs` /
`maxGestureTimeMs`. Those fields describe a **gesture duration**, not the **tolerated inter-primitive
gap** of a two-primitive sequence. It is ambiguous whether `maxGestureTimeMs` bounds the whole
compound or each primitive, and there is no explicit `compoundWindowMs`. **Risk:** the station must
pick a sequencing/debounce window; too tight → false negatives, too loose → misfires. This is a
**detection-correctness** risk that lives mostly on the station, but the backend seam (PAT's fields)
may be insufficient to specify it. Severity: medium–high.

### R3 — Engine-version identity drift
GEST keys support on an `engineVersion`, but nothing in the current contracts records **which engine
version a given station actually runs**. If the station self-reports an unknown/old version, the
support answer is `unknown` and the warning degrades. Severity: medium.

### R4 — Advisory-only registry ignored by consumers
Because GEST never gates (INV-GEST-4), its value depends entirely on PAT/DASH/station choosing to read
and surface it. If they don't, the registry is inert. Severity: medium (design discipline).

## Known Gaps
- **G1 — Where does a station's engine version live?** Candidates: station self-reports it on the
  capability read (stateless, chosen default); EDGE device metadata; patient-session claim. v1 default:
  the caller passes `engineVersion` as a query param; no server-side pin. **Resolve in specs.**
- **G2 — Compound-gesture window ownership.** Does the backend need a `compoundWindowMs` (and if so,
  on PAT's `Command` or GEST's capability), or does the station derive it from `min/maxGestureTimeMs`?
  **Resolve with PAT in specs** (cross-contract; do not invent a GEST field unilaterally).
- **G3 — Support-check shape.** Single `(version, code)` lookup vs bulk `(version, [codes])` for a
  whole catalog. Both are cheap; specs should pick the bulk form as primary for the station self-check.
- **G4 — Calibration test-run telemetry.** Deferred (local ADR-004). If product later wants it, decide
  whether it belongs in GEST or reuses EVNT `report_meta`; do not add it to MVP.
- **G5 — Enforcement toggle.** Whether PAT should ever *hard-reject* an unsupported-primitive command
  (promote GEST from advisory to gate) is a future product call, not MVP.

## Assumptions to Validate
- **A1** — Engine support is genuinely tenant-independent (global schema is correct). If a tenant ever
  ran a bespoke engine, ADR-003 would need revisiting. Assumed false for v1.
- **A2** — The `gest.*` authority namespace reserved by ACS (patient-session `gest.*`/`conv.*`, PAT
  INV-PAT-7) is satisfied by GEST's read authorities; the patient-session token is read-only here
  (INV-GEST-5). Confirm against ACS SPEC-06.
- **A3** — PAT/DASH own the caregiver-facing warning UX; GEST only supplies the support signal.
- **A4** — Model bundles ship as frontend assets (prototype-to-production); the backend never serves
  model binaries.
- **A5** — Cross-service references by value (`gestureTypeCode`) with no FK are acceptable, consistent
  with PAT↔EDGE `deviceId` (A5 in PAT) and EVNT↔PAT `commandId`.

## Critical Dependencies
- **ACS** — token issuance/JWKS; without it GEST cannot authenticate any caller.
- **PAT** — the gesture-type vocabulary GEST annotates; INV-PAT-6 is the whole reason GEST exists.
- **HIST** — audit sink for GEST writes.
- **MIG** — centralized Flyway applies GEST's global-schema migrations.
- (Non-dependencies, stated for clarity: **EDGE**, **EVNT** — no call path to or from GEST.)
