## [FE-EDGE-016] DeviceStatusBadge (libs/edge/ui) — eager presentational, topbar slot reservation

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`DeviceStatusBadge` in `libs/edge/ui` is the single eager-presentational component contributed to the Shell topbar: renders `online` / `offline` (amber) / `unavailable` states from inputs only, reserves its layout slot to prevent CLS, and never infers liveness from a timer.

**Context / Problem statement:**
- SPEC-02 §3 defines the badge: 3 states mapped to design tokens, no logic (computed in facade).
- The badge is the **only** eager EDGE surface; feature libs remain lazy (SPEC-01 §3).
- It never shows a defaulted "online" (ADR-005): if `status='unavailable'` it shows the neutral ink-faint state, never `online`.
- Layout slot reserved to avoid CLS on status change (doc 02 §5).
- `lastSyncRelative` is display-only, computed by the facade — not by a local timer.
- Bloqueia: FE-EDGE-004 (descriptor references it by string key)

**Approach (execution path):**
1. Create `libs/edge/ui/src/lib/device-status-badge/device-status-badge.component.ts` as `standalone: true`, `changeDetection: OnPush`.
2. Inputs: `status: 'online'|'offline'|'unavailable'`; `lastSyncRelative: string | null`.
3. Apply design tokens from `@neuroassist/shared/ui-tokens`: `online` → success token; `offline` → warning/amber; `unavailable` → ink-faint neutral.
4. Reserve a fixed layout slot (min-width / min-height) so the component does not reflow when status changes.
5. Export `DeviceStatusBadge` from `libs/edge/ui/src/index.ts`.
6. Add spec confirming `'unavailable'` does not render an online label.

**Non-goals:**
- No `HttpClient`, no facade injection.
- Do not compute `isOnline` from `Date.now()` difference — only from the `status` input.
- Do not escalate `offline` to a danger/alarm style — that is EVNT's domain.

**Layer(s):**
frontend / UI lib — `libs/edge/ui/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§3)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:ui`

**Implementation checklist (by file)**

**UI lib**
- 🔲 `libs/edge/ui/src/lib/device-status-badge/device-status-badge.component.ts`
- 🔲 `libs/edge/ui/src/index.ts` (barrel export)

**Tests**
- 🔲 `npx nx test edge-ui` PASS
- 🔲 `npx nx lint edge-ui` PASS

**Milestone:**
Wave 3 / P3 Feature libs

**Labels:**
type:ui
layer:frontend
scope:edge
priority:P3

**Acceptance criteria:**
- `status='unavailable'` → "Status unavailable" (never "Device online").
- `status='offline'` → amber warning token (not danger/alarm).
- Component has a fixed layout slot (no CLS on status change).
- No `HttpClient` or service injected.
- `npx nx test edge-ui` PASS

**Dependencies:**
Nenhuma (pure presentational)

**Data impact:**
Nenhum

**API / Contract impact:**
- Status values come from BE `connectivity` field via mapper (FE-EDGE-008)

**Testing / Evidence required:**
- Visual snapshot / DOM test: `unavailable` state renders ink-faint class; `offline` renders amber class.

**Risks / Notes:**
- Because this is the only eager EDGE surface, any import added to this file that transitively pulls a lazy feature lib will enlarge the initial shell bundle — keep the dependency footprint minimal.
