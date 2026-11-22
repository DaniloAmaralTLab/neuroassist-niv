# SPEC-02 — Command calibration orchestration (core)

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Decision: `../../adr/ADR-003-command-calibration-model.md`. Anchor action `CommandCalibrated`.

## Objetivo

Specify the core value act of PAT: authoring and re-tuning a per-command calibration that
maps a facial gesture (simple or compound) to a family-defined need, and the patient
lifecycle it hangs off.

## Escopo

- **In:** RegisterPatient / Deactivate / Reactivate; CreateCommand, CalibrateCommand,
  RetireCommand; the `CommandCalibrated` (anchor) and patient/command audit actions.
- **Out:** catalog read/distribution (SPEC-03), the gesture-type vocabulary writes (SPEC-03),
  persistence DDL (SPEC-04), concurrency (SPEC-05).

## Decisões técnicas

- Calibration is a property of the **`Command`**, not the `Patient` (ADR-003): each command
  owns its `CalibrationWindow` (`minGestureTimeMs`/`maxGestureTimeMs`) and `Sensitivity`.
- A command's gesture is a `GestureComposition`: required `primaryPrimitive`, optional
  distinct `secondaryPrimitive` (INV-PAT-4).
- `CommandCalibrated` is emitted on **both** create (`changeKind=created`) and re-calibrate
  (`changeKind=recalibrated`) — one anchor action covers the value act (event-contracts §1.2).
- Each use case audits to HIST within the transaction boundary before returning (doc 04).

## Implementação

Use-case services (`application/`):

- `RegisterPatient(label, deviceId?)` → persist `active` patient, audit `PatientRegistered`.
- `DeactivatePatient(id)` → `status=inactive`, audit `PatientDeactivated`.
- `ReactivatePatient(id)` → `status=active`, audit `PatientReactivated`.
- `CreateCommand(patientId, label, urgency, sensitivity, primaryPrimitive, secondaryPrimitive?, min, max)`
  → validate window + composition, resolve primitive ids against `gesture_type` (app-layer,
  INV-PAT-4/G2), persist `active`, audit `CommandCalibrated(changeKind=created)`.
- `CalibrateCommand(commandId, <partial>)` → reject if `retired` (`409 command-retired`),
  re-validate window/composition, apply changed fields, bump `updatedAt`, audit
  `CommandCalibrated(changeKind=recalibrated)`.
- `RetireCommand(commandId)` → `status=retired` (terminal), audit `CommandRetired`; idempotent.

Pseudocode — CalibrateCommand:

```
cmd = commandRepo.findInTenant(id, jwt.tenantId) or throw NotFound   // INV-PAT-2 -> 404
if cmd.status == retired: throw Conflict(command-retired)             // INV-PAT-5
apply(changedFields)
validateWindow(cmd.min, cmd.max)                                     // INV-PAT-3
validateComposition(cmd.primary, cmd.secondary, gestureTypeRepo)     // INV-PAT-4 (app-layer)
cmd.updatedAt = now()
commandRepo.save(cmd)
histAudit(CommandCalibrated, changeKind=recalibrated, correlationId)  // same tx
```

## Casos de borda

- No-op PATCH (nothing actually changes) → `200`, no audit (event-contracts §3).
- Create on a cross-tenant / missing patient → `404`.
- Deactivating a patient does not retire its commands (catalog retained; reads still resolve by id).

## Critérios de aceite (EARS)

- WHEN a caller with `pat.command.create` creates a valid command, THE SYSTEM SHALL persist it `active` and audit `CommandCalibrated` with `changeKind=created` (INV-PAT-4).
- WHEN a caller with `pat.command.calibrate` updates an `active` command, THE SYSTEM SHALL re-validate window and composition, apply the change, and audit `CommandCalibrated` with `changeKind=recalibrated` (INV-PAT-3, INV-PAT-4).
- IF the target command is `retired`, THEN THE SYSTEM SHALL respond `409 command-retired` and leave the row unchanged (INV-PAT-5).
- WHEN a command is retired, THE SYSTEM SHALL set `status=retired` (terminal) and SHALL exclude it from the default catalog read while keeping it resolvable by id (INV-PAT-5).
- IF `minGestureTimeMs <= 0` or `maxGestureTimeMs < minGestureTimeMs`, THEN THE SYSTEM SHALL reject the write `400 validation-error` (INV-PAT-3).
