## [FE-EDGE-025] A11y carry-forwards — aria-live, focus-return, contrast AA tokens, keyboard navigation

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
All a11y carry-forwards from SPEC-02 §4 are verified and passing: pairing-code region is announced (aria-live), destructive-action triggers return focus after confirm dialog, all EDGE colors are within contrast AA using oklch tokens, and all EDGE interactive elements are keyboard-navigable.

**Context / Problem statement:**
- Three specific a11y signals from SPEC-02 §4: `fe-component:a11y-live-region`, `fe-component:modal-focus-return`, `fe-component:kpi-decimal-format` (covered by FE-EDGE-022).
- Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`) must be verified for contrast AA compliance — no hardcoded color or spacing.
- This issue is a **verification + gap-fill** pass over all EDGE components after FE-EDGE-022 is complete.
- Bloqueia: none (final a11y pass)

**Approach (execution path):**
1. Audit all EDGE component files for `aria-live` on status-changing regions; add where missing.
2. Audit all confirm-dialog trigger elements for focus-return pattern (FE-EDGE-022); verify with a component test.
3. Run a contrast audit on EDGE-specific oklch token mappings (online/offline/unavailable states) against WCAG AA (4.5:1 for normal text, 3:1 for large text).
4. Verify all interactive EDGE elements (CTAs, Retry buttons, confirm dialog buttons) are reachable via Tab and activated via Enter/Space.
5. Add `axe-core` or `@axe-core/playwright` check to `device-lifecycle.spec.ts` and `pair-edge-device.spec.ts` stubs for the a11y gates.

**Non-goals:**
- Do not add ARIA roles that are already native (button, dialog — use semantic HTML).
- Do not add `aria-hidden` to decorative icons that are already managed by the shared design system.

**Layer(s):**
frontend / UI lib + Feature libs

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:ui`, `type:feature`

**Implementation checklist (by file)**

**All EDGE component files**
- 🔲 `libs/edge/feature-device-pairing/src/lib/device-pairing-panel/device-pairing-panel.component.ts` (aria-live verified)
- 🔲 `libs/edge/feature-device-status/src/lib/device-lifecycle-actions/device-lifecycle-actions.component.ts` (focus-return verified)
- 🔲 `libs/edge/ui/src/lib/device-status-badge/device-status-badge.component.ts` (contrast AA tokens)

**Tests**
- 🔲 `npx nx test edge-ui` PASS
- 🔲 `npx nx lint edge-ui` PASS

**Milestone:**
Wave 9 / P9 e2e + Hardening

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P9

**Acceptance criteria:**
- Pairing-code region has `aria-live` and announces state changes (`pairing`, `paired`, `error`).
- Confirm dialog trigger returns focus after close.
- All EDGE interactive elements reachable via keyboard.
- No hardcoded color/spacing in any EDGE component.
- `npx nx test edge-ui` PASS

**Dependencies:**
- FE-EDGE-022 (relative-time pipe + base a11y additions)
- FE-EDGE-024 (e2e stubs to extend with axe-core assertions)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum

**Testing / Evidence required:**
- Contrast audit output for online (success), offline (amber), unavailable (ink-faint) states.
- Component test: Tab order traverses all CTAs on the lifecycle actions panel.

**Risks / Notes:**
- The oklch token values for warning/amber must be validated against the dark background that is EDGE's default theme — dark is default per `contracts/design-tokens.md`.
