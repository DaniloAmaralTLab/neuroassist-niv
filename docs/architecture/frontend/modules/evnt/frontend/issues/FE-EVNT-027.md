# FE-EVNT-027 -- [SAFETY] DetectionLapse wire + mappers + DetectionLapseVM

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/api` gains the detection-lapse wire records (`DetectionLapseWire`, `DetectionLapsePageWire`, `DetectionLapseAckResultWire`) mirroring the BE 1:1 (api-contract §11–12), plus `toDetectionLapseVM` producing `DetectionLapseVM` / `DetectionLapseAlertVM` (SPEC-03 §4c). `patientName` is joined from the name resolver, never fabricated (G-EVNT-6).

## Context / Problem statement

- SAFETY-GEST-1 (ADR-006 / BE SPEC-12): a station connected but not detecting is a life-safety condition surfaced as a DISTINCT "station not detecting" alert — a separate read from `active-alarm` (LAPSE-3).
- Wire shapes mirror BE exactly (`http-adapter:fe-dto-drift:be-record-shape-not-mirrored`); `detectionState` stays nullable (optional BE field — never guessed).
- `DetectionLapseAlertVM.suppressedByEmergency` encodes LAPSE-6 precedence; `status` drives auto-clear (SPEC-03 §4c).

## Approach (execution path)

1) Add `DetectionLapseWire` / `DetectionLapsePageWire` / `DetectionLapseAckResultWire` to `libs/evnt/api` mirroring api-contract §11–12.
2) Add `toDetectionLapseVM(wire)` → `DetectionLapseVM`; derive `DetectionLapseAlertVM` (state, lapses[], suppressedByEmergency, canRead) in the facade's `computed`.
3) Join `patientName` via the existing name resolver (reuse FE-EVNT-008); never fabricate from the lapse wire.
4) Unit tests: cause/status/detectionState map verbatim; nullable `detectionState`/`acknowledgedAt`/`resolvedAt` preserved.

## Non-goals

- No HTTP service / facade here (FE-EVNT-028).
- No per-lapse escalation-attempts VM — the contract exposes none (SPEC-03 §4c, SPEC-04 §6.5).

## Layer(s)

frontend / data-access (`libs/evnt/api`, `libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4c
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §3/§6

## Architecture alignment

- Wire mirrors BE 1:1; VM never fabricates names (G-EVNT-6)
- Standalone + Signals; live projection, never a store
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access**
- [ ] `libs/evnt/api/src/lib/detection-lapse.wire.ts`
- [ ] `libs/evnt/api/src/lib/detection-lapse.mapper.ts` (toDetectionLapseVM)
- [ ] `libs/evnt/data-access/src/lib/detection-lapse.vm.ts` (DetectionLapseVM / DetectionLapseAlertVM)

**Tests**
- [ ] `npx nx test evnt` PASS (wire mirror; nullable fields preserved; patientName joined not fabricated)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P2
safety:detection-lapse

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- `DetectionLapseVM.detectionState` is `null` when the BE omits it (never a guessed state)
- `patientName` joined from the resolver, never fabricated from the lapse wire

## Dependencies

- FE-EVNT-008 (Wire mappers + name resolver)

## Tenant-context impact

Lapse list is per-linked-patient-per-tenant (INV-EVNT-7).

## Risks / Notes

- SAFETY: the VM must NEVER let a lapse be rendered as the emergency takeover (LAPSE-3).

## Prioridade

P2
