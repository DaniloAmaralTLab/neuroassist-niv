# FE-CONV-010 -- UsageSignalHttpAdapter + UsageSignalService — POST /conv/usage-signals, outbound IndexedDB queue, opt-in guard, idempotency, 400 discard, flush

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

**SPEC refs:** SPEC-04 §1 §3, SPEC-05 §3–4 (opt-in flag + authority), BE api-contract §4, INV-CONV-6

## Outcome
`UsageSignalHttpAdapter` POSTs `{ phraseId, occurredAt, idempotencyKey }` (**no free text** — INV-CONV-6) to `POST ${ACCESS_HTTP_BASE}/conv/usage-signals`. `UsageSignalService` manages an IndexedDB outbound queue; enqueue gates on `conv.usage-signal.enabled` flag AND `conv.usage.record` authority; `flush()` sends queued signals opportunistically; `400 validation-error` → discards the offending signal without retry; playback is **never** blocked on flush.

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/api/usage-signal-http.adapter.ts` — implement `USAGE_SIGNAL_PORT`:
   - `post(signal: UsageSignalWire): Observable<void>` — POST to `${ACCESS_HTTP_BASE}/conv/usage-signals`; `202`/`200` → success; `400 validation-error` → discard (return EMPTY, no throw); other errors → retry queue.
   - `UsageSignalWire` mirrors BE record: `{ phraseId: string; occurredAt: string; idempotencyKey: string }`. **No free text field.**
2. Create `frontend/libs/conv/data-access/src/lib/usage-signal.service.ts`:
   - `enqueue(phraseId: string, occurredAt: Date): void` — guards:
     - `conv.usage-signal.enabled` flag is true; AND
     - `conv.usage.record` authority is present in the patient-session token.
     - If either is missing → no-op (no signal enqueued, no error).
   - Queue in IndexedDB (`UsageSignalQueueStore`); `idempotencyKey = '<phraseId>:<occurredAt>'`.
   - `flush(): void` — fire-and-forget; sends queued signals via `UsageSignalHttpAdapter.post()`; on success → remove from queue; on 400 → discard; on other error → keep in queue for next flush.
   - `flush()` is never called on the playback path; it runs opportunistically.
3. Unit tests: enqueue with flag off → queue empty; flush with 400 → discard; flush with network error → retained; `idempotencyKey` is `phraseId:occurredAt`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/api/usage-signal-http.adapter.ts` — POST to `${ACCESS_HTTP_BASE}/conv/usage-signals`
- [ ] `UsageSignalWire` has ONLY `phraseId`, `occurredAt`, `idempotencyKey` — NO free text (INV-CONV-6)
- [ ] 400 `validation-error` → signal discarded locally, no retry (SPEC-07 §2)
- [ ] `frontend/libs/conv/data-access/src/lib/usage-signal.service.ts` — enqueue(), flush()
- [ ] `enqueue()` gates on BOTH `conv.usage-signal.enabled` flag AND `conv.usage.record` authority
- [ ] `idempotencyKey = '<phraseId>:<occurredAt>'`
- [ ] `flush()` is fire-and-forget; playback is never blocked on it
- [ ] Network error on flush → signal retained in queue for next flush
- [ ] `npx nx test conv-data-access` PASS — opt-in gates, 400 discard, network retain
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] `enqueue()` with `conv.usage-signal.enabled=false` → queue remains empty
- [ ] `flush()` on 400 → signal discarded without retry, no error surface to patient
- [ ] `flush()` returns void immediately; playback is unblocked
- [ ] `UsageSignalWire` has no free-text field (only phraseId + occurredAt + idempotencyKey)
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-003 (USAGE_SIGNAL_PORT InjectionToken).
INT-FE-CONV-005 (access-decision stub for conv.usage.record check).

## Tenant-context impact
Usage signals are per-patient (phraseId scoped to patient); the patient-session token is the tenant/patient boundary. No cross-tenant leakage possible through the payload (no free text).
