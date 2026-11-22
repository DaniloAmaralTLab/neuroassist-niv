# SPEC-10 — Integrations, Cross-module items & Safety

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.
> Contracts: `../../contracts/hub-integration.md`, `../../contracts/integration-contracts.md`.

## Objetivo
Specify GEST's intra-platform integrations (ACS/PAT/HIST), the consumer read contract (station,
PAT/DASH), the open cross-module items, and the patient-side safety posture.

## Escopo
- **In:** ACS/PAT/HIST dependencies; the station read contract; INT TODOs; SAFETY.
- **Out:** external systems (none); EDGE/EVNT (no dependency either direction).

## 1. Intra-platform dependencies
- **ACS** — JWKS validation (+ introspection on writes). **PAT** — `GET /pat/gesture-types` on declare
  (INV-GEST-1), fail-closed. **HIST** — audit sink on write (fail-closed; all four GEST facts hard-502,
  `502 audit-unavailable`, HIST ADR-005; base URL incl. `/hist`, service-client `hist.audit.record` —
  INT-GEST-ACS-002). Full detail in `hub-integration.md`.

## 2. Station read contract (what `gest-ui` needs from GEST)
- **Primary:** `POST /gest/capabilities/support-check { engineVersion, codes[] }` → per-code
  `supportStatus` + `detectable` (INV-GEST-7). Keyed by `engineVersion`; cached by the station via
  `ETag`/`If-None-Match`. Auth: `edge.device` token with `gest.capability.read` (SPEC-06).
- **Secondary (cacheable dump):** `GET /gest/capabilities?engineVersion=` → full support map for the
  engine, HTTP-cacheable with `ETag`.
- **Compound rule:** the station marks a compound command detectable iff **all** its primitives are
  `detectable`; GEST returns per-code truth only.

## 3. INT-GEST-PAT-1 — compound inter-primitive window (`compoundWindowMs`) — OPEN (PAT to own)
PAT's `min/maxGestureDurationMs` is a single-gesture **duration**, not the **gap between primitives**
in a compound. **Recommendation:** PAT adds `compoundWindowMs` to `Command` (patient-tunable, beside
the duration bounds). Rejected: a GEST engine profile (would split per-patient tuning and make GEST
stateful about timing). GEST stores nothing; the station reads the window from PAT's catalog.
→ Issue handed to PAT (`integration-contracts.md` §4). **GEST does not edit PAT.**

## 4. INT-GEST-PAT-2 — "not yet detectable" marker — OPEN (PAT/DASH to own)
PAT/DASH call GEST support-check when a caregiver maps a command to a primitive, rendering
"not yet detectable" when `detectable = false` (INV-PAT-6). GEST provides the read; PAT/DASH own the
call and UI. INV-GEST-4: advisory — PAT must still allow the mapping. **GEST does not edit PAT/DASH.**

## 5. INT-GEST-ACS-1 — `edge.device` token authorities — OPEN (ACS/EDGE to own)
The `edge.device` token must carry `gest.capability.read` + `gest.engine.read` so the station runs the
detectable gate at boot without a patient-session JWT (`integration-contracts.md` §6).

## 6. SAFETY — patient-side missed gestures
**Hazard (FE vision R1, handoff M1):** a station tab that is backgrounded / asleep throttles the
detection loop, so a patient's help gesture is missed. This is a **frontend** mitigation surface; the
backend's only relevant signal is **station liveness**, which is **EDGE's heartbeat** — GEST must
**reuse, not duplicate** it.

- **SAFETY-1 (handed to FE — requirement, no GEST role):** the station SHALL keep the detection loop
  alive (Screen Wake Lock, kiosk/foreground, visibility handling) and SHALL render an **honest paused
  state** when it cannot detect, never an implied "all clear". Owned by `gest-ui` (FE vision R1).
- **SAFETY-2 (backend posture — EARS where GEST has a role):**
  - THE SYSTEM (GEST) SHALL NOT implement, expose, or imply any station-liveness or heartbeat
    endpoint; station liveness is derived from **EDGE's** heartbeat and SHALL NOT be duplicated here.
  - THE SYSTEM SHALL NOT infer that a station is detecting from the presence or absence of GEST reads
    (support-check is advisory and read-mostly; absence of a call means nothing about patient safety).
- **SAFETY-3 (advisory aid GEST does provide):** by answering `detectable` honestly (INV-GEST-7),
  GEST lets the station/caregiver see up front that a mapped primitive is "not yet detectable",
  preventing a false expectation that an undetectable gesture would raise an alarm.

## 7. Critérios de aceite (EARS)
- THE SYSTEM SHALL serve support-check and capability reads from its own store without calling PAT.
- THE SYSTEM SHALL NOT own or duplicate station liveness (reuse EDGE heartbeat).
- THE SYSTEM SHALL record INT-GEST-PAT-1, INT-GEST-PAT-2, INT-GEST-ACS-1 as cross-module issues and
  SHALL NOT modify PAT, DASH, ACS or EDGE artefacts from GEST.
