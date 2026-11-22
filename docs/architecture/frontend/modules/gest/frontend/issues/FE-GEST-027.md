# FE-GEST-027 -- e2e: recognise-and-report + offline-queue-and-retry (Playwright)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
Two Playwright e2e specs covering the happy-path `recognise-and-report` and the resilience path `offline-queue-and-retry`; both specs use the mock adapter from `provideGest('mock')`; `recognise-and-report` asserts a gesture report is sent with `reportId` and `commandId`; `offline-queue-and-retry` goes offline, fires a recognition, comes back online, and asserts the same `reportId` is retried (INV-GEST-1, INV-GEST-5).

## Approach (execution path)
1. `recognise-and-report.spec.ts`:
   - Launch station runtime page with `provideGest('mock')`.
   - Inject a `commandRecognised` event via test harness.
   - Assert `POST /evnt/gesture-reports` intercepted with `{reportId, commandId, confidence, recognitionWindowMs}`.
   - Assert `detection='running'` in `StationRuntimeVM` after report.
2. `offline-queue-and-retry.spec.ts`:
   - Launch station runtime with mock adapter; go offline (Playwright network conditions).
   - Inject `commandRecognised`; assert report enters queue (pending count = 1); capture `reportId`.
   - Come back online; assert `POST /evnt/gesture-reports` intercepted with SAME `reportId` (not a new one — INV-GEST-1).
   - Assert pending count returns to 0.
3. Use `page.route` Playwright API to intercept network calls.
4. Both specs in `apps/gest-e2e/src/e2e/`.

## Implementation checklist (by layer/file)
- [ ] implementar `apps/gest-e2e/src/e2e/recognise-and-report.spec.ts`
- [ ] implementar `apps/gest-e2e/src/e2e/offline-queue-and-retry.spec.ts`
- [ ] `recognise-and-report`: asserts `reportId` + `commandId` in POST body
- [ ] `offline-queue-and-retry`: asserts SAME `reportId` on retry (INV-GEST-1)
- [ ] `offline-queue-and-retry`: asserts queue drains to 0 on reconnect
- [ ] Uses `provideGest('mock')` — no real service calls
- [ ] `npx nx e2e gest-e2e` PASS
- [ ] `npx nx build gest-e2e` PASS

## Acceptance criteria
- [ ] `recognise-and-report` PASS with `reportId` assertion
- [ ] `offline-queue-and-retry` PASS with same-`reportId` retry assertion (INV-GEST-1)
- [ ] `npx nx e2e gest-e2e` PASS

## Dependencies
- FE-GEST-003 (provideGest('mock') provider)
- FE-GEST-006 (GestureReportApiService mock)
- FE-GEST-009 (ReportFacade offline queue)
- FE-GEST-017 (StationRuntimePageComponent — runtime page host)

## Tenant-context impact
None — e2e uses mock adapter; no real patient data.

## Prioridade
P6
