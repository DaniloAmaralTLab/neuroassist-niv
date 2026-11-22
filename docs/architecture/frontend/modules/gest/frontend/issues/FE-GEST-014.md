# FE-GEST-014 -- ClassifierService + sensitivityThreshold + reportIdMinter — landmark→multi-class score, sensitivity map, idempotent reportId (INV-GEST-3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`ClassifierService` maps facial landmark arrays to multi-class confidence scores for the active command's primitive codes; `sensitivityThreshold(sensitivity)` maps the `Sensitivity` enum to a documented confidence threshold (INV-GEST-3); `reportIdMinter()` generates a station-unique UUID minted ONCE per `commandRecognised` event (never reused for a NEW recognition, but carried unchanged across retries — INV-GEST-1). All three live in `libs/gest/detection` (`type:domain`, no `HttpClient`).

## Approach (execution path)
1. `ClassifierService.score(landmarks: Landmark[][], command: ActiveCommandVM): {code: string; confidence: number}[]`: computes a confidence score per primitive code; uses the trained heuristic (or placeholder with ADR-005 engine abstraction) against the landmark geometry.
2. `sensitivityThreshold(sensitivity: 'low' | 'medium' | 'high'): number`: maps `high→0.90`, `medium→0.70`, `low→0.50` (thresholds per ADR-005; documented here, not hardcoded inline; spec must assert these exact values).
3. `reportIdMinter(): string`: returns a fresh `crypto.randomUUID()` stamped once at recognition (not at retry); `ReportFacade` stores this ID and reuses it on every retry.
4. Spec: (a) `sensitivityThreshold('high')` returns `0.90`; (b) confidence >= threshold → candidate for recognition; (c) `reportIdMinter()` returns a new UUID each call (two consecutive calls → different IDs); (d) `ClassifierService.score()` returns one entry per primitive code.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/detection/src/lib/classifier.service.ts`
- [ ] implementar `frontend/libs/gest/detection/src/lib/sensitivity-threshold.ts`
- [ ] implementar `frontend/libs/gest/detection/src/lib/report-id-minter.ts`
- [ ] `sensitivityThreshold` mapping spec-verified (high=0.90, medium=0.70, low=0.50 or ADR-005 value)
- [ ] `reportIdMinter()` returns a new UUID per call — NOT the same ID twice for different recognitions
- [ ] No `HttpClient` import (pure domain)
- [ ] `npx nx test gest-detection` PASS
- [ ] `npx nx build gest-detection` PASS

## Acceptance criteria
- [ ] `sensitivityThreshold` values spec-verified against ADR-005 documented thresholds
- [ ] Two consecutive `reportIdMinter()` calls return different IDs
- [ ] `npx nx test gest-detection` PASS

## Dependencies
- FE-GEST-013 (LandmarkWorker provides landmark arrays)
- FE-GEST-010 (CatalogFacade provides `ActiveCommandVM.sensitivity`)

## Tenant-context impact
None — pure local computation; no tenant data.

## Prioridade
P3
