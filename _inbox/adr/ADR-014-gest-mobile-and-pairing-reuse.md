# ADR-014 — GEST on the patient's mobile phone and reuse of the existing pairing

> **Date:** 2026-08-30
> **Status:** accepted
> **Decision maker:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — **decision closed**, confirmed directly by Danilo Amaral on 2026-08-30.
> **Based on:** `neuroassist-ai/docs/architecture/frontend/modules/gest/frontend/adr/ADR-007-browser-as-sole-detection-engine.md` (accepted, 2026-08-22) and `ADR-008-estacao-do-paciente-como-dispositivo.md` (proposed, 2026-08-25) — real decisions already in force in the architecture repository, not hypotheses of this amendment.

---

## Context

The post-handoff briefing (§3.3, §4 questions 5 and 7) raises two questions about the patient's mobile phone as a full edge device:

1. **Question 5 — GEST on the mobile phone:** is running the gesture-detection pipeline from a mobile phone camera an architecture consideration separate from the current capability of `gest-service`/`edge-service`, today designed for a fixed device?
2. **Question 7 — Pairing reuse:** does the code-based pairing flow (`awaiting-claim` → heartbeat), designed for fixed hardware physically operated by someone near the machine, work for the patient's mobile phone, or does it need its own flow?

What changes the framing of both questions: **the real `gest-service`/frontend had already decided, before this briefing, that detection does not run in any native pipeline — it runs entirely in the browser.**

- **ADR-007 (accepted, 2026-08-22):** the detection engine is 100% browser (MediaPipe Tasks Vision, local WASM, no CDN), replacing the native Python agent that existed as a PoC. Reason: operating-system parity (the Python agent does not containerize on Mac/Windows), zero drift between calibration and production (same code in both), zero installation on the caregiver's machine. The decision already records the condition for it to hold: **Chromium, visible tab, Wake Lock active** — and the explicit cost that "always-on" comes to mean "as long as the tab is alive and rendering".
- **ADR-008 (proposed, 2026-08-25):** the "station" that runs detection authenticates as a **DEVICE** (`POST /oauth2/token/device`, scope `edge.device` only), never as a user or `PATIENT` role — an explicit decision (D1), with ADR-008 itself rejecting the idea of a human `PATIENT` role for the same reason cited in the briefing (the patient does not authenticate). Pairing already exists in EDGE and the coordinator performs the enrollment once; after that the station lives on its own credential. D5 requires Wake Lock + `visibilitychange` + a visible heartbeat watchdog — "detection silently stopped is the worst failure mode of this product".

That is: **the patient's mobile phone is technically not a new case — it is one more instance of the "station" pattern that ADR-007/008 already formalized**, with one relevant platform difference that ADR-007 had already anticipated as a risk (see Consequences: "does not hold if always-on has to run on the caregiver's general-use notebook, which closes the lid and switches tabs" — the patient's phone shares that same risk, aggravated).

## Options considered

### Option 1 — Mobile phone as one more "station" (same ADR-007/008 pattern), restricted to Android/Chromium

The phone runs the same browser-based detector from ADR-007, authenticates as a device (same model as ADR-008 D1), and reuses the existing EDGE pairing with no flow of its own. Platform restriction: **Android with Chromium**, because the guarantee of background capture (`MediaStreamTrackProcessor`/WebCodecs, when needed) only exists in Chromium — iOS/Safari cannot sustain it.

- **Advantages:**
  - Zero new pipeline to build — reuses 100% of the detection engine already decided and (partially) implemented
  - Reuses the existing EDGE pairing without designing a provisioning flow of its own for the detection part
  - Consistent with D1 of ADR-008: device token, never patient identity, for the GEST part
- **Disadvantages:**
  - Inherits — aggravated — the risk that ADR-007 itself recorded as the "worst failure mode": a phone has more aggressive OS screen locking than a dedicated PC, app switching is more frequent than tab switching on desktop, and the "visible tab" guarantee is more fragile on a device that the family carries/uses for other things
  - Restricts the pilot to Android — excludes iPhone as a viable option until there is real background-capture support on iOS/Safari
- **Cost:** low on pipeline (reuses ADR-007/008 almost entirely); medium on operational risk (a watchdog and clear communication to the user about the fragility are mandatory, not optional)

### Option 2 — Dedicated mobile pipeline (native app or dedicated wrapper)

Build a native solution (e.g. an Android/iOS app with real background camera access via system APIs) to work around browser limitations in the background.

- **Advantages:** more reliable background capture, possible iOS support
- **Disadvantages:** directly contradicts the decision of ADR-007 (which rejected a native pipeline for maintenance, OS parity and drift reasons); reintroduces the problem of multiple detection engines that ADR-007 eliminated; high development cost for a 1-patient pilot
- **Cost:** high — new maintenance surface, risk of reintroducing drift between engines

## Decision

**Closed: Option 1.** The patient's mobile phone is treated as one more "station" in the same model as ADR-007 (browser engine) and ADR-008 (device identity, EDGE pairing reused with no flow of its own) — restricted, in the pilot, to **Android with Chromium**. iOS is out of scope until `MediaStreamTrackProcessor`/WebCodecs (or equivalent) has real support in Safari.

**Answer to briefing question 7:** YES, it reuses the existing pairing flow — but only for the **detection** part (GEST). The **interaction** part (CONV, navigating the speech tree) uses a **separate** flow: the "Patient with session" session of ADR-012, provisioned by the caregiver. These are two independent flows coexisting on the same device — one device flow (`edge.device` token, reused from EDGE), one person-session flow (new actor from ADR-012, CONV/GEST-report scope). See ADR-012 and the RBAC decision below.

## Rationale

Not reopening ADR-007/008 is the whole point: those decisions already weighed the trade-offs of a native vs. browser engine and concluded that a single browser engine is the right choice for this product (zero drift, zero installation, OS parity). Treating the phone as one more station, rather than inventing a third path, avoids reopening an already validated decision — the only real adjustment is the platform restriction (Android/Chromium), which is a direct and already expected consequence of the conditions that ADR-007 itself recorded for "always-on" to hold.

## How to reverse if the decision proves wrong

Low reversal cost for the pairing-reuse decision (it is reuse of an existing flow, not a new build to undo). If the Android/Chromium restriction proves blocking in practice (e.g. the family only has an iPhone), the fallback is to re-evaluate Option 2 (native pipeline) specifically for that case, without having to undo anything that already runs on Android.

## Signals that it is wrong

- The watchdog reports stopped detection at an unacceptable frequency in real home use (screen lock, app switching) — a sign that the "Chromium + visible tab" restriction is not sustainable outside a dedicated device.
- A real need for iOS support appears before there is a viable technical path in Safari — in that case Option 2 must be reopened for that specific case.

## TODO[architect]

The approach decision (Option 1, mobile phone = Android/Chromium station) and the pairing-reuse decision are closed. Remaining: (1) confirm that the watchdog of ADR-008 D5 (missing heartbeat → "device offline" on the dashboard) is sufficiently visible in the patient's context of use too, not only the caregiver's; (2) assess the battery/resource impact of MediaPipe running continuously on mobile hardware (not tested on the dedicated PC of ADR-007/008); (3) design the coexistence of the two simultaneous credentials in the same app (device token + patient session from ADR-012) — see the RBAC decision consolidated in `technical-framing.md` §12 (question 3).
