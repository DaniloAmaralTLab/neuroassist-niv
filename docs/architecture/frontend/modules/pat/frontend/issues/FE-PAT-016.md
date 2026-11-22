# FE-PAT-016 -- LiveWebcamTestComponent (advisory getUserMedia, idle/testing/success/error, never blocks save)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`LiveWebcamTestComponent` runs the advisory webcam preview (idle → testing → success/error), stops every `getUserMedia` track on stop/save/`ngOnDestroy`, never uploads the stream, and never blocks save when the camera is unavailable.

## Approach (execution path)
1. Create `live-webcam-test.component.ts` (standalone, OnPush, presentational): `input()` testState: `'idle'|'testing'|'success'|'error'`; `output()` toggle = `'start'|'stop'`; renders webcam preview when testing, error state when camera denied.
2. `getUserMedia` call is confined to this component (SPEC-02 §1, R5); on stop, save, or `ngOnDestroy` stop all tracks: `stream.getTracks().forEach(t => t.stop())`.
3. When `getUserMedia` throws (camera denied/unavailable) set `testState = 'error'`; never disable save — purely advisory (SPEC-07 §2: `webcam_unavailable` is client-only, never a ProblemDetail).
4. Compound command surfaces non-blocking recommendation to run live test from `CommandEditorPanelComponent` (SPEC-02 §1); GEST owns recognition risk.
5. Write unit tests with a fake media stream stub (Playwright e2e also uses fake media — SPEC-08 §3).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/live-webcam-test.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/live-webcam-test.component.html`
- [ ] unit tests (webcam unavailable keeps save enabled, ngOnDestroy stops tracks, fake media stub)
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] `testState = 'error'` (camera unavailable) does not disable the save control — SPEC-07 / SPEC-03.
- [ ] `ngOnDestroy` stops all `getUserMedia` tracks — no dangling stream after teardown (R5).
- [ ] The stream is never uploaded to any server (R5 / SPEC-02).
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-014 (CommandEditorPanelComponent owns the live-test toggle flow).

## Tenant-context impact
Nenhum (browser-only component; no server calls).

## Prioridade
P3
