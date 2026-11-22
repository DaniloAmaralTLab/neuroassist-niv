## [FE-EDGE-020] Loading + status-unavailable + error states for badge and status page

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
Badge skeleton renders WHILE `DeviceStatusVM.loading = true`; status-unavailable state renders WHILE `device = null` (never a defaulted "online"); banner error with Retry affordance renders when the status read fails; offline device renders amber (never danger/alarm).

**Context / Problem statement:**
- SPEC-03 §1 defines the `loading`, `badge`, and `device=null` invariants.
- SPEC-07 §2.1 defines `status_unavailable` as a client-rendered state when `edge-service` is unreachable — the badge renders "Status unavailable" in ink-faint, never defaults to "online" (ADR-005).
- SPEC-07 §3 defines the toast/banner/modal criteria: a device read failure → banner with Retry, not a toast.
- Offline is amber warning (SPEC-02 §3), never a danger state — that escalation belongs to EVNT.
- Bloqueia: none (polish layer on top of FE-EDGE-014/016)

**Approach (execution path):**
1. In `EdgeDeviceStatusPageComponent` (FE-EDGE-014): add `@if (statusVm().loading)` → show skeleton.
2. Add `@if (!statusVm().loading && !statusVm().device)` → show banner with Retry that calls `loadDeviceStatus(patientId)`.
3. In `DeviceStatusBadge` (FE-EDGE-016): bind CSS token classes to `status` input for all 3 states; ensure `'unavailable'` does not apply the success class.
4. When `edge-service` is unreachable (network error), catch in facade → set `statusVm().device = null` and `badge = 'unavailable'` (not `'online'`).
5. Ensure `'offline'` state applies the warning/amber token, not the danger token.

**Non-goals:**
- Do not add automatic retry on failure — only a manual Retry affordance (SPEC-07 §4).
- Do not map `status=null` to `'online'` at any layer.

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-status/` + `libs/edge/ui/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-07-error-handling.md` (§2.1, §3, §4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib / UI lib**
- 🔲 `libs/edge/feature-device-status/src/lib/edge-device-status-page/edge-device-status-page.component.ts` (loading + banner states)
- 🔲 `libs/edge/ui/src/lib/device-status-badge/device-status-badge.component.ts` (unavailable state)

**Tests**
- 🔲 `npx nx test edge-feature-device-status` PASS
- 🔲 `npx nx lint edge-feature-device-status` PASS

**Milestone:**
Wave 7 / P7 UX Polish

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P7

**Acceptance criteria:**
- `loading=true` → badge skeleton shown, no connectivity label.
- `device=null` → "Status unavailable" in ink-faint, no "Device online".
- `badge='offline'` → amber warning, NOT danger class.
- Network error → `badge='unavailable'`, never `'online'`.
- Manual Retry affordance present on the banner.
- `npx nx test edge-feature-device-status` PASS

**Dependencies:**
- FE-EDGE-014 (status page hosts these states)
- FE-EDGE-016 (badge renders the states)

**Data impact:**
Nenhum

**API / Contract impact:**
- Network error on `GET /edge/devices/{id}` must be caught and mapped to unavailable, not propagated as an unhandled exception

**Testing / Evidence required:**
- Component test: facade emits `loading=true` → skeleton; emits `device=null` → banner with Retry.

**Risks / Notes:**
- The skeleton must have a fixed layout size matching the loaded badge to avoid CLS (SPEC-02 §3 / doc 02 §5).
