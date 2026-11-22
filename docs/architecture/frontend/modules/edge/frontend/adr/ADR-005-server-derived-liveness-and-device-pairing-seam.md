# ADR-005 (module-local, EDGE) — Server-derived device liveness and the device-pairing seam with the ACS session

- **Status:** proposed (2026-11-19)
- **Scope:** the EDGE frontend module (`@neuroassist/edge`) — `feature-device-pairing`,
  `feature-device-status`, `libs/edge/data-access`, `libs/edge/ui` (`DeviceStatusBadge`), and the FE
  contract EDGE exposes to the Shell, Home, GEST and ACS. Module-local record — does not occupy the
  reserved shared ADR-005 slot (design tokens); see this folder's `adr/README.md`.

## Context

NeuroAssist NIV's central promise is that a caregiver can tell, within two seconds, whether the patient
is OK — which is only trustworthy if they can also tell whether the **detector is alive**. The product
principles make device connectivity a first-class, **never-hidden** signal (Principle 2.6; wireframe
§0.6 "Device connectivity status is never hidden"; §3.2.B topbar badge). Three forces shape EDGE's
frontend:

- **Liveness is a safety signal, not a convenience.** A false "online" (e.g. defaulting to online when
  the backend is unreachable, or inferring online from a stale `lastSyncAt` on a client timer) would let
  a caregiver trust a dead detector. The prototype already reads `EdgeDevice.status`/`lastSyncAt` from a
  facade and renders an amber badge when offline — and deliberately does **not** turn an offline device
  into an alarm (the full-screen alarm is reserved for `HELP_REQUESTED`).
- **Pairing shares a screen with the ACS session.** Screen 07 (patient-phone activation) puts
  **device pairing** (reuse the device-identity model, ADR-014 — "pair mobile phone as an edge device")
  right next to **PatientSession** provisioning/revocation (ADR-012 / SEC-001, ACS-owned). The device
  is one concern; the persistent session is another. ADR-014 itself states the phone carries **two
  independent identities** — an `edge.device` token (for GEST) and the patient session (for CONV) — on
  one device, via two separate flows.
- **The BE is not there yet.** `edge-service` is declared but not architected; the pairing/claim and
  heartbeat contracts are provisional.

The frontend must decide **where liveness is computed**, **how pairing is surfaced**, and **what EDGE
does not own** on the shared screen.

## Decision

1. **Liveness is server-derived; the FE renders, never computes it.** `EdgeDevice.status`
   (`online | offline`) and `lastSyncAt` come from the `edge-service` heartbeat projection. The FE may
   render a display-only relative time ("synced 3 min ago") but **never** synthesizes "offline" from a
   client-side timer or stale timestamp. When `edge-service` is unreachable the badge shows
   **"status unavailable"**, never a defaulted "online". An offline device is an **amber** state and
   **never** escalates to the EVNT alarm.
2. **Device connectivity is always visible via a Shell-hosted `DeviceStatusBadge`.** The badge lives in
   `libs/edge/ui`, is fed by the EDGE `DeviceFacade`, and is mounted in the topbar by the Shell
   (§3.2.B). It is the one eager-presentational surface; pairing and lifecycle features stay lazy.
3. **Pairing is a pessimistic server claim flow.** `feature-device-pairing` renders
   `idle → pairing → paired | error`; the UI shows `paired` only after the claim confirms server-side
   (a lead must never hand over a device the backend has not recorded). The same panel is reused in the
   onboarding wizard (Screen 05, step 3) and the device portion of phone activation (Screen 07); when a
   device already exists for the patient it is shown as paired directly (prototype parity), not
   re-simulated.
4. **EDGE owns the device, ACS owns the session — a hard seam on Screen 07.** EDGE renders only the
   device-pairing panel and the device-status read-model. It does **not** render, provision or revoke
   the `PatientSession` (ADR-012/SEC-001 — ACS `feature-patient-sessions`), does not drive the
   "Patient Mode"/runtime-shell decision (ADR-012 §3.2.B — CONV/GEST), and treats the `edge.device`
   identity token as distinct from any caregiver `edge.*` authority (ADR-014). Every EDGE action is
   gated by `AccessDecisionService.can('edge.device.*')`, never a hardcoded guard.

