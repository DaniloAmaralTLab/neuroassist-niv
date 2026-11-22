# INT-FE-CONV-004 -- shared/observability correlation id — X-Correlation-Id propagated from conv-auth.interceptor.ts to TelemetryService, distributed trace alignment

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

**SPEC refs:** SPEC-07 §4, generator-config.yml §observability_events

**Owner:** CONV team (adds correlation id propagation to conv-auth.interceptor.ts); coordination with shared/observability maintainer.

## Outcome
`conv-auth.interceptor.ts` (FE-CONV-018) generates or forwards an `X-Correlation-Id` header on every CONV HTTP egress request. The same correlation id is passed to `TelemetryService.setCorrelationId(id)` before each request so that all telemetry events emitted during that request's lifecycle are tagged with the same id. This enables distributed trace alignment between the FE telemetry and the BE structured logs.

## Approach (execution path)
1. In `conv-auth.interceptor.ts` (FE-CONV-018), extend the intercept logic:
   - If the request already carries `X-Correlation-Id` (forwarded from an upstream source) → use it.
   - Else → generate `crypto.randomUUID()`.
   - Clone the request to add `{ headers: req.headers.set('X-Correlation-Id', correlationId) }`.
   - Inject `@neuroassist/shared/observability` `TelemetryService`.
   - `TelemetryService.setCorrelationId(correlationId)` — sets the active correlation id for this request's telemetry window.
2. `TelemetryService.emit(eventName, attributes)` (from FE-CONV-022) appends `{ correlationId }` to every attribute map when a correlation id is active.
3. After the response (finally): `TelemetryService.clearCorrelationId()` — reset to avoid correlation id bleed across requests.
4. Unit test: interceptor on outgoing request → `X-Correlation-Id` header present; `TelemetryService.setCorrelationId()` called with same id.

**Note:** `TelemetryService.setCorrelationId` / `clearCorrelationId` must be thread-safe enough for Angular's zone-based model (a signal-based slot per interceptor invocation is preferred over a shared mutable string).

## Implementation checklist (by layer/file)
- [ ] `libs/conv/access/src/lib/conv-auth.interceptor.ts` — adds `X-Correlation-Id` on every CONV HTTP egress
- [ ] UUID generated via `crypto.randomUUID()` (no third-party lib)
- [ ] `TelemetryService.setCorrelationId(correlationId)` called before forwarding request
- [ ] `TelemetryService.clearCorrelationId()` called in `finalize()` after response
- [ ] `TelemetryService.emit()` (from FE-CONV-022) appends `correlationId` to event attributes
- [ ] `npx nx test conv-access` PASS — X-Correlation-Id header present; TelemetryService called; cleared after
- [ ] `npx nx lint conv-access` PASS

## Acceptance criteria
- [ ] Every CONV HTTP egress request carries `X-Correlation-Id` header
- [ ] Telemetry events emitted during the request lifecycle carry the same correlation id
- [ ] `clearCorrelationId()` is called after every request (no bleed across requests)
- [ ] `npx nx test conv-access` PASS; `npx nx lint conv-access` PASS

## Dependencies
FE-CONV-018 (conv-auth.interceptor.ts — base interceptor being extended here).
FE-CONV-022 (TelemetryService.emit — correlation id attribute propagation).

## Tenant-context impact
None — correlation ids are request-scoped UUIDs; they carry no tenant identity.
