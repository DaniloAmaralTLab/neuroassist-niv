# FE-CONV-017 -- TtsPlayerComponent + NavFooterComponent — honest cached-vs-fallback indicator, text-only large render, back navigation, switch-scan cursor

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-02 §1–2, SPEC-07 §3, SPEC-05 §3 (conv.switch-scan.enabled)

## Outcome
`TtsPlayerComponent` renders the selected phrase and an honest audio-source indicator ('cached', 'tts-fallback', or 'text-only' as LARGE phrase text). The patient is never shown a "spoken" state that did not produce output. `NavFooterComponent` renders the back button (only when not at root) and the switch-scan cursor affordance when the scan channel is active.

## Approach (execution path)
1. Create `frontend/libs/conv/feature-converse/src/lib/tts-player.component.ts`:
   - `@Input selectedNode: SpeechTreeNodeVM | null` — the phrase to display/play.
   - `@Input audioSource: 'cached' | 'tts-fallback' | 'text-only' | null` — the honest source indicator.
   - Renders:
     - When `audioSource === 'cached'`: "▶ Playing: <phrase>" + "Using your voice" indicator.
     - When `audioSource === 'tts-fallback'`: "▶ Speaking: <phrase>" + "Device voice (fallback)" indicator.
     - When `audioSource === 'text-only'`: renders `<phrase text>` **LARGE** on screen (the fail-safe visual output); "Audio unavailable" indicator.
     - When `audioSource === null`: empty / no indicator.
   - Standalone, OnPush. No injected service (all playback logic is in `AudioPlaybackService`, not here).
   - a11y: `aria-live="polite"` on the phrase output area.
2. Create `frontend/libs/conv/feature-converse/src/lib/nav-footer.component.ts`:
   - `@Input showBack: boolean` — renders the back button only when true (not at root level).
   - `@Input activeChannel: 'touch' | 'gesture' | 'scan'` — when 'scan', renders the switch-scan cursor affordance (dwell indicator, scan highlight).
   - `@Output back = new EventEmitter<void>()` — emitted when back is activated.
   - Standalone, OnPush.
3. Unit tests: `audioSource='text-only'` → phrase text visible; `audioSource='cached'` → "Using your voice"; `showBack=false` → back button hidden.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/feature-converse/src/lib/tts-player.component.ts` — selectedNode, audioSource inputs; honest source indicator
- [ ] `audioSource='text-only'` → phrase text LARGE (the only visual output when audio unavailable)
- [ ] `audioSource` NEVER shows 'cached' label when clip was not played from cache
- [ ] `aria-live="polite"` on phrase output area
- [ ] `frontend/libs/conv/feature-converse/src/lib/nav-footer.component.ts` — showBack, activeChannel inputs; (back) output
- [ ] `showBack=false` → back button not rendered (component checks the boolean, not the DOM)
- [ ] Switch-scan cursor affordance when `activeChannel='scan'`
- [ ] `npx nx test conv-feature-converse` PASS — all audioSource states; showBack toggle; back emit
- [ ] `npx nx lint conv-feature-converse` PASS

## Acceptance criteria
- [ ] When `audioSource='text-only'`, phrase text is rendered prominently (large) as the primary output
- [ ] When `audioSource='cached'`, the "Using your voice" indicator is shown (honest source)
- [ ] `showBack=false` → back button is not rendered in the DOM
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Dependencies
FE-CONV-011 (SpeechTreeNodeVM for selectedNode input type).
FE-CONV-014 (SpeechTreeNavigatorComponent — these are its children).
FE-CONV-009 (AudioPlaybackService drives audioSource; this component only receives it as input).

## Tenant-context impact
None — purely presentational; phrase text from cache is patient-specific but the component renders whatever it receives.
