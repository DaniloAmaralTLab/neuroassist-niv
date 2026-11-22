# FE-CONV-009 -- AudioPlaybackService — fail-safe cascade (cached → TTS fallback → text-only), audioSource signal, honest indicator

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-07 §3, SPEC-02 §1 (TtsPlayerComponent), SPEC-05 §4 (conv.audio.read), ADR-005

## Outcome
`AudioPlaybackService` implements the fail-safe audio cascade: (1) play the Blob from `AudioCacheStore` if present (`audioSource='cached'`), (2) fall back to device `SpeechSynthesis` TTS if the clip is absent or 404 (`audioSource='tts-fallback'`), (3) if neither is available, emit `audioSource='text-only'` (phrase text rendered LARGE by `TtsPlayerComponent`). The patient is **never** left with a "spoken" state that produced no output. `audioSource` is a readable signal.

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/audio-playback.service.ts`.
2. Inject `AUDIO_ASSET_PORT` and an `AccessDecisionService` stub (for `conv.audio.read` gate).
3. `play(node: SpeechTreeNodeVM): Observable<void>`:
   a. If `conv.audio.read` permission absent → skip cache fetch; go directly to step (c).
   b. Try `AudioCacheStore.get(node.audioRef)` → if Blob present, play via Web Audio API or `<audio>` element → `audioSource.set('cached')`.
   c. If Blob absent or 404/410 → try `SpeechSynthesis.speak(node.text)` → `audioSource.set('tts-fallback')`.
   d. If `SpeechSynthesis` unavailable (no voices) → `audioSource.set('text-only')`.
4. `audioSource = signal<'cached' | 'tts-fallback' | 'text-only' | null>(null)`.
5. The `audioSource` value is passed as `@Input audioSource` to `TtsPlayerComponent` for the honest indicator.
6. Never report `audioSource='cached'` when the clip was not actually played from cache.
7. Unit tests: (a) Blob present → cached; (b) no Blob, TTS available → tts-fallback; (c) no TTS → text-only; (d) no audio.read → tts-fallback immediately.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/audio-playback.service.ts` created
- [ ] `play(node)` implements the three-step fail-safe cascade in strict order
- [ ] `audioSource = signal<'cached' | 'tts-fallback' | 'text-only' | null>(null)` as a readable signal
- [ ] `conv.audio.read` absent → skip cache; go straight to TTS fallback
- [ ] Never reports `'cached'` unless Blob was actually played from cache
- [ ] SpeechSynthesis integration for TTS fallback (Web Speech API, OPS-004)
- [ ] `npx nx test conv-data-access` PASS — all four cascade paths covered
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] Blob present → `audioSource()` returns `'cached'` after play
- [ ] Blob absent → `audioSource()` returns `'tts-fallback'` (TTS invoked)
- [ ] No Blob and TTS unavailable → `audioSource()` returns `'text-only'` (phrase shown LARGE)
- [ ] `conv.audio.read` absent → `audioSource()` never returns `'cached'`; falls back to TTS or text-only
- [ ] `audioSource` is NEVER reported as `'cached'` when clip was absent
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-008 (AudioCacheStore — `get(assetId)`).
INT-FE-CONV-005 (access-decision stub for conv.audio.read check).

## Tenant-context impact
Audio Blobs are per-patient; `conv.audio.read` is in the patient-session token. No tenant-level caching concern beyond the patient-session scope.
