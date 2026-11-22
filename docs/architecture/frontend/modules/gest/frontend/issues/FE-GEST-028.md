# FE-GEST-028 -- e2e: privacy-zero-egress — network inspection, 0 video frames leave the browser, INV-GEST-4 (Playwright)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
Playwright spec `privacy-zero-egress.spec.ts` instruments `page.on('request', ...)` to capture ALL network requests while detection is running; after N recognition events, asserts ZERO requests contain video frames, landmark arrays, or image byte buffers in their body; confirms that only the three whitelisted API calls are made: `POST /evnt/gesture-reports`, `POST /gest/capabilities/support-check`, `GET /edge/catalog` (INV-GEST-4).

## Approach (execution path)
1. Register `page.on('request', req => requests.push(req))` before mounting the station runtime page.
2. Run detection for 30 frames using the test harness; fire 2 recognition events.
3. After test run, inspect every captured `Request` body:
   - Assert no body contains `>1KB` binary payload (heuristic for image bytes).
   - Assert no body contains a JSON key matching `landmarks`, `frames`, `image`, or `video`.
4. Assert exactly the 3 whitelisted endpoint paths appear in the request log — no `POST /edge/heartbeat`, no `GET /camera`, no analytics with frame data.
5. `page.route` to mock the 3 endpoints with 200 OK.

## Implementation checklist (by layer/file)
- [ ] implementar `apps/gest-e2e/src/e2e/privacy-zero-egress.spec.ts`
- [ ] `page.on('request', ...)` captures all outbound requests
- [ ] Assert no request body > 1KB binary (no video frame egress)
- [ ] Assert no JSON key `landmarks/frames/image/video` in any body
- [ ] Assert exactly 3 whitelisted endpoints hit (no /edge/heartbeat from GEST)
- [ ] Uses mock adapter for 3 expected calls
- [ ] `npx nx e2e gest-e2e` PASS
- [ ] `npx nx build gest-e2e` PASS (included in e2e build)

## Acceptance criteria
- [ ] 0 video-frame or landmark bytes in any outbound request (INV-GEST-4)
- [ ] Exactly 3 API endpoints — SAFETY-GEST-1 network boundary confirmed
- [ ] `npx nx e2e gest-e2e` PASS

## Dependencies
- FE-GEST-013 (LandmarkWorker — frames stay in worker)
- FE-GEST-021 (GestShellIntegrationService — only 3 calls from GEST)
- FE-GEST-027 (sibling e2e — reuses test harness setup)

## Tenant-context impact
No patient data in any request by design — this spec PROVES it.

## Prioridade
P6
