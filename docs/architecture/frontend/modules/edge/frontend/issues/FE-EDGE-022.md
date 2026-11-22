## [FE-EDGE-022] lastSyncRelative pipe — relative-time display, a11y live-region, focus-return after destructive actions

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
A `RelativeTimePipe` renders "synced N ago" from a UTC ISO string — never using `toFixed` or hardcoded time math; the pairing-code region carries an `aria-live` region announced on state change; destructive-action triggers return focus to the activation element after the confirm dialog closes.

**Context / Problem statement:**
- SPEC-02 §4 carries forward three a11y learning signals: `fe-component:kpi-decimal-format` (relative-time pipe, never `toFixed`), `fe-component:a11y-live-region` (pairing-code state announced), `fe-component:modal-focus-return` (focus return after confirm dialog).
- `lastSyncRelative` is a display-only `computed()` over `lastSyncAt` in `DeviceFacade` — this issue adds the **pipe** that renders it.
- These are correctness requirements, not cosmetic: a screen-reader user following the pairing flow must hear state changes.
- Bloqueia: none (polish layer)

**Approach (execution path):**
1. Create `libs/edge/ui/src/lib/pipes/relative-time.pipe.ts` as a standalone `PipeTransform`; implement using `Intl.RelativeTimeFormat` for locale-aware output.
2. Use the pipe in `EdgeDeviceCardComponent` (FE-EDGE-015) to render `lastSyncRelative`.
3. In `DevicePairingPanelComponent` (FE-EDGE-012): add `aria-live="polite"` on the pairing-code/status region; announce state changes (`pairing`, `paired`, `error`) to screen readers.
4. In `DeviceLifecycleActionsComponent` (FE-EDGE-015): capture the trigger element reference before opening the confirm dialog; restore focus to it after the dialog closes.
5. Add pipe unit test with known inputs.

**Non-goals:**
- Do not use `toFixed` for time formatting.
- Do not add `aria-live` on elements that do not change (adds noise for screen reader users).

**Layer(s):**
frontend / UI lib — `libs/edge/ui/` + Feature libs

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§4 — a11y carry-forwards)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:ui`

**Implementation checklist (by file)**

**UI lib / Feature libs**
- 🔲 `libs/edge/ui/src/lib/pipes/relative-time.pipe.ts`
- 🔲 `libs/edge/feature-device-pairing/src/lib/device-pairing-panel/device-pairing-panel.component.ts` (aria-live region)
- 🔲 `libs/edge/feature-device-status/src/lib/device-lifecycle-actions/device-lifecycle-actions.component.ts` (focus return)

**Tests**
- 🔲 `npx nx test edge-ui` PASS
- 🔲 `npx nx lint edge-ui` PASS

**Milestone:**
Wave 7 / P7 UX Polish

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P7

**Acceptance criteria:**
- `RelativeTimePipe` renders "5 minutes ago" for a known input; no `toFixed` in the implementation.
- Pairing-code region has `aria-live="polite"` and announces state changes.
- After a destructive-action confirm dialog closes, focus returns to the trigger button.
- `npx nx test edge-ui` PASS

**Dependencies:**
- FE-EDGE-015 (EdgeDeviceCardComponent uses the pipe)
- FE-EDGE-012 (panel host needs aria-live)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum

**Testing / Evidence required:**
- Pipe spec: input `2026-11-20T10:00:00Z` → output "X minutes ago" (time-frozen test).
- Component spec: after dialog close, focus mock element has `focus()` called.

**Risks / Notes:**
- `Intl.RelativeTimeFormat` behavior varies by browser locale; tests must freeze the locale or use a fixed output.
