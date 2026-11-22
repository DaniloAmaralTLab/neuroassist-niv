# 06 — Risks, Gaps, Assumptions — pat (PAT)

## 1. Risks

| # | Risk | Area | Mitigation |
|---|---|---|---|
| R1 | A caregiver registers a gesture **type** (e.g. "Lip reading") and assumes the system now detects it — but the detection engine (GEST) may not recognise that movement. | UX / correctness | Surface the LBC caveat inline (`TODO[architect]` Framing §6.1/§7.1a/§9.3): registering a name ≠ engine support. The gesture-type ↔ engine-capability mapping is a **GEST** architecture decision; PAT only owns the catalog. Flag any type with no engine binding. |
| R2 | The prototype Calibration screen edits `minGestureDurationMs` / `maxGestureDurationMs` in the form model but renders **no UI control** for them (defaults 400 / 1500). The task requires min/max gesture time as first-class calibration. | Scope gap | Specs must add explicit duration controls (two numeric/slider inputs) with the `min < max` invariant; promote must not ship the catalog with hidden, un-editable duration fields. |
| R3 | The live webcam test gives "the camera sees you" feedback but performs **no real recognition** — a caregiver may read a green "recognized" state as proof the command works. | UX | Keep the copy honest ("camera active — perform the gesture"); the success state must not claim recognition beyond what the prototype does. Real validation belongs to GEST. Compound gestures carry a higher false-negative risk (LBC §12 Amendment 1), handled in GEST, not PAT. |
| R4 | `pat-service` BE contracts are not yet written (BE autopilot runs in parallel) — the FE wire shape may shift. | BE contract | Keep every adapter behind a `toX` mapper over `<X>Wire`; treat `CommandWire` / `PatientWire` / `GestureTypeWire` as provisional until `pat-service` specs land; the FE spec cross-links the BE contract. |
| R5 | Webcam access (`getUserMedia`) requires a secure context and user permission; it can leak a live stream if not stopped. | Security / privacy | Confine `getUserMedia` to the live-test component; stop every track on stop / save / `ngOnDestroy`; never upload the stream; the stream is for tactile feedback only. |
| R6 | Downstream promote emits Playwright stubs with vacuous assertions under `test.skip` (Learning: prior occurrences on `*-e2e`). | Test integrity | Carry-forward: stubs must use `test.fixme()` or `throw new Error('TODO[<ISSUE>]')`, never `await expect(page).toHaveURL(/.*/)` under skip. |
| R7 | Provider default regressing to `mock` (Learning `scaffold:mock-adapter-default`, 7 occurrences). | Scaffold / promote | `providePat` defaults to `http`; a providers spec proves it. |

## 2. Known gaps

- `pat-service` BE specs (patient registry, command CRUD + calibration fields, gesture-type registry)
  are not yet written — the FE contract is provisional (R4).
- The **gesture-type → engine-capability** mapping is unspecified: which registered types GEST can
  actually detect, and how PAT should signal "not yet supported" to the caregiver, is a GEST/architect
  decision (R1). PAT FE assumes it only stores and displays types.
- The onboarding wizard is **shell-orchestrated** and spans ACS (tenant, caregiver invite), PAT
  (patient + first command) and EDGE (device pairing). The ownership seam — which module renders which
  wizard step and how step state is shared — needs a SPEC decision; PAT assumes it contributes the
  patient-registry and first-command panels, not the wizard chrome.
- No shared `@neuroassist/shared/*` Access Layer or Shell `neuroassist-niv-web` exists in code yet
  (same precondition ACS declared): PAT cannot be promoted until they land.
- Whether removing a command must be blocked when it is referenced by open/pending events is
  undecided; PAT FE assumes removal is allowed (events keep a denormalized label in HIST).

## 3. Assumptions to validate

- Pilot data volume is tiny (1 tenant, 1 patient, ~3–10 commands, <10 gesture types) → no pagination,
  no cache in v1.
- `urgency` stays a closed 2-value set and `sensitivity` a closed 3-value set for the MVP.
- Target device for PAT screens is the caregiver's desktop/laptop browser (dashboard) with a webcam,
  not the patient's phone.
- A patient belongs to exactly one tenant (schema-per-tenant); cross-tenant catalogs are out of scope.
- English-only copy is acceptable for all PAT users in the pilot (ADR-018).
- The family is comfortable authoring free-form labels with no meaning validation (prototype parity).

## 4. Critical dependencies

- **BE:** `pat-service` endpoints for patients (register/list), commands (create/edit/remove with the
  calibration fields) and gesture types (list/register).
- **ACS:** the tenant-scoped JWT and the `caregiver` / `clinic_coordinator` roles; tenant derived from
  the `tenantId` claim (ACS api-contract §0); `pat.*` authorities absent from patient-session tokens
  (INV-3).
- **Shared libs:** `@neuroassist/shared/{auth-session, tenant-context, access-decision,
  access-http-base, contracts, ui-components, ui-feedback, ui-tokens, observability, error-model}`.
- **Shell:** `neuroassist-niv-web` must register `@neuroassist/pat` (shared ADR-006).
- **Design system:** `theme.css` oklch tokens vendored into the app (`design-system-tokens.md`).
- **Downstream consumers:** GEST (recognition of the catalog's gestures), EVNT (urgency-based alarm
  routing), EDGE (pulls the calibrated catalog), HIST (audits catalog changes).
