# FE-GEST-026 -- Observability telemetry — schema-whitelisted events, never frames/landmarks, GestTelemetryService

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`GestTelemetryService` emits structured telemetry events via `@neuroassist/observability`; ALL event schemas are explicitly whitelisted (no open-ended `payload: any`); frames, landmarks, and video bytes are NEVER included in any telemetry event (INV-GEST-4, SPEC-09 §5); telemetry does not log any patient data or caregiver PII.

## Approach (execution path)
Whitelisted event schemas:
- `gest.detection.state_changed`: `{from: DetectionStateEnum, to: DetectionStateEnum, reason: string, engineVersion: string}`
- `gest.recognition.fired`: `{commandId: string, confidence: number, recognitionWindowMs: number}` — NO `landmarks`, NO `frames`
- `gest.report.enqueued`: `{reportId: string, commandId: string}` — NO gesture payload bytes
- `gest.report.sent`: `{reportId: string, attemptNumber: number, latencyMs: number}`
- `gest.report.failed`: `{reportId: string, attemptNumber: number, errorCode: string}`
- `gest.report.expired`: `{reportId: string, queuedForMs: number}`
- `gest.camera.state_changed`: `{from: CameraState, to: CameraState}`
- `gest.model.state_changed`: `{from: ModelState, to: ModelState}`

Each method: `trackDetectionStateChanged(from, to, reason, engineVersion)`, etc. — typed, no `any`.

Spec: (a) each `track*` method emits the correct event name; (b) no emitted event contains `landmarks` or `frames` or video bytes; (c) `gest.recognition.fired` schema has no raw gesture payload.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/integration/src/lib/gest-telemetry.service.ts`
- [ ] implementar `frontend/libs/gest/integration/src/lib/gest-telemetry.service.spec.ts`
- [ ] All 8 event schemas typed — no `payload: any`
- [ ] No frames/landmarks/video bytes in any event (INV-GEST-4)
- [ ] Schema for `gest.recognition.fired` has no raw gesture data
- [ ] Uses `@neuroassist/observability` (not `console.log`)
- [ ] `npx nx test gest-integration` PASS
- [ ] `npx nx build gest-integration` PASS (1 extra for integration spec)

## Acceptance criteria
- [ ] 8 whitelisted schemas — no `any`
- [ ] `gest.recognition.fired` has no landmarks/frames — INV-GEST-4 proven
- [ ] `npx nx test gest-integration` PASS

## Dependencies
- FE-GEST-021 (GestShellIntegrationService — wires `track*` calls)

## Tenant-context impact
No patient or caregiver data in any event schema.

## Prioridade
P5
