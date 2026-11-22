# SPEC-08 — E2E Scenarios — gest (GEST) Frontend

> Gherkin scenarios for `apps/gest-e2e` (Playwright), run with a **fake `getUserMedia`** and a **stub
> classifier** (deterministic recognition; no real model in CI — doc 04 §1). Each scenario below
> becomes a `Scenario:` in a `.feature` under `../e2e/`. Scenarios are authored in **English** — the
> FE stub generator parses English Gherkin only
> (carry-forward `fe_nx_register_module_parses_only_english_gherkin`). Scenarios share domain nouns
> with the EARS statements in SPEC-01..07 + SPEC-09 so the EARS-coverage matcher (`fe-ears-coverage.py`)
> can pair them. This SPEC has no EARS section.

## 1. Feature files

| `.feature` | Covers | Primary EARS source |
|---|---|---|
| `recognise-and-report.feature` | golden path A: detect (simple + compound) → mint `reportId` → `POST /evnt/gesture-reports` → `201`; exactly-once `200` replay; detectable gate (INV-GEST-7) blocks a non-detectable command | SPEC-03, SPEC-04 |
| `offline-queue-and-retry.feature` | golden path B: durable queue across network gap + reload; `reportId` reuse; `503 Retry-After`; `>24h` expired; `401`/`403` stop | SPEC-04, SPEC-07 |
| `station-detection-liveness.feature` | Wake Lock acquire/re-acquire; backgrounded → paused; fps/thermal → degraded; kiosk requirement; EDGE-heartbeat propagation; honest never-watching; **SAFETY-GEST-1**: `StationRuntimeVM`→`detectionState` enum mapping, never-false-RUNNING, hidden→PAUSED/HIDDEN, camera→UNAVAILABLE/CAMERA_DENIED, model→UNAVAILABLE/MODEL_FAILED, low-fps→DEGRADED/LOW_FPS, single EDGE sender + liveness port, periodic cadence + immediate transition beat + keepalive on hidden, caregiver alert after lapse, powered-off hole | SPEC-03, SPEC-06, SPEC-09 |
| `privacy-zero-egress.feature` | zero video/landmark egress by network inspection; only `commandId` + metadata leaves; camera off on teardown | SPEC-09 |
| `station-identity-and-runtime.feature` | routes / `stationIdentityGuard` (edge.device) / lazy-loading; station-unpaired on `401`; no caregiver `gest.*` guard | SPEC-01, SPEC-05 |

## 2. Scenario inventory

### recognise-and-report
- When a simple command is recognised within its duration window at confidence above the sensitivity threshold, mint a reportId and POST the gesture report to EVNT.
- When a compound command's primary then secondary primitive complete inside the window, report exactly one gesture report.
- When a compound's secondary primitive never arrives before the max duration, reset to idle and report nothing.
- When EVNT returns 200 for a replayed reportId, treat the report as delivered exactly once and create no duplicate.
- While a command's primitive codes are not all detectable for the running engine version, mark it "not yet detectable" and never arm it for recognition.
- When the station loads its catalog, call support-check for the running engine version and treat an absent row as not detectable.

### offline-queue-and-retry
- While the station is offline, enqueue each recognition in a durable store that survives reload.
- When connectivity returns, drain the queue with backoff and reuse the original reportId on every attempt.
- If EVNT returns 503 catalog-unavailable with Retry-After, reschedule the queued report after the header delay and do not drop it.
- If a queued report is older than 24 hours or EVNT returns occurred-at-out-of-bounds, mark it expired and surface "report expired, not delivered".
- If EVNT returns 401 or 403 on the report path, stop reporting and render the station-unpaired state and do not retry the dead token.
- Hold a report in sending until EVNT confirms 201 or 200 and never mark it sent optimistically.

### station-detection-liveness
- When detection starts with camera granted and model ready, acquire the Screen Wake Lock.
- When the tab becomes visible after being hidden, re-acquire the Wake Lock and resume the loop.
- While the tab is hidden, render the always-visible detection-paused state and never a running state.
- While sustained fps is below the budget, render the detection-degraded state and do not report detection as running.
- Propagate station liveness to caregivers through the EDGE heartbeat and invent no GEST liveness endpoint.
- Require the station to run as a foregrounded kiosk tab and surface the keep-in-foreground requirement.
- (SAFETY-GEST-1) Map the station runtime to the EDGE detectionState enum (Scenario Outline; quoted placeholders feed Cucumber {string}).
- Report RUNNING only while the loop produces frames at an acceptable fps; never report RUNNING otherwise.
- Map hidden→PAUSED/HIDDEN, denied camera→UNAVAILABLE/CAMERA_DENIED, failed model→UNAVAILABLE/MODEL_FAILED, low fps→DEGRADED/LOW_FPS, initializing→UNAVAILABLE.
- Send the heartbeat from the single EDGE liveness sender (never a second GEST sender); publish state via the station-liveness port with no fourth network call.
- Send a periodic beat below the lapse window, an immediate beat on every transition, and a keepalive beat on hidden.
- Carry detectionState on the heartbeat; alert caregivers after the lapse via EDGE→EVNT; a powered-off station's stopped heartbeat still trips the lapse.

### privacy-zero-egress
- Across a full recognise-and-report cycle, emit zero bytes of video or landmark data by network inspection.
- Emit over the network only the recognised commandId and non-identifying report metadata, the support-check code set, and the catalog read.
- Confine frames and landmarks to the detection worker and discard them each tick.
- When the runtime is torn down, stop every camera track and leave the camera inactive.

### station-identity-and-runtime
- When the Patient-Mode host navigates to the runtime route with a valid station identity, mount the detection runtime without a breadcrumb.
- When the operator navigates to the status route with a valid station identity, render the on-station detection-status surface.
- If the station identity is absent or revoked, route to the station-unpaired state and do not start the detection loop.
- Gate the runtime and status routes by the edge.device station identity and never evaluate a caregiver gest.runtime or gest.diagnostics authority.
- Load every GEST feature route lazily and do not eager-bundle a feature library into the host shell.

## 3. Stub-integrity rule (carry-forward, Learning ev=45 on acs-e2e)

Generated Playwright stubs MUST fail explicitly until implemented — `test.fixme()` or
`throw new Error('TODO[<ISSUE>]: implement')` — and MUST NOT use a vacuous
`await expect(page).toHaveURL(/.*/)` under `test.skip`. The station identity is seeded via the
`edge.device` token mechanism the host reads (sessionStorage / device-token provider — `fe-e2e:auth`),
not an unrelated header (`fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`).
`getUserMedia` is faked and the classifier is stubbed for deterministic recognition; each spec resets
its own seed to avoid state leak across specs (`fe-e2e:shared-seed:state-leak-across-specs`).
