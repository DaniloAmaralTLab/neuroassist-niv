# INT-FE-GEST-004 -- libs/edge StationLivenessPort implementation — EDGE team delivers setDetectionState + beatNow (SAFETY-GEST-1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
`libs/edge` delivers a concrete `StationLivenessPort` implementation (`EdgeStationLivenessService`) that calls `POST /edge/heartbeat` with `{stationId, detectionState, reason, engineVersion}` via `fetch({keepalive:true})` on the `beatNow()` path; GEST depends ONLY on the `StationLivenessPort` interface (defined in `libs/gest/integration`) — it never imports `libs/edge` directly; SAFETY-GEST-1 is CLOSED by this implementation.

## Context / Problem statement
SAFETY-GEST-1 principle: exactly one sender of `POST /edge/heartbeat` = `libs/edge`. GEST's `GestShellIntegrationService` calls `StationLivenessPort.setDetectionState() + beatNow()` — these are in-process calls. `libs/edge` registers the concrete implementation at app startup via Angular DI. The GEST FE team defines the interface; the EDGE FE team implements it.

Interface (defined by GEST, consumed by EDGE):
```typescript
// libs/gest/integration/src/lib/station-liveness.port.ts
export interface StationLivenessPort {
  setDetectionState(state: DetectionStateEnum, reason: string, engineVersion: string): void;
  beatNow(): void;
}
export const STATION_LIVENESS_PORT = new InjectionToken<StationLivenessPort>('StationLivenessPort');
```

The `beatNow()` implementation in `libs/edge` MUST use `fetch({keepalive:true})` so the beat survives `visibilitychange → hidden`.

## Action required
1. GEST FE team publishes `StationLivenessPort` interface + `STATION_LIVENESS_PORT` token from `libs/gest/integration`.
2. EDGE FE team implements `EdgeStationLivenessService implements StationLivenessPort` in `libs/edge`.
3. Host shell (resolved by INT-FE-GEST-003) provides `{provide: STATION_LIVENESS_PORT, useClass: EdgeStationLivenessService}` in root providers.
4. `libs/edge` heartbeat implementation: `fetch('/edge/heartbeat', {method:'POST', keepalive:true, body: JSON.stringify({...}), headers:{'Authorization': 'Bearer <device-token>'}})`.

## Implementation checklist
- [ ] GEST team publishes `StationLivenessPort` interface + `STATION_LIVENESS_PORT` InjectionToken
- [ ] EDGE team implements `EdgeStationLivenessService` with `fetch({keepalive:true})`
- [ ] Host shell registers the provider (after INT-FE-GEST-003 resolution)
- [ ] FE-GEST-029 e2e verifies liveness transitions (SAFETY-GEST-1 e2e proof)
- [ ] SAFETY-GEST-1 closure confirmed when EDGE FE opens its own EDGE-LIVENESS-001 issue

## Dependencies
- FE-GEST-021 (GestShellIntegrationService — GEST caller)
- INT-FE-GEST-003 (G1 host shell — where provider lives)

## Prioridade
P2 (interface from GEST; EDGE implementation is an EDGE-module task)
