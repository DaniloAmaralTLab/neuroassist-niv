# FE-CONV-023 -- conv-e2e Nx project — Playwright project registration, Nx config, base URL, patient-session test harness, mock offline mode

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-08 §1, generator-config.yml §e2e_framework (Playwright), D-487 (fe-nx-register)

## Outcome
The `conv-e2e` Nx project is created and registered via `fe-nx-register-module.py` (D-487). `playwright.config.ts` for `conv-e2e` is configured with `baseURL` pointing to the patient-mode host (dev server), a `patientSession` test fixture that provides a valid non-expiring patient-session token, and an `offlineMode` fixture that toggles `navigator.onLine` via service-worker interception. The Nx e2e target runs with `--skipInstall` on CI.

## Approach (execution path)
1. Register `conv-e2e` via `fe-nx-register-module.py`:
   ```bash
   python scripts/fe-nx-register-module.py --client neuroassist-niv --module CONV --type e2e
   ```
   Creates `apps/conv-e2e/project.json` and registers the `e2e` target in the Nx graph.
2. Create `apps/conv-e2e/playwright.config.ts`:
   - `baseURL` = `process.env.CONV_BASE_URL ?? 'http://localhost:4200'`.
   - `options.config` reference (D-451 — executor only accepts `options.config`).
   - `testDir` = `./src`.
   - Project name: `'conv-e2e'`.
3. Create `apps/conv-e2e/src/support/patient-session.fixture.ts`:
   - Extends Playwright `test` with a `patientSession` fixture.
   - Injects a seeded patient-session token into the app's auth-session storage before each test.
   - Token has `conv.tree.read`, `conv.audio.read`, `conv.usage.record` authorities.
4. Create `apps/conv-e2e/src/support/offline-mode.fixture.ts`:
   - Extends `test` with an `offlineMode` fixture.
   - Uses `page.route('**', route => route.abort())` to simulate offline → tests can verify `offline-stale` / TTS fallback paths.
5. Verify: `npx nx e2e conv-e2e --list --skipInstall` returns the test list without errors.

## Implementation checklist (by layer/file)
- [ ] `python scripts/fe-nx-register-module.py --client neuroassist-niv --module CONV --type e2e` exits 0
- [ ] `apps/conv-e2e/project.json` registered; Nx e2e target present
- [ ] `apps/conv-e2e/playwright.config.ts` with `baseURL`, `options.config`, `testDir`
- [ ] `apps/conv-e2e/src/support/patient-session.fixture.ts` — patient-session token with 3 conv.* authorities
- [ ] `apps/conv-e2e/src/support/offline-mode.fixture.ts` — `page.route('**', abort)` offline simulation
- [ ] `npx nx e2e conv-e2e --list --skipInstall` returns test list without errors
- [ ] `apps/conv-e2e/src/support/index.ts` exports merged fixture (patientSession + offlineMode)
- [ ] `npx nx lint conv-e2e` PASS

## Acceptance criteria
- [ ] `npx nx e2e conv-e2e --list --skipInstall` runs without errors
- [ ] `patientSession` fixture injects token with `conv.tree.read`, `conv.audio.read`, `conv.usage.record` only
- [ ] `offlineMode` fixture correctly aborts all network requests on request
- [ ] `npx nx lint conv-e2e` PASS

## Dependencies
D-487 (fe-nx-register-module.py must be present for the registration step).
FE-CONV-018 (patient-session auth mechanism — fixture mirrors it).

## Tenant-context impact
Test patient-session token must carry a valid (test) tenant claim. E2E tests run against a seeded test tenant schema; no production tenant data is touched.
