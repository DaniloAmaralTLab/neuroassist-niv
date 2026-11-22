# FE-CONV-025 -- E2E session guard + audio fail-safe + input channel — SPEC-08 features 4–6 (session-ended redirect, TTS unavailable cascade, gesture navigation intent)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-08 §4 feature-4 (session guard), §5 feature-5 (audio fail-safe chain), §6 feature-6 (input channels), SPEC-01 §4, SPEC-07 §3, ADR-007

## Outcome
Three Playwright spec files cover the remaining E2E scenarios: (D) session guard: absent/revoked patient-session → redirects to session-ended surface (never to /login); (E) full audio fail-safe chain: cached → TTS → text-only progression; (F) input channels: gesture navigation intent (via NAVIGATION_INTENT_PORT mock) selects the same node as touch. Total SPEC-08 coverage: 35 scenarios across 6 feature files.

## Approach (execution path)
1. Create `apps/conv-e2e/src/features/session-guard.spec.ts` — Path D:
   - Scenario: no patient-session in storage → navigate to `/patient/converse` → redirected to `SESSION_ENDED_PATH` (not `/login`).
   - Scenario: revoked patient-session → same redirect.
   - Scenario: valid session → no redirect; tree loads.
   - SPEC-08 feature-4 scenarios (all 5).
2. Create `apps/conv-e2e/src/features/audio-failsafe.spec.ts` — Path E:
   - Use `offlineMode` fixture + stub `AudioCacheStore` returning empty → cached Blob absent.
   - Step 1: TTS available → `audioSource='tts-fallback'` verified.
   - Step 2: Mock `window.speechSynthesis = undefined` via `page.evaluate()` → `audioSource='text-only'` → phrase text LARGE in DOM verified.
   - SPEC-08 feature-5 scenarios (all 6).
3. Create `apps/conv-e2e/src/features/input-channels.spec.ts` — Path F:
   - Use `patientSession` fixture.
   - Dispatch a mock `NAVIGATION_INTENT_PORT` gesture intent via `page.evaluate(() => window['__convTestHook_navigationIntent']?.emit({ type: 'selectByFeatureRef', ref: '<nodeRef>' }))` — a test-only hook injected in `provideConv()` when `environment.testMode` is true.
   - Verify: same node becomes selected as via touch select.
   - SPEC-08 feature-6 scenarios (all 6).
4. All 35 scenarios from SPEC-08 are now covered across 6 spec files (FE-CONV-024 = 18, FE-CONV-025 = 17 → reconcile against SPEC-08 inventory).

## Implementation checklist (by layer/file)
- [ ] `apps/conv-e2e/src/features/session-guard.spec.ts` — 5 scenarios from SPEC-08 §4 (session guard)
- [ ] Session absent → redirects to SESSION_ENDED_PATH, never /login (SPEC-01 §4 carry-forward)
- [ ] `apps/conv-e2e/src/features/audio-failsafe.spec.ts` — 6 scenarios from SPEC-08 §5 (fail-safe chain)
- [ ] Text-only: `.conv-phrase-large` visible in DOM
- [ ] `apps/conv-e2e/src/features/input-channels.spec.ts` — 6 scenarios from SPEC-08 §6 (ADR-007)
- [ ] Gesture intent → same selectedNode as touch (channel-agnostic seam verified)
- [ ] Test-hook (`__convTestHook_navigationIntent`) injected only when `environment.testMode=true`
- [ ] `npx nx e2e conv-e2e --skipInstall` PASS — all 35 scenarios
- [ ] `npx nx lint conv-e2e` PASS

## Acceptance criteria
- [ ] 35 E2E scenarios total across 6 spec files (matches SPEC-08 §1–6 inventory)
- [ ] Session guard: absent session → `SESSION_ENDED_PATH`, not `/login`
- [ ] Input channel: gesture intent selects the same node as touch in `selectedNode()` signal
- [ ] `npx nx e2e conv-e2e --skipInstall` PASS in CI
- [ ] `npx nx lint conv-e2e` PASS

## Dependencies
FE-CONV-023 (conv-e2e project + fixtures).
FE-CONV-018 (patientSessionGuard — session guard behavior specs verify).
FE-CONV-019 (ConvShellIntegrationService — navigation intent consumption).
FE-CONV-004 (NAVIGATION_INTENT_PORT — test hook injection point in provideConv()).
FE-CONV-021 (TTS cascade → text-only render).

## Tenant-context impact
Same as FE-CONV-024 — test-tenant schema; no production data accessed.