## Alternatives considered

1. **Client-inferred liveness (a FE timer flips to "offline" after N seconds of silence).** Rejected:
   it produces false offline/online across clock skew and tab-sleep, and makes a safety signal depend on
   browser state. Liveness must be the server's single judgment.
2. **A FE WebSocket/live push for heartbeat in v1.** Rejected for v1: adds infra and a second liveness
   source of truth before the BE contract exists; a server read-model pulled on navigation meets the
   "never hidden" requirement for a one-device pilot. A push channel may be added later by SPEC,
   server-adjacent, without moving the judgment to the client.
3. **One combined "activate phone" action owning both device pairing and the patient session.**
   Rejected: it collapses the ADR-014 "two independent identities / two flows" decision, couples EDGE to
   the ACS session lifecycle and SEC-001 revocation, and violates the `scope` boundary (a module owning
   another module's domain). The screen is shared; the ownership is not.
4. **Defaulting `provideEdge` to `http` now (as PAT does).** Rejected: `edge-service` is not yet
   architected, so an `http` default would 404 every screen. The default is `mock` now and flips to
   `http` when the BE lands (carry-forward `scaffold:mock-adapter-default`).

## Consequences

**Positive**

- Device liveness is trustworthy by construction — one server judgment, no client guessing, no false
  "online".
- Connectivity is visible on every screen with zero clicks, satisfying Principle 2.6 / §3.2.B.
- A clean seam on Screen 07: EDGE = device identity/pairing/status, ACS = session lifecycle; neither
  leaks into the other.
- The `mock`-default, mapper-behind-wire setup lets EDGE be built and promoted incrementally and flip to
  `http` without touching features.

**Negative / mitigations**

- The FE contract (`EdgeDeviceWire`, claim/heartbeat endpoints) is provisional until `edge-service` is
  architected (R1). *Mitigation:* every adapter stays behind `toEdgeDevice`; the default adapter is
  `mock` with a providers spec proving the intended default.
- A read-on-navigation cadence can show a slightly stale status between reads (R3). *Mitigation:*
  render `lastSyncAt` honestly ("synced N ago") and refresh on topbar mount; a push cadence is a later
  SPEC, kept server-side.
- The Screen 07 seam and the onboarding wizard chrome ownership still need a SPEC decision (R2/R4).
  *Mitigation:* this ADR fixes EDGE's half of the boundary; the shared step-state contract is deferred
  to Specs.

## References

- `_brief.md` (EDGE) · doc 01 §4–§6, doc 02 §3, doc 03 §4–§5, doc 06 R1–R7.
- Project data model: `EdgeDevice`, `Patient`, `PatientSession` (project-context.json
  `_extensions.data_model`).
- Prototype: `frontend/design-reference/angular-prototype/.../screens/{onboarding,phone-activation,home}`
  + `shell/topbar.component.ts` (`DeviceStatusBadge`).
- Wireframe §0.6 (connectivity never hidden), Screen 01 (Home device card / offline = amber, not alarm),
  Screen 05 (pairing step), Screen 07 (device portion vs. session portion), §3.2.B (topbar badge).
- ADR-014 (patient phone = edge-device instance, Android/Chromium, PLAT-001; two independent identities),
  ADR-012 (PatientSession, Option C — ACS-owned), ACS module ADR-005 (session lifecycle in the caregiver
  shell).
- Shared ADR-006 (module entry as a library). ACS api-contract §0 (JWT tenant derivation; INV-3
  patient-session tokens carry no management authority). Authority vocabulary: canonical English
  `edge.<resource>.<action>` (D-639).
- Learning: `scaffold:mock-adapter-default` (provider default honesty), `guard:stub-permissive`
  (no hardcoded `true` guards).
