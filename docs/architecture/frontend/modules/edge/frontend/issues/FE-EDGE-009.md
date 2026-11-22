## [FE-EDGE-009] DeviceFacade — signals for DeviceStatusVM, DevicePairingVM, DeviceLifecycleVM + pairing poll

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`DeviceFacade` exposes three `.asReadonly()` signals consumed by smart components, orchestrates the pessimistic pairing poll (until `lifecycleState=paired`), and provides a `reset()` method used by the bootstrap destroy hook.

**Context / Problem statement:**
- SPEC-05 §4 (data-flow) and SPEC-04 §4 specify pessimistic pairing: `pairing='paired'` is set ONLY after `GET /edge/devices/{id}` returns `lifecycleState='paired'`.
- Liveness is **pull**: the facade reads the server's heartbeat projection; no client-side timer infers online/offline (ADR-005).
- `DeviceFacade` is the only holder of `EdgeDeviceApiService`; components never inject `HttpClient` directly (SPEC-02 §4).
- The facade exposes `signal<T>` private + `.asReadonly()` — no public writable signals.
- Bloqueia: FE-EDGE-011, FE-EDGE-014

**Approach (execution path):**
1. Create `libs/edge/data-access/src/lib/device.facade.ts` with private `WritableSignal`s for `statusVm`, `pairingVm`, and `lifecycleVm`.
2. Expose `.asReadonly()` versions; expose `loading` as a `computed()` derived from the loading state.
3. Implement `loadDeviceStatus(patientId)` calling `EdgeDeviceApiService.list()` then `.get()` to build `DeviceStatusVM`; set `badge` per rules in SPEC-03 §1.
4. Implement `beginPairing(patientId)` calling `enroll`, populating `pairingCode`/`pairingCodeExpiresAt`, entering `pairing='pairing'`; then poll `get(deviceId)` every N seconds until `lifecycleState='paired'` OR `pairingCodeExpiresAt` has passed → set `pairing='error'`.
5. Implement lifecycle actions: `reactivate`, `deactivate`, `unpair`, `revoke` — each pessimistic (await response before updating signal).
6. Implement `reset()` that resets all signals to their initial empty state (called by bootstrap destroy).
7. Implement `invalidate()` that clears the device read-model on tenant switch (INT-FE-EDGE-002).

**Non-goals:**
- Do not compute `status='online'` from a `Date.now()` difference — only from the wire `connectivity` field (ADR-005).
- Do not set `pairing='paired'` after the enroll `201` — only after a poll confirms `lifecycleState='paired'`.

**Layer(s):**
frontend / Data access — `libs/edge/data-access/src/lib/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§4)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§1–§3)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Data access lib**
- 🔲 `libs/edge/data-access/src/lib/device.facade.ts`

**Tests**
- 🔲 `npx nx test edge-data-access` PASS
- 🔲 `npx nx lint edge-data-access` PASS

**Milestone:**
Wave 2 / P2 Data Access

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P2

**Acceptance criteria:**
- `pairingVm().pairing` transitions to `'paired'` only after `loadDeviceStatus` returns `lifecycleState='paired'`.
- `pairingVm().pairing` transitions to `'error'` when the poll expires without a claim.
- `statusVm().badge` is `'unavailable'` when `device===null` or `lifecycleState !== 'paired'`.
- `reset()` sets all signals to empty/initial values.
- No signal is exposed as writable from outside the facade.
- `npx nx test edge-data-access` PASS

**Dependencies:**
- FE-EDGE-007 (EdgeDeviceApiService)
- FE-EDGE-008 (wire types and mappers)

**Data impact:**
Nenhum

**API / Contract impact:**
- Pairing poll calls `GET /edge/devices/{id}` repeatedly — BE must support idempotent reads

**Testing / Evidence required:**
- Facade unit test with mock service: pairing poll resolves to `'paired'` on 3rd tick; to `'error'` when expiry passes.

**Risks / Notes:**
- Poll interval should be configurable (inject token or environment variable) to avoid hardcoded magic numbers.
