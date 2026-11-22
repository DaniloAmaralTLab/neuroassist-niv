## [FE-EDGE-021] Pairing code countdown — expiry display, single-use, timeout sets pairing=error

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`PairingCodeDisplayComponent` shows the pairing code alongside a live countdown to `pairingCodeExpiresAt`; when the timer expires without a confirmed `'paired'` state, the facade sets `pairing='error'` and the panel renders retry guidance — no half-record remains.

**Context / Problem statement:**
- SPEC-03 §2: `pairingCode` is held transiently for display only; never persisted, never re-fetched (INV-EDGE-3).
- SPEC-04 §4: the poll stops at `pairingCodeExpiresAt`; timeout → `pairing='error'` (no `awaiting_claim` device is left by the FE — the BE cleans up its own record).
- SPEC-07 §2.1: `device_pairing_failed` is a client-side timeout case — the panel enters `pairing='error'` with retry guidance, not a BE error slug.
- Bloqueia: none (depends on FE-EDGE-012 panel host)

**Approach (execution path):**
1. In `DeviceFacade.beginPairing()` (FE-EDGE-009): after the enroll `201`, extract `pairingCodeExpiresAt` and start the poll; when `Date.now() > pairingCodeExpiresAt` and `lifecycleState !== 'paired'`, set `pairing='error'` and stop the poll.
2. In `PairingCodeDisplayComponent` (FE-EDGE-012): add a `countdown` derived from `expiresAt` input using a timer observable; render `MM:SS` format; when the countdown reaches 0, render an expired message.
3. The timer observable must clean up on component destroy (no dangling timers).
4. After expiry, `pairingCode` MUST NOT be re-requested — the page must prompt the user to retry the full enroll flow.

**Non-goals:**
- Do not auto-retry enroll on timeout — the user must explicitly click Retry (SPEC-07 §4).
- Do not leave `pairing='pairing'` after expiry.

**Layer(s):**
frontend / Feature lib — `libs/edge/feature-device-pairing/` + Data access — `libs/edge/data-access/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§2)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§4)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-07-error-handling.md` (§2.1)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Feature lib / Data access**
- 🔲 `libs/edge/feature-device-pairing/src/lib/pairing-code-display/pairing-code-display.component.ts` (countdown timer)
- 🔲 `libs/edge/data-access/src/lib/device.facade.ts` (expiry → pairing='error' in poll loop)

**Tests**
- 🔲 `npx nx test edge-feature-device-pairing` PASS
- 🔲 `npx nx lint edge-feature-device-pairing` PASS

**Milestone:**
Wave 7 / P7 UX Polish

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P7

**Acceptance criteria:**
- After `pairingCodeExpiresAt` elapses, `pairingVm().pairing === 'error'`.
- Retry guidance is shown; no auto-retry enroll is triggered.
- Countdown timer destroys itself on component destroy (no memory leak).
- `npx nx test edge-feature-device-pairing` PASS

**Dependencies:**
- FE-EDGE-009 (DeviceFacade pairing poll logic)
- FE-EDGE-012 (PairingCodeDisplayComponent host)

**Data impact:**
Nenhum

**API / Contract impact:**
- `pairingCodeExpiresAt` comes from `EnrollResultWire` (api-contract §2.1 — single-use code, short TTL)

**Testing / Evidence required:**
- Facade test: mock timer advances past expiry → `pairing` signal transitions to `'error'`.

**Risks / Notes:**
- The countdown timer must be driven by a schedulable clock (e.g., Angular `RxJS` interval or `timer`) so it is testable with `fakeAsync`/`tick`.
