# 03 — Domain Framing (Frontend) — pat (PAT)

> Mirrors the backend ubiquitous language. This document does **not** redefine domain terms — it
> references the shared glossary, `_brief.md` and the project data model, and frames the UI-side view
> models, events and state transitions.

## 1. Ubiquitous language (mirror — do not redefine)

Canonical definitions live in `techlab-ba/projects/neuroassist-niv/business/glossary.md` and the
project data model. PAT-relevant terms:

| Term | Source of truth | PAT FE note |
|---|---|---|
| Patient | data model | Person monitored by the system; subject of the catalog, never a PAT operator. `tenantId` from JWT. |
| Command | data model · LBC Amendment 1 | Catalog item: gesture (simple or compound) → free-form `label`, with per-command calibration. |
| GestureType | data model · LBC Amendment 2 | Catalog of movement primitives; **extensible** — naming one does not imply engine support. |
| sensitivity | data model enum | `low` \| `medium` \| `high` — how faint a signal still triggers the command. |
| urgency | data model enum | `emergency` \| `routine` — drives EVNT routing (full-screen alarm vs discreet notice). |
| min/max gesture duration | Command fields | `minGestureDurationMs` / `maxGestureDurationMs` — the time window a gesture must occupy to count. |
| Caregiver | glossary · ACS | Human operator of PAT; `role` ∈ {`caregiver`, `clinic_coordinator`}. |

## 2. View models (draft, per screen)

### `CommandCatalogVM` (promoted Calibration screen)
```
patient: { id: string; name: string }
commands: {
  id: string
  label: string
  urgency: 'emergency' | 'routine'
  gestureDescription: string          // e.g. "eyebrow raise + blink"
  sensitivity: 'low' | 'medium' | 'high'
}[]
gestureTypes: { id: string; name: string }[]
totals: { commands: number; emergency: number }
canCreate: boolean                     // AccessDecisionService.can('pat.command.create')
canCalibrate: boolean                  // AccessDecisionService.can('pat.command.edit')
loading: boolean
```

### `CommandEditorVM`
```
mode: 'new' | 'edit'
form: {
  label: string
  urgency: 'emergency' | 'routine'
  primaryPrimitive: string             // GestureType id
  secondaryPrimitive: string | null    // GestureType id — compound
  sensitivity: 'low' | 'medium' | 'high'
  minGestureDurationMs: number
  maxGestureDurationMs: number
}
test: 'idle' | 'testing' | 'success' | 'error'
newType: { open: 'primary' | 'secondary' | null; name: string }
submitting: boolean
fieldErrors: Record<'label'|'gesture'|'duration', string | null>
```

### `PatientRegistrationVM` (onboarding step)
```
form: { name: string }                 // tenant derived from JWT, not entered
submitting: boolean
fieldErrors: Record<'name', string | null>
```

## 3. UI events (user-triggered, change state)

| Event | Trigger | Effect |
|---|---|---|
| `commandCreated` | Editor save in `new` mode | POST command; prepend to the list. |
| `commandRecalibrated` | Editor save in `edit` mode | PUT command; replace the row (anchor event `CommandCalibrated`). |
| `commandRemoved` | Row remove confirm | DELETE command; drop from the list. |
| `gestureTypeRegistered` | Inline "+ register type" save | POST gesture type; select it in the open slot. |
| `liveTestStarted` / `liveTestStopped` | Editor "Test now" / "Stop" | Start/stop `getUserMedia`; set `test` state; never persists. |
| `patientRegistered` | Onboarding patient step submit | POST patient; advance the wizard (anchor event `PatientRegistered`). |

## 4. State transitions (UI level)

```
Command catalog:   idle → loading → success | error
Command editor:    (new|edit) editing → submitting → success(list updated) | error(fieldErrors)
Live test:         idle → testing → success | error   (advisory; never blocks save)
Gesture type:      closed → entering → saving → added(selected) | error(fieldError)
Patient register:  editing → submitting → success(advance) | error(fieldErrors)
```

## 5. Invariants (client-side)

- `label` is required and free text — the UI never interprets, validates or suggests its meaning.
- `urgency` is a closed 2-value set (`emergency | routine`); no third option is rendered.
- `sensitivity` is a closed 3-value set (`low | medium | high`).
- `minGestureDurationMs < maxGestureDurationMs` — enforced before the save control is enabled.
- A command has exactly one `primaryPrimitive` and at most one `secondaryPrimitive`; a compound
  command recommends (does not force) a live test.
- The gesture-type catalog is **open** — a new type can be registered inline — but a type's existence
  never implies the detection engine recognises that movement (carried to GEST, doc 06).
- The live webcam test is advisory: a denied/failed camera never prevents saving.
- No permission is evaluated inline; `AccessDecisionService.can(...)` gates every action.
- All copy is English (ADR-018); no locale toggle.
