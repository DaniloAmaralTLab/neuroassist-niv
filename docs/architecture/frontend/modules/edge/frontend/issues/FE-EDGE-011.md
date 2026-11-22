## [FE-EDGE-011] DevicePairingPageComponent — smart OnPush, feature-device-pairing route

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`DevicePairingPageComponent` is the smart container for the pairing flow: it reads `DeviceFacade.pairingVm()` signal, dispatches `pairRequested` to the facade's `beginPairing()`, and renders `DevicePairingPanelComponent` with the latest VM.

**Context / Problem statement:**
- SPEC-02 §1 defines the smart component tree; the page component is the only facade consumer in this feature.
- `canPair` comes from `AccessDecisionService.can('edge.device.pair')` (SPEC-05 §4), not from role inspection.
- The page hosts three embed contexts: the route `/patients/:patientId/device/pair`, onboarding wizard step 3, and Screen 07 phone-activation device portion — `DevicePairingPanelComponent` (FE-EDGE-012) is the shared presentational in all three.
- Bloqueia: FE-EDGE-012

**Approach (execution path):**
1. Create `libs/edge/feature-device-pairing/src/lib/device-pairing-page/device-pairing-page.component.ts` as `standalone: true`, `changeDetection: OnPush`.
2. Inject `DeviceFacade` and `AccessDecisionService`; expose `pairingVm = this.deviceFacade.pairingVm()` and `canPair = this.access.can('edge.device.pair')`.
3. Handle `pairRequested` output from the panel: call `this.deviceFacade.beginPairing(patientId)`.
4. Handle `retryRequested` output: call `this.deviceFacade.retryPairing()`.
5. Create `libs/edge/feature-device-pairing/src/lib/device-pairing.routes.ts` exporting the lazy route for `/device/pair`.
6. Add unit test: `pairRequested` output calls `DeviceFacade.beginPairing`.

**Non-goals:**
- No `HttpClient` injection in this component.
- No inline role check — only `can('edge.device.pair')` from `AccessDecisionService`.

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-pairing/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-01-route-map.md` (§1)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib**
- 🔲 `libs/edge/feature-device-pairing/src/lib/device-pairing-page/device-pairing-page.component.ts`
- 🔲 `libs/edge/feature-device-pairing/src/lib/device-pairing.routes.ts`

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
- `pairingVm` is derived from `DeviceFacade.pairingVm()` signal (no local state copy).
- `pairRequested` output dispatches to `DeviceFacade.beginPairing`.
- No `HttpClient` injected; no role string evaluated inline.
- `npx nx test edge-feature-device-pairing` PASS

**Dependencies:**
- FE-EDGE-009 (DeviceFacade)
- INT-FE-EDGE-004 (AccessDecisionService.can wired)

**Data impact:**
Nenhum

**API / Contract impact:**
- Triggers `POST /edge/devices` via facade (api-contract §2.1)

**Testing / Evidence required:**
- Component test: mock facade, trigger `pairRequested`, assert `beginPairing` called with the route's `patientId`.

**Risks / Notes:**
- `patientId` must be read from the activated route params (`ActivatedRoute`), not from a component input, to work correctly in all three embed contexts.
