# FE-CONV-024 -- E2E golden paths A/B/C — patient navigates tree (touch), phrase plays cached audio, offline stale tree; Playwright specs for SPEC-08 features 1–3

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-08 §1 feature-1 (tree navigation), §2 feature-2 (audio playback), §3 feature-3 (offline mode), SPEC-07 §3

## Outcome
Three Playwright spec files cover the three golden path E2E scenarios: (A) patient navigates the speech tree via touch, selects a phrase, hears it played from cache; (B) audio cache miss → TTS fallback → phrase text LARGE; (C) app goes offline mid-session → `offline-stale` state, cached tree usable. All three use the `patientSession` and `offlineMode` fixtures from FE-CONV-023. No scenario hardcodes a mock `true` guard.

## Approach (execution path)
1. Create `apps/conv-e2e/src/features/tree-navigation.spec.ts` — Path A:
   - Use `patientSession` fixture; navigate to `/patient/converse`.
   - `treeState` resolves to `'ready'`; node grid is visible.
   - Patient taps a category tile → `descend()` → second-level nodes visible.
   - Patient taps a phrase tile → `select()` → audio plays (mock Blob URL served) → `audioSource='cached'` indicator visible.
   - Patient taps back → root level restored.
   - SPEC-08 feature-1 scenarios (all 7 — verify count matches SPEC-08 §1).
2. Create `apps/conv-e2e/src/features/audio-playback.spec.ts` — Path B:
   - Use `patientSession` fixture + `offlineMode` for the cache-miss sub-path.
   - Scenario: audio Blob absent in Cache Storage → TTS fallback: `SpeechSynthesis.speak` called, `audioSource='tts-fallback'` indicator visible.
   - Scenario: TTS unavailable (mocked `speechSynthesis=undefined`) → `audioSource='text-only'`, phrase text rendered LARGE in DOM.
   - SPEC-08 feature-2 scenarios (all 6).
3. Create `apps/conv-e2e/src/features/offline-mode.spec.ts` — Path C:
   - Use `patientSession` + `offlineMode` fixture.
   - App loads with cached tree → goes offline mid-session → `treeState='offline-stale'` → offline marker visible.
   - Cached tree remains interactive (patient can still select a phrase, TTS fallback kicks in).
   - Sync fails silently; toast shown on explicit syncNow.
   - SPEC-08 feature-3 scenarios (all 5).

## Implementation checklist (by layer/file)
- [ ] `apps/conv-e2e/src/features/tree-navigation.spec.ts` — 7 scenarios from SPEC-08 §1 (feature-1)
- [ ] `apps/conv-e2e/src/features/audio-playback.spec.ts` — 6 scenarios from SPEC-08 §2 (feature-2)
- [ ] `apps/conv-e2e/src/features/offline-mode.spec.ts` — 5 scenarios from SPEC-08 §3 (feature-3)
- [ ] All specs use `patientSession` fixture (no hardcoded auth bypass)
- [ ] Path B: `audioSource='tts-fallback'` indicator visible; `audioSource='text-only'` → phrase LARGE in DOM
- [ ] Path C: `treeState='offline-stale'` verified in DOM; cached tree interactive
- [ ] `npx nx e2e conv-e2e --skipInstall` PASS (green on a seeded test environment)
- [ ] `npx nx lint conv-e2e` PASS
- [ ] Zero flakiness on three consecutive runs (each spec is isolated via fixtures)

## Acceptance criteria
- [ ] All 18 scenarios (7+6+5) are present and cover the SPEC-08 feature inventory
- [ ] No spec uses `page.evaluate(() => guards.forceTrue())` or similar bypass
- [ ] Path B text-only: `expect(page.locator('.conv-phrase-large')).toBeVisible()` passes
- [ ] `npx nx e2e conv-e2e --skipInstall` PASS in CI
- [ ] `npx nx lint conv-e2e` PASS

## Dependencies
FE-CONV-023 (conv-e2e project, patientSession + offlineMode fixtures).
FE-CONV-012 (SpeechTreeFacade — treeState signal drives the DOM state specs verify).
FE-CONV-009 (AudioPlaybackService — audioSource drives audio indicator specs verify).
FE-CONV-021 (TtsPlayerComponent — text-only large render specs verify).

## Tenant-context impact
Tests run against a seeded test tenant schema. The `patientSession` fixture must carry a valid test-tenant claim; no production data accessed.
