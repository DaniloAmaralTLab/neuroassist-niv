## [FE-EDGE-013] PlatformUnsupportedNoticeComponent + phone-mode platform check (PLAT-001)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`PlatformUnsupportedNoticeComponent` renders in `mode='phone'` WHILE the device is not Android or Chromium, blocking the pairing request with an explicit explanation (PLAT-001) — never a silent failure.

**Context / Problem statement:**
- SPEC-02 §1 and SPEC-07 §2.1 describe the platform check: `edge.patient-phone-pairing` feature flag gates Screen 07 device portion; within that screen, an Android/Chromium check runs client-side before any request.
- If the check fails, the panel shows `PlatformUnsupportedNoticeComponent` and does NOT send `POST /edge/devices`.
- `DevicePairingVM.platformSupported` and `DevicePairingVM.error = 'platform_unsupported'` are set by the platform check utility.
- Bloqueia: none (leaf component)

**Approach (execution path):**
1. Create `libs/edge/feature-device-pairing/src/lib/utils/platform-check.ts` exporting `isPlatformSupported(): boolean` (checks for Android user-agent or Chromium via `navigator.userAgent`).
2. Create `PlatformUnsupportedNoticeComponent` as `standalone: true`, `OnPush`, input `visible: boolean`; renders an accessible notice with an explanation of why phone pairing is not available on this device.
3. Add `platformSupported = isPlatformSupported()` check in `DevicePairingPageComponent`; pass to panel; if false, show `PlatformUnsupportedNoticeComponent` and do NOT emit `pairRequested`.
4. Ensure `edge.patient-phone-pairing` feature flag gates the entire phone-mode surface.

**Non-goals:**
- Do not block station-mode pairing on the platform check (only phone mode).
- Do not send any network request when the platform check fails.

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-pairing/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 — PlatformUnsupportedNoticeComponent)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-07-error-handling.md` (§2.1 — platform_unsupported)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-05-tool-contract.md` (§3 — edge.patient-phone-pairing)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib**
- 🔲 `libs/edge/feature-device-pairing/src/lib/platform-unsupported-notice/platform-unsupported-notice.component.ts`
- 🔲 `libs/edge/feature-device-pairing/src/lib/utils/platform-check.ts`

**Tests**
- 🔲 `npx nx test edge-feature-device-pairing` PASS
- 🔲 `npx nx lint edge-feature-device-pairing` PASS

**Milestone:**
Wave 3 / P3 Feature libs

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P3

**Acceptance criteria:**
- In `mode='phone'`, when `isPlatformSupported()` returns `false`, `PlatformUnsupportedNoticeComponent` is visible and no pair request is emitted.
- `platform_unsupported` does NOT result in a network call.
- `npx nx test edge-feature-device-pairing` PASS

**Dependencies:**
- FE-EDGE-012 (panel host renders this component)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum (no request sent on platform-unsupported path)

**Testing / Evidence required:**
- Component test with mocked `navigator.userAgent` for non-Chromium → notice visible, pairRequested not emitted.

**Risks / Notes:**
- `isPlatformSupported()` must be injectable-mockable in tests; avoid direct `navigator` access in components.
