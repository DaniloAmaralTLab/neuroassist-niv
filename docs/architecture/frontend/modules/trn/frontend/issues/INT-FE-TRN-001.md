# INT-FE-TRN-001 -- No pre-publication audio-preview endpoint in v1 → AudioPreviewService degrade to tts-fallback or text-only (BE amendment or v2 wire)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`AudioPreviewService.preview()` never attempts `GET /trn/proposals/{id}/preview-audio` in v1 (endpoint does not exist); the fail-safe cascade resolves to `tts-fallback` (SpeechSynthesis) or `text-only` and reports `previewSource` honestly. When BE adds the endpoint (amendment or v2), wiring here activates the `be-clip` path without structural changes.

## Context / Problem statement
- SPEC-04 §5: no pre-publication audio-preview endpoint in v1.
- SPEC-07 §3: fail-safe cascade: be-clip → tts-fallback → text-only. The `be-clip` step is structurally present but never reached in v1.
- In v1 the `AudioPreviewService` MUST NOT call a non-existent endpoint (HTTP 404 would be a user-facing error, not graceful degradation).
- When BE adds the preview endpoint, `previewSource` will flip to `be-clip`; until then, honest labelling must report `tts-fallback` or `text-only`.

## Coordination required
- **BE team (trn-service):** this is a formal notification that FE needs `GET /trn/proposals/{id}/preview-audio` to deliver full preview fidelity. Options: (a) add to v1 release as a BE amendment; (b) defer to v2.
- FE will add a feature flag `MODULE_FEATURE_FLAGS.audioPreview` = `false` in v1 to gate the be-clip code path.

## Approach (FE v1)
1. `AudioPreviewService.preview()`: check `featureFlags.audioPreview`; if `false` → skip be-clip step, go directly to tts-fallback.
2. `previewSource` set to `tts-fallback` (or `text-only` if SpeechSynthesis unavailable).
3. `AudioPreviewButtonComponent` label: "Preview (device voice)" or "Read aloud" — never "Preview (high quality)" without be-clip.

## FE changes when BE endpoint lands (wire-up path)
1. Set `MODULE_FEATURE_FLAGS.audioPreview = true`.
2. `AudioPreviewService.preview()`: call `ContentApiService.fetchPreviewAudio(proposalId)` → play audio blob → set `previewSource = 'be-clip'`.
3. No structural changes to the cascade — it was already in place.

## Non-goals
- No polyfill for SpeechSynthesis in v1.
- No server-side audio generation from the FE side.

## Layer(s)
frontend / Feature lib + Tool entry

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§5)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§3)

## Architecture alignment
- Feature flag gates the be-clip code path
- Honest `previewSource` labelling in all degraded states

## Implementation checklist

- 🔲 `MODULE_FEATURE_FLAGS.audioPreview = false` in v1 feature-flags configuration
- 🔲 `AudioPreviewService.preview()`: skip be-clip step when flag is `false`
- 🔲 `AudioPreviewButtonComponent`: label reflects actual preview source
- 🔲 Coordination note filed to BE team (trn-service)

## Milestone
Wave 2 / Integration flag

## Labels
type:integration
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `AudioPreviewService.preview()` with `audioPreview = false` NEVER calls `GET /trn/proposals/{id}/preview-audio`.
- `previewSource` is never reported as `be-clip` when the flag is `false`.
- When flag is set to `true` (future), the be-clip path activates without code changes to the cascade.

## Dependencies
- FE-TRN-003 (MODULE_FEATURE_FLAGS definition)
- FE-TRN-018 (AudioPreviewService)

## Risks / Notes
- If BE adds the preview endpoint before FE-TRN-018 ships, set the flag to `true` at that time.
