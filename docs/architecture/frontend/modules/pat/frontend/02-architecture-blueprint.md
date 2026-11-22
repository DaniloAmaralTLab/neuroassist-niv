# 02 — Architecture Blueprint — pat (PAT) Frontend

## 1. System boundary

The PAT frontend is a **client of `pat-service`** through the API gateway, consumed exclusively via
`@neuroassist/shared/access-http-base`. It never calls a legacy system, never talks to another
module's service, and never processes patient video for recognition — the webcam is turned on only
for a tactile live-test preview (no classification; that is GEST/edge). Authentication and the
tenant-scoped JWT are delegated to ACS via `@neuroassist/shared/auth-session`; PAT consumes the
resulting session, it does not implement auth.

## 2. External actors and systems

- **Authenticated browser** — caregiver signed in via the shared auth session; the active tenant is
  the JWT `tenantId` claim (ACS api-contract §0; `X-Tenant-Id` is never trusted server-side).
- **`pat-service` (BE)** — reached through `@neuroassist/shared/access-http-base`; the interceptor
  adds the bearer token and a correlation id and normalizes `ProblemDetail` errors.
- **Webcam (`getUserMedia`)** — a browser device used only for the live-test affordance in the command
  editor; the stream is never uploaded and is stopped as soon as the test ends.
- **ACS (authz)** — issues the JWT and the `pat.*` authorities PAT guards consume.
- **HIST (audit)** — PAT does not render history, but every create/edit/remove/register emits an
  auditable action consumed by HIST downstream.
- **GEST / EDGE / EVNT (downstream consumers)** — read PAT's `Command` catalog by id; PAT publishes,
  they consume. No direct FE call.

No third-party widgets are embedded in PAT.

## 3. End-to-end user flows

### Golden path A — Add and calibrate a command (promoted Calibration screen)

```
Caregiver → Command catalog (Márcio Amaral)        [ New command ]
  ┌──────────────────────────────────────────────────────────────┐
  │ 🔴 "Help"   emergency · eyebrow raise 2x · sensitivity medium  │
  │ 🔵 "Water"  routine   · blink 2x          · sensitivity high   │
  │ 🔵 "Frog"   routine   · quick blink       · sensitivity medium │
  └──────────────────────────────────────────────────────────────┘
        │ [ New command ]
        ▼
  CommandEditor
    label:        "Water"            (free text — meaning not interpreted)
    urgency:      ( ) Emergency  (●) Routine
    gesture:      [ Raise eyebrow ▾ ]  (+ optional second gesture → compound)
    sensitivity:  Low | (Medium) | High
    duration:     min [400 ms]  max [1500 ms]
        │ [ Test now ] → webcam preview (tactile only) → success|error
        ▼ [ Save command ]
  POST/PUT → pat-service → Command persisted → prepend/replace in list
```

### Golden path B — Register a new gesture type inline

```
CommandEditor → primary/second gesture → [ + register new type ]
  → inline field "Lip reading" → save
  → POST → pat-service → new GestureType → selected immediately in the editor
  (caveat surfaced: naming a type does not imply engine support — GEST, doc 06)
```

### Golden path C — Register a patient (onboarding step)

```
Onboarding wizard (shell-orchestrated)
  step: Patient → PatientRegistrationForm { name }  (tenant from JWT)
  → POST → pat-service → Patient(active) → wizard advances to first-command step
```

### Edge cases

- Save with an empty label → submit disabled; `command_label_required` never reaches the server.
- `minGestureDurationMs ≥ maxGestureDurationMs` → blocked client-side (`gesture_duration_invalid`).
- Webcam permission denied / no device → live test shows an error state; save is still allowed (the
  test is advisory, not a gate).
- Register a gesture-type name that already exists → `ProblemDetail` mapped to a field error; no
  duplicate created.
- Remove a command referenced by past events → allowed (events keep a denormalized label in HIST);
  removal affects only future detection.
- Compound (two-primitive) command → the editor recommends a live test (higher false-negative risk,
  LBC §12 Amendment 1); the risk itself is handled in GEST, not PAT.

## 4. Internal boundaries (Nx libraries — module-as-library, ADR-006)

```
apps/pat/                                   # thin host (type:app, scope:pat)
└── src/app/app.routes.ts                   # loadChildren → @neuroassist/pat

libs/pat/   (scope:pat)                     # module-as-library; importPath @neuroassist/pat (ADR-006)
└── src/lib/
    ├── pat.module.ts                        # the only NgModule (lazy entry)
    ├── pat.contract.ts                      # MODULE_KEY + ModuleMenuMetadata + permissions + flags
    ├── pat.bootstrap.ts                     # init/destroy lifecycle
    ├── pat.routes.ts                        # PAT_ROUTES[]
    ├── pat.permission-map.ts                # ModulePermissionMap
    ├── pat.feature-flags.ts                 # ModuleFeatureFlags (defaultState)
    ├── pat.nav.config.ts                    # navigation / breadcrumb
    ├── pat.descriptor.ts                    # PAT_MODULE_DESCRIPTOR (consumed by the Shell)
    ├── pat.providers.ts                     # providePat({ adapter }) — default 'http'
    ├── access/           (type:domain)      # canManageCatalogGuard (AccessDecisionService)
    ├── data-access/      (type:data-access) # PATIENT_PORT, COMMAND_PORT, GESTURE_TYPE_PORT +
    │                                        #   Http/Mock adapters + signal facades + <X>Wire mappers
    ├── feature-command-catalog/ (type:feature)  # list + editor + calibration + live test
    ├── feature-patient-registry/(type:feature)  # patient registration (onboarding step)
    ├── integration/      (type:domain)      # PatShellIntegrationService
    ├── navigation/       (type:domain)      # breadcrumbs state
    └── ui/ (optional)    (type:ui)          # pat-local presentational components

apps/pat-e2e/                               # Playwright specs
```

Tags: `scope:pat` + `type:{feature|data-access|domain|ui|app}`. A `scope:pat` lib may import only
`scope:pat` and `scope:shared` (`nx-boundaries.md`). The Shell (`scope:web`) imports
`@neuroassist/pat` in `config/module-descriptors.ts` via `PAT_MODULE_DESCRIPTOR`.

## 5. Cross-cutting concerns

| Concern | How PAT handles it |
|---|---|
| AuthN / session | `@neuroassist/shared/auth-session` — PAT consumes claims, never implements login. |
| Active tenant | JWT `tenantId` claim (ACS §0); `@neuroassist/shared/tenant-context` mirrors it for display. PAT reads, never writes. |
| AuthZ / RBAC | `@neuroassist/shared/access-decision` — `AccessDecisionService.can('pat.command.create' \| 'pat.command.edit' \| 'pat.command.remove' \| 'pat.patient.create' \| 'pat.gesture-type.create')`; guards consume its output. |
| HTTP | `@neuroassist/shared/access-http-base` — correlation + bearer-token + error-normalize interceptors; base `${ACCESS_HTTP_BASE}/pat`. |
| Errors | BE `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → user message via `@neuroassist/shared/ui-feedback`. |
| Observability | `@neuroassist/shared/observability` — command create/edit/remove + calibrate timings; never `console.log`. |
| Design tokens | Tailwind v4 oklch tokens via `@neuroassist/shared/ui-tokens`; dark default; CDK primitives (no Material). |
| Webcam | `getUserMedia` confined to the live-test component; stream stopped on destroy / stop / save; never uploaded. |
| i18n | None — English-only (ADR-018). Strings kept in one place for a future additive locale layer. |
