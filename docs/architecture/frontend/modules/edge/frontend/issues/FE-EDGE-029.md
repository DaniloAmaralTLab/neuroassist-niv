## [FE-EDGE-029] Caregiver surfaces render detection distinct from connectivity (badge + card + status page)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`DeviceStatusBadge` (topbar), the Home `EdgeDeviceCard`, and the device-status page render the
`DeviceStatusVM.detection` axis as a signal **distinct** from connectivity, per the SPEC-03 §1.1 matrix:
online + RUNNING = "detecting"; online + PAUSED/DEGRADED/UNAVAILABLE/UNKNOWN = "connected, NOT
detecting" (amber warning + reason); offline = "offline"; read failed/absent = "status unavailable".
Liveness stays server-derived (no client timers); the not-detecting warning never escalates to an alarm.

**Context / Problem statement:**
- SPEC-03 §1.1 (new matrix) + SPEC-07 §3 (detection warning is not an error, not an alarm).
- Permission unchanged: all three surfaces stay gated by `edge.device.read` (SPEC-05 — no new key).
- Depends on FE-EDGE-028 (VM/derivation).

**Approach (execution path):**
1) Extend `DeviceStatusBadge` (`libs/edge/ui`) to show detecting / connected-not-detecting (amber +
   reason) / offline / unavailable, driven only by `DeviceStatusVM.detection` + `detectionReason`.
2) Extend `EdgeDeviceCardComponent` + the device-status page (`libs/edge/feature-device-status`) with a
   detection-state line (reason text WHERE present; `lastDetectingRelative` display-only).
3) Map `detectionReason` to user copy (English): camera blocked / low frame rate / etc.; generic
   "not detecting" when null.

**Non-goals:**
- Does NOT compute detection client-side; does NOT add escalation/alarm (server-owned EDGE→EVNT).
- Does NOT change the permission map.

**Layer(s):**
frontend / UI + Feature lib — `libs/edge/ui/`, `libs/edge/feature-device-status/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§1.1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-07-error-handling.md` (§3)

**Architecture alignment:**
- Standalone + OnPush + Signals; presentational consumes inputs, no `HttpClient`
- a11y: amber warning has an aria-live note; detection text is not colour-only (carry-forward `fe-component:a11y-live-region`)
- Tag Nx: `scope:edge`, `type:feature`/`type:ui`

**Implementation checklist (by file)**

**Lib path**
- 🔲 `libs/edge/ui/src/lib/device-status-badge/device-status-badge.component.ts` (detection axis)
- 🔲 `libs/edge/feature-device-status/src/lib/device-card/edge-device-card.component.ts` (detection line + reason)
- 🔲 `libs/edge/feature-device-status/src/lib/status-page/edge-device-status-page.component.ts` (detection section)

**Tests**
- 🔲 `nx test edge-ui` PASS (badge renders each §1.1 state; offline dominates; absent → not detecting)
- 🔲 `nx test edge-feature-device-status` PASS (card + page detection line + reason + no-alarm)
- 🔲 `nx lint edge-ui` / `nx lint edge-feature-device-status` PASS

**Milestone:**
Wave 7 / UX polish (SAFETY-GEST-1 increment)

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P7

**Acceptance criteria:**
- `npx nx test edge-ui` and `npx nx test edge-feature-device-status` PASS for every §1.1 matrix row
- `npx nx lint` PASS on both
- `npx nx build edge` PASS
- A test asserts the not-detecting surface is an amber warning and never the EVNT alarm.

**Dependencies:**
- FE-EDGE-028 (detection VM + derivation)
- FE-EDGE-016 (DeviceStatusBadge base), FE-EDGE-015 (card base)

**Data impact:**
- Nenhum

**API / Contract impact:**
- Consumes the device read detection fields (BE §2.3) via the facade; no new endpoint.

**Testing / Evidence required:**
- Screenshots of the four detection states (detecting / not-detecting+reason / offline / unavailable).

**Risks / Notes:**
- Keep "offline" visually distinct from "connected, NOT detecting" — both are amber but mean different things; the copy must disambiguate.
