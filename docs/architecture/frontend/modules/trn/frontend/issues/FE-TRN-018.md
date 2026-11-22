# FE-TRN-018 -- AudioPreviewButtonComponent + AudioPreviewService (fail-safe be-clip → tts-fallback → text-only) + TrainingBadgeComponent + EndSessionButtonComponent

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`AudioPreviewService` implements the three-step fail-safe preview cascade (be-clip → tts-fallback → text-only), honestly reporting `previewSource`; `AudioPreviewButtonComponent` renders the source indicator; `TrainingBadgeComponent` renders the "Training — not the patient app" topbar badge; `EndSessionButtonComponent` emits `(endSession)`.

## Context / Problem statement
- SPEC-07 §3: preview cascade: BE-served clip (not in v1 — INT-FE-TRN-1) → device TTS (SpeechSynthesis API, OPS-004) → large text. Never silent; `previewSource` honest.
- SPEC-02 §1: `AudioPreviewButtonComponent` takes `@Input previewSource: 'be-clip' | 'tts-fallback' | 'text-only' | null`; emits `(preview id)`.
- v1 reality: no pre-publication preview endpoint → `previewSource` resolves to `tts-fallback` or `text-only` (never `be-clip`), honestly labelled (SPEC-04 §5, INT-FE-TRN-1).
- `TrainingBadgeComponent`: persistent topbar badge "Training — not the patient app" (TECH-007) — no inputs.
- `EndSessionButtonComponent`: emits `(endSession)` which causes `TrainingSessionFacade.endSession()` (never discards pending proposals).

## Approach (execution path)
1. Create `AudioPreviewService` (injectable): `preview(proposal: ProposalVM)` → check `proposal.previewSource`; if `be-clip` (unavailable in v1) → play audio; if `tts-fallback` → `SpeechSynthesis.speak(proposal.text!)`; if `text-only` → emit event to render large-text overlay. Expose `previewSource = signal<'be-clip'|'tts-fallback'|'text-only'|null>(null)`.
2. Create `AudioPreviewButtonComponent` (standalone, OnPush): `@Input previewSource`; renders an indicator label ("Preview (voice)" / "Preview (device TTS)" / "Read aloud"); emits `(preview id)`.
3. Create `TrainingBadgeComponent` (standalone, OnPush): static topbar badge text "Training — not the patient app". No inputs.
4. Create `EndSessionButtonComponent` (standalone, OnPush): emits `(endSession)`.

## Non-goals
- No audio fetching from BE (INT-FE-TRN-1 covers the future endpoint).
- `previewSource === 'be-clip'` path is dead-code in v1 but must be structurally present for when INT-FE-TRN-1 lands.

## Layer(s)
frontend / Feature lib (`libs/trn/feature-training/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§3 fail-safe preview cascade)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 — AudioPreviewButtonComponent)

## Architecture alignment
- Fail-safe cascade always resolves to a non-silent outcome
- `previewSource` never reported as `be-clip` when no clip available (honest labelling)
- SpeechSynthesis used for TTS fallback

## Implementation checklist (by layer/file)

- 🔲 `feature-training/src/lib/services/audio-preview.service.ts` — 3-step cascade, previewSource signal
- 🔲 `feature-training/src/lib/audio-preview-button/audio-preview-button.component.ts` — indicator label per source
- 🔲 `feature-training/src/lib/training-badge/training-badge.component.ts` — static "Training — not the patient app" badge
- 🔲 `feature-training/src/lib/end-session-button/end-session-button.component.ts` — (endSession) output
- 🔲 Unit test: `preview()` with `previewSource=null` resolves to `text-only` and renders large text
- 🔲 Unit test: `AudioPreviewButtonComponent` label changes per previewSource

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 3 / Feature lib (training)

## Labels
type:feature
layer:frontend
scope:trn
priority:P3

## Acceptance criteria
- `AudioPreviewService.preview()` never enters a silent or unresolved state — always resolves to one of the three steps.
- `previewSource` is never reported as `'be-clip'` in v1 (no preview endpoint exists).
- `EndSessionButtonComponent` emits `(endSession)` without deleting pending proposals.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-014 (parent TrainingSessionPageComponent)
- FE-TRN-012 (ProposalFacade — for proposal text in TTS)

## Data impact
- None — audio playback only; no server state mutated.

## API / Contract impact
- When INT-FE-TRN-1 lands: `AudioPreviewService.preview()` will add a `GET /trn/proposals/{id}/preview-audio` call before falling to TTS.

## Testing / Evidence required
- Unit test: fail-safe cascade with null previewSource resolves to text-only.

## Risks / Notes
- INT-FE-TRN-1: in v1, `be-clip` path is structurally present but never reached. When the BE endpoint lands, wire `previewSource` from the adapter and the `be-clip` case activates.
- `SpeechSynthesis` availability: wrap in a try/catch; if unavailable fall through to `text-only`.
