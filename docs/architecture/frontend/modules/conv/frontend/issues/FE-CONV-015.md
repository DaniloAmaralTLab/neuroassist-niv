# FE-CONV-015 -- LevelHeaderComponent + ChannelBadgeComponent + PendingConfirmationBannerComponent — presentational trio, OnPush/standalone

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-02 §1–2, SPEC-03 §1 (currentLevelLabel, activeChannel, pendingConfirmation)

## Outcome
Three lightweight presentational components are defined: `LevelHeaderComponent` (shows current level label + offline marker + snapshot version), `ChannelBadgeComponent` (shows the active input channel), `PendingConfirmationBannerComponent` (shows the "N phrase(s) to confirm" banner when count > 0, emits a link-out to TRN — never a CONV route). All are `standalone`, `OnPush`, hold no injected facade and no HTTP.

## Approach (execution path)
1. Create `frontend/libs/conv/feature-converse/src/lib/level-header.component.ts`:
   - `@Input currentLevelLabel: string | null` — shows parent node text or "Choose a category".
   - `@Input offline: boolean` — when true, renders the subtle "offline — last synced vX" marker.
   - `@Input snapshotVersion: string` — appended to the offline marker.
   - Standalone, OnPush.
2. Create `frontend/libs/conv/feature-converse/src/lib/channel-badge.component.ts`:
   - `@Input activeChannel: 'touch' | 'gesture' | 'scan'` — renders "Active channel: Touch/Gesture/Scan".
   - Standalone, OnPush. No output.
3. Create `frontend/libs/conv/feature-converse/src/lib/pending-confirmation-banner.component.ts`:
   - `@Input count: number` — banner rendered only when `count > 0`.
   - `@Output open = new EventEmitter<void>()` — emits when user taps/clicks the banner; parent routes to `/patient/confirm-training` (TRN link-out — SPEC-01 §2). This component does NOT use `RouterLink` to `/patient/confirm-training` directly (avoid CONV owning a TRN route reference).
   - Standalone, OnPush.
4. a11y: all three components have appropriate aria attributes; large text/targets suitable for ALS/MND users.
5. Unit tests for each: correct conditional render (count=0 → banner hidden); offline=false → no offline marker.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/feature-converse/src/lib/level-header.component.ts` — currentLevelLabel, offline, snapshotVersion inputs
- [ ] `frontend/libs/conv/feature-converse/src/lib/channel-badge.component.ts` — activeChannel input
- [ ] `frontend/libs/conv/feature-converse/src/lib/pending-confirmation-banner.component.ts` — count input, (open) output; rendered only when count > 0
- [ ] All three: standalone, OnPush, no injected facade or HttpClient
- [ ] a11y: aria attributes appropriate for ALS/MND large-target requirements
- [ ] `PendingConfirmationBannerComponent` does NOT own a route to /patient/confirm-training (TRN boundary)
- [ ] Unit tests: banner hidden on count=0; offline marker hidden on offline=false
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Acceptance criteria
- [ ] `PendingConfirmationBannerComponent` renders nothing when `count === 0`
- [ ] `PendingConfirmationBannerComponent.open` emits when count > 0 and user interacts; parent routes to TRN
- [ ] `LevelHeaderComponent` shows offline marker only when `offline === true`
- [ ] All three components are standalone and OnPush — no NgModule
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Dependencies
FE-CONV-014 (SpeechTreeNavigatorComponent — these are its children).
FE-CONV-011 (view model types for inputs).

## Tenant-context impact
None — these are pure presentational components with no tenant-specific rendering.
