# GEST — Integration Contracts

> Service: `gest-service` · Module **GEST** · Project: NeuroAssist NIV
> EARS authoring guide: `../../../standards/ears-notation.md`.

## 1. External systems

**None.** GEST integrates with no third-party API, SDK, or model-hosting service. Detection-model
bundles are **frontend assets** (prototype-to-production), never a GEST backend responsibility
(vision 04 "External Integrations", `_brief.md` §5). All of GEST's outbound calls are intra-platform
sync REST (ACS, PAT, HIST — see `hub-integration.md`).

## 2. Auth to externals

Not applicable (no external systems). Intra-platform auth is ACS JWKS (`hub-integration.md` §1).

## 3. Rate limits / SLA / resilience

- No external rate limits apply. Internal calls (PAT vocabulary on declare, HIST on write) are rare
  (admin-driven) and are guarded by a **fail-closed** policy, not a circuit breaker, because an
  unvalidated or unaudited declaration must never persist (api-contract §3.4, hub-integration §2–3).
  HIST audit failures are **hard-502** (`502 audit-unavailable`, HIST ADR-005 — all four GEST facts);
  PAT vocabulary failures are `503 pat-vocabulary-unavailable`.
- Read / `support-check` paths make **no** outbound call, so they carry no external failure mode.

## 4. INT-GEST-PAT-1 — compound-gesture inter-primitive window (`compoundWindowMs`) — OPEN

**Gap.** A compound command is an ordered sequence of primitives (e.g. `BLINK` then `BROW_RAISE`).
To recognise it the station needs the **maximum gap allowed between consecutive primitives**. PAT's
`Command` carries `minGestureDurationMs` / `maxGestureDurationMs`, but those bound the **duration of a
single gesture**, not the **inter-primitive gap** of a compound. No field owns the gap today (handoff
M1 warning; vision 06).

**Recommendation (GEST's position): PAT owns a new `compoundWindowMs` on `Command`.**
Justification: the inter-primitive window is a **patient-tunable clinical parameter**, exactly like
the duration bounds that already live on PAT's `Command` (a slower patient needs a longer window). It
belongs beside `min/maxGestureDurationMs` so one clinical concept is calibrated in one place, by the
caregiver, in PAT's calibration UX (PAT ADR-003 command-calibration model).

**Rejected alternative: keep it in a GEST engine profile (per `engineVersion`).** Rejected because it
would split per-patient tuning across two services and make GEST stateful about runtime timing — GEST
is deliberately thin, global and advisory, and holds **no** per-patient or per-command tuning. The
engine's *floor* temporal tolerance (if ever needed) is a documentation note on the engine version,
not a calibration input.

**GEST's role:** none in storage. The station reads `compoundWindowMs` from the **command catalog**
(EDGE offline cache ← PAT), alongside the other calibration fields; GEST only answers *can the engine
detect each primitive* (INV-GEST-7). This is handed to **PAT** as an issue:

> **INT issue for PAT (do not edit PAT here):** add `compoundWindowMs` (int, ms) to the `Command`
> aggregate and its calibration contract/catalog projection, defaulting conservatively; surface it in
> calibration UX. Until PAT ships it, the station uses a hardcoded default window (FE concern) and
> compound recognition tuning is not caregiver-adjustable.

EARS (GEST side):

- THE SYSTEM SHALL NOT store or serve any inter-primitive timing value; a compound command's timing is read by the station from PAT's catalog, never from GEST.

## 5. INT-GEST-PAT-2 — capability consumption / "not yet detectable" marker — OPEN

**Need.** When a caregiver maps a command to a primitive in PAT, the UI must warn if the shipped
engine cannot detect that primitive — the INV-PAT-6 "not yet detectable" marker. GEST **provides** the
read contract; PAT/DASH **own** the call and the marker.

**GEST's role:** expose `GET /gest/capabilities?engineVersion=` and `support-check` (done,
api-contract §3). GEST does not push, does not know PAT's engine selection, and does not render UI.

> **INT issue for PAT/DASH (do not edit here):** on command/primitive mapping, call GEST
> `support-check` with the target `engineVersion` and the chosen `gestureTypeCode`(s); render
> "not yet detectable" when `detectable = false` (INV-GEST-4: advisory — PAT must still allow the
> mapping, never block on GEST's answer).

## 6. INT-GEST-ACS-1 — station `edge.device` token must carry GEST read authorities — OPEN

Per the station-auth decision (api-contract §1.2), the station authenticates GEST reads with its
`edge.device` token. That token must therefore bear `gest.capability.read` and `gest.engine.read`.

> **INT issue for ACS (and EDGE pairing flow; do not edit here):** include
> `gest.capability.read` and `gest.engine.read` in the authority set of the `edge.device` token so
> the station can run the "detectable" gate at boot without a patient-session JWT. GEST validates the
> token via JWKS and checks the authority; it does not mint or modify it.

EARS (GEST side):

- WHERE the `edge.device` token lacks `gest.capability.read`, THE SYSTEM SHALL respond `403 forbidden` to `support-check` (GEST enforces the authority; provisioning the authority is ACS/EDGE's responsibility).
