# SPEC-08 — E2E Scenarios — edge (EDGE) Frontend

> Gherkin scenarios for `apps/edge-e2e` (Playwright). Each scenario below becomes a `Scenario:` in a
> `.feature` under `../e2e/`. Scenarios are authored in **English** — the FE stub generator parses
> English Gherkin only (carry-forward `fe_nx_register_module_parses_only_english_gherkin`).
> Scenarios share domain nouns with the EARS acceptance statements in SPEC-01..07 so the
> EARS-coverage matcher (`fe-ears-coverage.py`) can pair them. This SPEC has no EARS section.

## 1. Feature files

| `.feature` | Covers | Primary EARS source |
|---|---|---|
| `pair-edge-device.feature` | onboarding step 3: enroll → pairing code → poll → paired (pessimistic); already-paired; timeout | SPEC-01, SPEC-03, SPEC-04, SPEC-07 |
| `pair-patient-phone.feature` | Screen 07 device portion: platform block; EDGE/ACS seam (device vs session) | SPEC-03, SPEC-04, SPEC-05, SPEC-07 |
| `device-status-badge.feature` | topbar + Home card: online / offline amber / status-unavailable; server-derived liveness; **detection state distinct from connectivity (detecting / connected-not-detecting+reason)** | SPEC-02, SPEC-03, SPEC-06 |
| `device-lifecycle.feature` | unpair / deactivate / reactivate / revoke; terminal revoke; RBAC | SPEC-03, SPEC-04, SPEC-05, SPEC-07 |
| `edge-navigation.feature` | routes / guards / lazy-loading | SPEC-01 |
| `station-detection-liveness.feature` | **SAFETY-GEST-1 single station heartbeat sender: StationLivenessPort, ≤30s cadence, beatNow on transition, keepalive beat on hidden, token rotation, no sendBeacon, no second sender** | SPEC-04, SPEC-06 |

## 2. Scenario inventory

### pair-edge-device
- When the coordinator begins pairing, enroll the device and display the pairing code once.
- While a device is awaiting claim, poll the device read and mark it paired only when the read returns paired.
- Keep pairing pessimistic: the paired confirmation appears only after the server read confirms.
- While a patient already has a paired device, show the existing device and offer no second pair.
- If the station never claims the pairing code before it expires, set the pairing state to error with retry guidance.
- Do not call the device pairing claim endpoint from the dashboard.
- Hide the "Pair device" action when the session lacks `edge.device.pair`.

### pair-patient-phone
- If the patient phone is not Android or Chromium, block pairing with the platform-unsupported notice.
- The EDGE/ACS seam: EDGE pairs the device while ACS provisions the patient session as separate steps.
- Reuse the device-pairing panel for the phone-activation device portion.

### device-status-badge
- Keep the topbar device-status badge visible on every dashboard screen.
- While a paired device is online, render the online badge.
- While a paired device is offline, render the amber offline badge and do not escalate it to an alarm.
- While the device read is unavailable, render the status-unavailable state and not a defaulted online badge.
- Read connectivity from the backend projection and do not infer online or offline from a client timer.
- While a device has no version field from the backend, omit the version line and render no placeholder.
- While a paired online device detection state is RUNNING, render the detecting state (SAFETY-GEST-1).
- While a paired online device is not detecting (PAUSED/DEGRADED/UNAVAILABLE/UNKNOWN), render the connected-but-not-detecting warning with its reason and not as detecting.
- While a device is offline, render the offline state and not a detecting state regardless of the last reported detection state.
- While a device read omits the detection state, treat it as unknown and not detecting.
- Render detection state distinct from connectivity and do not compute it from a client timer.

### station-detection-liveness (SAFETY-GEST-1)
- Provide a single station-liveness sender in libs/edge implementing StationLivenessPort and open no second heartbeat sender.
- When setDetectionState is called, carry it on the next heartbeat and never report RUNNING without a pushed state.
- When beatNow is called, send an immediate out-of-cadence heartbeat carrying the last pushed state.
- Send the periodic heartbeat on a cadence at or below thirty seconds so a dropped beat is not a lapse.
- When the detection state transitions, send an immediate heartbeat with the new state plus the periodic cadence.
- When the station transitions to hidden, send the final heartbeat with a keepalive fetch and not navigator.sendBeacon.
- When a heartbeat response carries a refreshed edge-device token, rotate the stored station token.
- Send the heartbeat only from the libs/edge sender and not from the caregiver dashboard.
- Mirror the detection fields from the device read and do not fabricate them when absent.

### device-lifecycle
- When the caregiver confirms an unpair, send the unpair request and await the server before removing the device.
- When the caregiver confirms a revoke, send the revoke request and await the server before marking the device revoked.
- While a device is revoked, hide the reactivate action.
- If a reactivate targets a revoked device, show a modal that a revoked device requires a new enroll and pair.
- Disable the unpair action when the session lacks `edge.device.unpair`.
- Disable the revoke action when the session lacks `edge.device.revoke`.

### edge-navigation
- When a caregiver navigates to the device route, render the edge-device status page for that patient.
- If the session is absent on an EDGE route, redirect to login and render no EDGE device surface.
- If the read guard denies the device route, redirect to the forbidden route and do not load the status feature.
- If the pair guard denies the pair route, redirect to the forbidden route and do not load the pairing feature.
- Load every EDGE feature route lazily and do not eager-bundle a feature library into the shell.

## 3. Stub-integrity rule (carry-forward, Learning ev=45 on acs-e2e)

Generated Playwright stubs MUST fail explicitly until implemented — `test.fixme()` or
`throw new Error('TODO[<ISSUE>]: implement')` — and MUST NOT use a vacuous
`await expect(page).toHaveURL(/.*/)` under `test.skip`. RBAC scenarios seed the authority via the
session mechanism the shell reads (sessionStorage / refresh endpoint — `fe-e2e:auth`), not an
unrelated header (`fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`). Each spec resets
its own seed to avoid state leak across specs (`fe-e2e:shared-seed:state-leak-across-specs`).
