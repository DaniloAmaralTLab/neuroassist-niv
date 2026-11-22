# FE-CONV-021 -- TTS/text-only visual fallback — SpeechSynthesis Web API integration, phrase text LARGE render on text-only, honest fail-safe indicator, a11y

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-07 §3, SPEC-02 §1 (TtsPlayerComponent), generator-config.yml §extra_dependencies (Web Speech API)

## Outcome
`AudioPlaybackService` integrates the Web Speech API (`SpeechSynthesis`) as the TTS fallback tier. When a cached Blob is absent, the service invokes `window.speechSynthesis.speak()` with a `SpeechSynthesisUtterance` for `node.text` and sets `audioSource='tts-fallback'`. When TTS is also unavailable (no voices or synthesis fails), `audioSource='text-only'` is set and `TtsPlayerComponent` renders the phrase text LARGE on screen as the final visual fallback. The patient is never left with a "spoken" state that produced no output.

## Approach (execution path)
1. In `AudioPlaybackService.play()` (FE-CONV-009), integrate TTS in step (c):
   - Check `'speechSynthesis' in window` and `window.speechSynthesis.getVoices().length > 0`.
   - Create `SpeechSynthesisUtterance(node.text)` — `lang='en-US'` (ADR-018 English-only product).
   - `window.speechSynthesis.speak(utterance)`.
   - On `utterance.onerror` → fall through to `text-only`.
   - Set `audioSource.set('tts-fallback')`.
2. If TTS not available or fails → `audioSource.set('text-only')`.
3. In `TtsPlayerComponent` (FE-CONV-017), when `audioSource==='text-only'`:
   - Render `<p class="conv-phrase-large">{{ selectedNode.text }}</p>` with token-driven large font size (e.g., `--conv-phrase-font-size: 2rem` via `@neuroassist/shared/ui-tokens`).
   - `aria-live="assertive"` on the phrase text element for screen reader announcement.
   - Show the "Audio unavailable" honest indicator alongside.
4. Unit test: `SpeechSynthesis` stub available → `tts-fallback`; stub unavailable → `text-only`.
5. No dependency on a third-party TTS library at runtime (device SpeechSynthesis only for the fallback).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/audio-playback.service.ts` — SpeechSynthesis integration in play() cascade step (c)
- [ ] TTS utterance uses `lang='en-US'` (ADR-018 English-only)
- [ ] `utterance.onerror` falls through to `audioSource='text-only'`
- [ ] `frontend/libs/conv/feature-converse/src/lib/tts-player.component.ts` — `text-only` branch renders phrase LARGE
- [ ] `aria-live="assertive"` on the phrase text element when `audioSource='text-only'`
- [ ] "Audio unavailable" honest indicator shown alongside large text
- [ ] Token-driven font size for large-text render (not hardcoded px)
- [ ] `npx nx test conv-data-access` PASS — TTS available path and TTS unavailable path
- [ ] `npx nx lint conv-feature-converse` PASS

## Acceptance criteria
- [ ] With TTS available, `play()` → `audioSource='tts-fallback'` and `speechSynthesis.speak()` called
- [ ] With TTS unavailable, `play()` → `audioSource='text-only'` and phrase rendered LARGE in DOM
- [ ] `audioSource='text-only'` → `aria-live="assertive"` on phrase text (screen reader announces)
- [ ] Font size is from ui-tokens (not hardcoded)
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-feature-converse` PASS

## Dependencies
FE-CONV-009 (AudioPlaybackService — this refines the TTS cascade step within that service).
FE-CONV-017 (TtsPlayerComponent — the text-only render happens here).

## Tenant-context impact
None — SpeechSynthesis uses the device's voices; phrase text is in English (ADR-018); no tenant-specific voice.
