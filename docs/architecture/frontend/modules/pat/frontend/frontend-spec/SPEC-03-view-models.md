# SPEC-03 — View Models — pat (PAT) Frontend

> View-models are TypeScript `record`-style read-only shapes exposed from facade signals.
> VMs carry only data the template renders; gating booleans come from `AccessDecisionService`.
> Facades MUST NOT fabricate missing fields as `null` fillers — a field absent from the BE wire
> record is modelled explicitly, not invented (carry-forward `fe-facade:fabricated-null-fields`).
> Sources: `frontend/03-domain-framing-frontend.md` §2–§5, `frontend/05-state-and-data-flow.md`.

## 1. `CommandCatalogVM` (promoted Calibration screen)

```ts
type Urgency = 'emergency' | 'routine';              // closed set (INV-PAT, data model)
type Sensitivity = 'low' | 'medium' | 'high';        // closed set

interface CommandRowVM {
  id: string;
  label: string;                 // free-form; UI never interprets its meaning
  urgency: Urgency;
  sensitivity: Sensitivity;
  gestureDescription: string;    // derived: primaryPrimitive.displayName [+ ' + ' + secondary]
  minGestureTimeMs: number;
  maxGestureTimeMs: number;
  status: 'active' | 'retired';
}
interface CommandCatalogVM {
  patient: { id: string; name: string };
  commands: CommandRowVM[];
  gestureTypes: { id: string; code: string; displayName: string }[];
  totals: { commands: number; emergency: number };   // computed()
  listState: 'idle' | 'loading' | 'success' | 'error';
  canCreate: boolean;            // AccessDecisionService.can('pat.command.create')
  canCalibrate: boolean;         // AccessDecisionService.can('pat.command.calibrate')
  canRetire: boolean;            // AccessDecisionService.can('pat.command.retire')
}
```

- UI events: `commandCreated`, `commandRecalibrated` (anchor `CommandCalibrated`), `commandRemoved`,
  `gestureTypeRegistered`.
- Default `status` filter is `active`; retired commands are excluded from the catalog list
  (INV-PAT-5) but remain resolvable by id for historical EVNT/HIST references.

## 2. `CommandEditorVM` (in-page panel; prototype parity "changes only take effect once saved")

```ts
interface CommandEditorForm {
  label: string;
  urgency: Urgency;
  primaryPrimitive: string;            // GestureType id (required)
  secondaryPrimitive: string | null;   // GestureType id — compound; must differ from primary
  sensitivity: Sensitivity;
  minGestureTimeMs: number;             // first-class control (resolves gap R2)
  maxGestureTimeMs: number;             // first-class control; must be > min
}
interface CommandEditorVM {
  mode: 'new' | 'edit';
  form: CommandEditorForm;
  test: 'idle' | 'testing' | 'success' | 'error';   // live webcam test; advisory only
  newType: { open: 'primary' | 'secondary' | null; name: string; code: string };
  submitState: 'editing' | 'submitting' | 'error';
  fieldErrors: Record<'label' | 'gesture' | 'duration', string | null>;
}
```

- Invariant: `save` is disabled while `label` is blank, `primaryPrimitive` is unset, or
  `minGestureTimeMs >= maxGestureTimeMs` — these never reach the server (`command_label_required`,
  `gesture_duration_invalid` are blocked client-side).
- `secondaryPrimitive` must differ from `primaryPrimitive`; equal values are a client-side `gesture`
  field error (mirrors INV-PAT-4).
- On `gesture-type-code-taken` (409) the BE `type` slug maps to `newType` field error (SPEC-07).
- The live webcam `test` state is advisory: a denied/failed camera (`webcam_unavailable`) sets
  `test = 'error'` and never disables `save`.

## 3. `PatientRegistrationVM` (onboarding patient step)

```ts
interface PatientRegistrationVM {
  form: { name: string };              // label on the wire; tenant derived from JWT, not entered
  submitState: 'editing' | 'submitting' | 'error';
  fieldErrors: Record<'name', string | null>;
}
```

- Invariant: `submit` is disabled while `name` is blank. On success the anchor event
  `PatientRegistered` is audited by the BE; the FE advances the shell wizard to the first-command step.

## 4. VM ↔ wire mapping

Each VM is produced by a `to<X>(wire)` mapper over a `<X>Wire` type that mirrors the BE record shape
1:1 (carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`). `CommandWire` carries
`primaryPrimitive` / `secondaryPrimitive` as resolved `{ id, code, displayName }` objects on **reads**
(api-contract §2.2/§2.4), while **create/calibrate requests** send them as bare gesture-type ids —
the mapper converts `CommandEditorForm` → request body and `CommandWire` → `CommandRowVM`. Mappers
live in `libs/pat/data-access`; wire types mirror the BE JSON bodies in the api-contract.

## Criterios de aceite (EARS)

- WHILE `CommandCatalogVM.listState = 'loading'`, THE SYSTEM SHALL render the catalog skeleton and SHALL NOT render the empty state.
- WHILE `CommandCatalogVM.listState = 'success'` and `commands` is empty, THE SYSTEM SHALL render the empty state.
- WHILE a command has `status = 'retired'`, THE SYSTEM SHALL exclude it from the default active catalog list.
- WHILE the command editor has a blank `label`, an unset `primaryPrimitive`, or `minGestureTimeMs >= maxGestureTimeMs`, THE SYSTEM SHALL keep the save control disabled and SHALL NOT send the request.
- IF the editor `secondaryPrimitive` equals `primaryPrimitive`, THEN THE SYSTEM SHALL show a gesture field error and SHALL NOT send the request.
- WHILE the live webcam test is in the `error` state, THE SYSTEM SHALL keep the save control enabled because the test is advisory.
- WHERE a command uses a second gesture primitive, THE SYSTEM SHALL mark it compound and recommend a live test without forcing it.
- IF a BE wire record omits an optional field, THEN THE SYSTEM SHALL model it as explicitly absent and SHALL NOT fabricate a placeholder value.
