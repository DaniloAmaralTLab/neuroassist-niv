## [FE-EDGE-012] DevicePairingPanelComponent + sub-components (presentational sub-tree)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`DevicePairingPanelComponent` and its four presentational children (`PairingCodeDisplayComponent`, `PairingProgressComponent`, `ExistingDeviceNoticeComponent`, `DeviceStatusBadge`) are implemented as pure presentational components (inputs in, outputs out, no injected facade or HttpClient).

**Context / Problem statement:**
- SPEC-02 §1 defines the component tree; the panel is reused in three contexts (route /pair, wizard step 3, Screen 07 mode=phone).
- The panel never shows `'paired'` until the facade reports it (pessimistic — SPEC-04 §4).
- `ExistingDeviceNoticeComponent` is shown when the patient already has a paired device — no second pair offered.
- `PairingCodeDisplayComponent` shows the code + countdown; code is never re-fetched (shown once — INV-EDGE-3).
- Bloqueia: FE-EDGE-021 (countdown detail), FE-EDGE-013 (phone mode uses this panel)

**Approach (execution path):**
1. Create `DevicePairingPanelComponent` with inputs: `vm: DevicePairingVM`, `mode: 'station'|'phone'`; outputs: `pairRequested`, `retryRequested`.
2. Conditionally render `ExistingDeviceNoticeComponent` WHILE `vm.existingDevice` is set (no pair CTA shown).
3. Conditionally render `PairingCodeDisplayComponent` WHILE `vm.pairing === 'pairing'` (never re-renders after `'paired'`).
4. Create `PairingCodeDisplayComponent` with inputs `code: string`, `expiresAt: string`; renders code + countdown.
5. Create `PairingProgressComponent` with input `pairing: 'idle'|'pairing'|'paired'|'error'`; renders progress state.
6. Create `ExistingDeviceNoticeComponent` with input `existingDevice: EdgeDeviceVM`.
7. `PlatformUnsupportedNoticeComponent` is part of FE-EDGE-013 (phone-mode concern).

**Non-goals:**
- No `HttpClient`, no facade injection in any presentational component.
- Do not set `pairing='paired'` in the panel — that is derived from VM input.

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-pairing/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§2)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib**
- 🔲 `libs/edge/feature-device-pairing/src/lib/device-pairing-panel/device-pairing-panel.component.ts`
- 🔲 `libs/edge/feature-device-pairing/src/lib/pairing-code-display/pairing-code-display.component.ts`
- 🔲 `libs/edge/feature-device-pairing/src/lib/pairing-progress/pairing-progress.component.ts`
- 🔲 `libs/edge/feature-device-pairing/src/lib/existing-device-notice/existing-device-notice.component.ts`

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
- `DevicePairingPanelComponent` has no injected service or `HttpClient`.
- `ExistingDeviceNoticeComponent` is shown WHILE `vm.existingDevice !== null` and no pair CTA is offered.
- Pairing code is NOT shown after `vm.pairing === 'paired'`.
- `npx nx test edge-feature-device-pairing` PASS

**Dependencies:**
- FE-EDGE-011 (page component hosts the panel)
- FE-EDGE-016 (DeviceStatusBadge used inside the panel tree)

**Data impact:**
Nenhum

**API / Contract impact:**
- `PairingCodeDisplayComponent` renders `EnrollResultWire.pairingCode` (returned once from POST /edge/devices)

**Testing / Evidence required:**
- Component test: `vm.existingDevice` set → pair CTA absent; `vm.pairing='pairing'` → code shown; `vm.pairing='paired'` → code hidden.

**Risks / Notes:**
- The pairing code must be treated as a one-time display token; the component must not cache it in component state beyond the render cycle.
