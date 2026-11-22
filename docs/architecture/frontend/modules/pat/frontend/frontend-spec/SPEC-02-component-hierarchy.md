# SPEC-02 — Component Hierarchy — pat (PAT) Frontend

> Standalone-first, OnPush mandatory. Smart components consume facades (signals);
> presentational components receive `input()`s and emit `output()`s and hold no HttpClient.
> Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/03-domain-framing-frontend.md` §2,
> `frontend/04-frontend-architecture-direction.md` §3. SPEC-02 is prose (no EARS section).

## 1. `feature-command-catalog` (promoted Calibration screen)

```
CommandCatalogPageComponent           (smart · OnPush)   route /patients/:patientId/commands
│  reads:  commandFacade.vm()            Signal<CommandCatalogVM>
│          commandFacade.listState()     Signal<'idle'|'loading'|'success'|'error'>
│          gestureTypeFacade.types()     Signal<GestureTypeVM[]>
│          patientFacade.active()         Signal<{ id; name } | null>   (breadcrumb)
│          accessDecision.can('pat.command.create')    → canCreate
│          accessDecision.can('pat.command.calibrate')  → canCalibrate
│          accessDecision.can('pat.command.retire')     → canRetire
├── CommandListComponent              (presentational)
│     input:  commands: CommandRowVM[]
│     input:  canCalibrate: boolean
│     input:  canRetire: boolean
│     output: edit   = commandId
│     output: remove = commandId
│   └── CommandRowComponent           (presentational)
│         shows label, urgency badge (🔴 emergency / 🔵 routine), gestureDescription, sensitivity
├── CommandEditorPanelComponent       (presentational · in-page panel, mode new|edit)
│     input:  vm: CommandEditorVM
│     input:  gestureTypes: GestureTypeVM[]
│     output: save            = CommandEditorForm
│     output: cancel          = void
│     output: registerType    = { slot: 'primary'|'secondary'; name; code }
│     output: liveTestToggle  = 'start'|'stop'
│   ├── DurationWindowControlComponent (presentational)   ← resolves gap R2
│   │     input:  minMs, maxMs; output: change = { minMs, maxMs }
│   │     (two numeric/slider inputs; enforces min < max before enabling save)
│   ├── GestureSlotComponent          (presentational)  primary + optional secondary primitive
│   │     output: openRegisterType = slot
│   └── LiveWebcamTestComponent       (presentational)  getUserMedia confined here (SPEC-05 §webcam)
│           shows 'idle'|'testing'|'success'|'error'; advisory only — never gates save
├── EmptyStateComponent               (shared ui-feedback) — shown WHILE listState = 'success' and commands empty
└── PageErrorComponent                (shared ui-feedback) — shown WHILE listState = 'error' (Retry)
```

- The compound (two-primitive) command surfaces a non-blocking recommendation to run the live test
  (higher false-negative risk, LBC §12 Amendment 1); the risk itself is owned by GEST, not PAT.
- Registering a gesture type inline surfaces the honest caveat that naming a type does not imply the
  detection engine recognises it (R1 / INV-PAT-6; the mapping is a GEST concern).

## 2. `feature-patient-registry` (onboarding patient step)

```
PatientRegistrationPageComponent      (smart · OnPush)   route /patients/register
│  reads:  patientFacade.registerState()  Signal<'editing'|'submitting'|'error'>
│          accessDecision.can('pat.patient.create')  → canRegister
└── PatientRegistrationFormComponent   (presentational)
      input:  submitting: boolean
      input:  fieldErrors: Record<'name', string | null>
      output: submit = { name }        // tenant derived from JWT, never entered
```

- The wizard chrome (step-to-step orchestration across ACS → PAT → EDGE) is **shell-owned**
  (`frontend/06` gap); PAT contributes only the patient-registry panel and, on success, hands control
  back so the wizard can advance to the first-command step rendered by `feature-command-catalog`.

## 3. Component rules (all features)

- Every component is `standalone: true`, `changeDetection: OnPush`.
- No component imports `HttpClient`; all server access is through a facade (SPEC-04).
- No component evaluates a role inline; gating booleans come from `AccessDecisionService.can(...)`.
- Presentational components are pure: inputs in, outputs out, no injected facade.
- `LiveWebcamTestComponent` stops every `getUserMedia` track on stop / save / `ngOnDestroy`; the
  stream is never uploaded (R5 / SPEC-05 webcam rule).
- Accessibility carry-forwards (Learning): the urgency/sensitivity `<select>` controls carry an
  accessible name (`fe-component:a11y-select-name`); the editor returns focus to the triggering row
  after an in-flight save completes (`fe-component:modal-focus-return`); duration values use
  locale-aware number formatting, never `toFixed` (`fe-component:kpi-decimal-format`).
- Styling via Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`); dark is
  default; no hardcoded colour/spacing (see `contracts/design-tokens.md`).
