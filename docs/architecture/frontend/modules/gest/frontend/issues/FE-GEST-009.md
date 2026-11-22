# FE-GEST-009 -- ReportFacade — durable offline queue, RetryScheduler, exactly-once pessimistic delivery, 24h expiry (INV-GEST-1, INV-GEST-5)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/11 itens

## Outcome
`ReportFacade` maintains a durable per-station queue (IndexedDB/localStorage) persisting only `{reportId, commandId, occurredAt, attempts}` — never a frame or landmark (INV-GEST-4); each report is held `'sending'` until EVNT confirms `201`/`200`; the `reportId` is reused across every retry so EVNT deduplicates to exactly one event (INV-GEST-1); items older than 24h expire and are surfaced, not silently lost or re-stamped (INV-GEST-5).

## Approach (execution path)
1. `ReportFacade.enqueue(recognition: RecognitionVM)`: add `{reportId, commandId, occurredAt, attempts:0, status:'queued'}` to durable store; never store confidence/landmarks/frames beyond the allowed wire fields.
2. `RetryScheduler`: listens to `navigator.onLine` + `'online'` DOM event; drains pending queue with exponential backoff; respects `Retry-After` header on `503`.
3. `report(item)`: POST via `GestureReportPort`; `201/200` → dequeue as `'sent'`; `503 catalog-unavailable` + `Retry-After` → reschedule; `400 occurred-at-out-of-bounds` or `age > 24h` → mark `'expired'`, drop, surface; `401/403` → stop all retries, signal station-unpaired.
4. `persistQueue()`: writes pending items to durable store (called on destroy).
5. `queueVm()` signal: `Signal<ReportQueueVM>` derived from store.
6. Spec: (a) enqueue mints a `reportId`; (b) retry reuses the SAME `reportId`; (c) `201` dequeues item; (d) item age > 24h → `'expired'`, `occurredAt` NOT re-stamped; (e) `401` stops `RetryScheduler`; (f) persisted items survive a reload simulation.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/report.facade.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/report.facade.spec.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/retry-scheduler.ts`
- [ ] Durable store persists ONLY `{reportId, commandId, occurredAt, attempts}` — never frames/landmarks
- [ ] Same `reportId` reused across every retry attempt (INV-GEST-1)
- [ ] Items > 24h → `'expired'`, `occurredAt` never re-stamped (INV-GEST-5)
- [ ] `401/403` → RetryScheduler stops; station-unpaired signal emitted
- [ ] `Retry-After` header respected on `503`
- [ ] `persistQueue()` called in destroy (FE-GEST-005)
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] Spec proves same `reportId` on every retry (INV-GEST-1)
- [ ] Spec proves expired items `occurredAt` NOT re-stamped (INV-GEST-5)
- [ ] `401` stops all retries — spec proves this
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-006 (GestureReportPort)
- FE-GEST-011 (RuntimeFacade — station-unpaired signal propagation)

## Tenant-context impact
Queue is per-station (edge.device identity); no tenant PII stored in the queue.

## Prioridade
P2
