# 01 — Architectural Vision — pat (PAT) Frontend

> Module: Patients and Command Catalog · Shell: `neuroassist-niv-web` (caregiver / DASH shell)
> Scope: frontend vision only. No Angular code is produced at this stage.

## 1. Intent (UX-driven)

By the end of a PAT interaction, a caregiver can, from the dashboard and in plain language:

- **register a patient** into the care unit (tenant) once, during onboarding;
- **build a command catalog** for that patient — each entry is a free-form label the family already
  uses (e.g. "Water", "Frog") mapped to a facial gesture;
- **calibrate each command independently** — pick the gesture (simple or a two-primitive combination),
  set **sensitivity**, set the **minimum / maximum gesture duration**, and mark the **urgency**
  (emergency or routine);
- **register a new gesture type on the spot** when the one the patient can perform is not in the list
  (the catalog of gesture *types* is open-ended);
- **test the gesture live on the webcam** before saving, to feel confident it will be seen.

PAT is the module that answers "what can this patient say, how do they say it, and how urgently" — the
vocabulary the rest of the product (GEST detection, EVNT alarms, HIST history) is built on top of.

## 2. Problem statement (current journey vs new journey)

**Today (real system, pre-NIV):** a patient's needs are tied to a single, fixed gesture and a closed
gesture vocabulary. There is no first-class notion of a *catalog*: adding a second need, or tuning how
sensitive detection is for one specific gesture, is not expressible. The family cannot name a command
in their own words, and there is no way to try a gesture before committing to it.

**New journey (LBC Amendments 1 & 2):** PAT surfaces the catalog as a first-class, per-patient
collection. Each command carries its own calibration, so a faint "I'm thirsty" blink and a deliberate
"emergency" eyebrow raise can coexist with different sensitivities and urgencies. The gesture-type
catalog is **extensible** — the family registers "Lip reading" the moment they need it — with the
explicit caveat that naming a type does not by itself make the detection engine recognise the movement
(an architecture concern carried to GEST, see doc 06).

## 3. Personas (jobs-to-be-done)

| Persona | Role / identity | Job-to-be-done in PAT |
|---|---|---|
| Family Caregiver | `caregiver` | Create and recalibrate the patient's commands; test gestures live; name commands in the family's own words. |
| Clinic Coordinator | `clinic_coordinator` | Manage patients and their catalogs across the tenant's patients. |
| Technical lead (onboarding) | `caregiver` (one-off) | Register the patient during the onboarding wizard and seed the first command. |
| Patient | PAT subject | Subject only — never operates a PAT screen; the catalog describes *them*. |

## 4. MVP scope (in)

- **Command catalog** — list the patient's commands; create / edit / remove (promoted from the
  prototype **Calibration** screen). Each row shows label, urgency badge, gesture description and
  sensitivity.
- **Per-command calibration editor** — free-form `label`; `urgency` (emergency | routine);
  `primaryPrimitive` + optional `secondaryPrimitive`; `sensitivity` (low | medium | high);
  `minGestureDurationMs` / `maxGestureDurationMs`.
- **Inline gesture-type registration** — add a new `GestureType` from inside the command editor;
  the newly created type is immediately selectable.
- **Live webcam test** — turn the webcam on (`getUserMedia`) for tactile "the camera sees you"
  feedback before saving; PAT does **not** classify the gesture (that is GEST).
- **Patient registration** — the patient step of the onboarding wizard (name, tenant-scoped);
  PAT owns the patient-registry and first-command panels of that shared flow.

## 5. Out of scope (MVP)

- Real gesture recognition, landmark extraction and the false-negative handling of compound gestures
  — owned by **GEST / edge** (doc 06 carries the TODO[architect]).
- Rendering the emergency full-screen alarm vs the discreet routine notice — owned by **EVNT**.
- Event history / audit timeline — owned by **HIST**.
- Syncing the catalog to the edge device over the heartbeat — owned by **EDGE** (PAT publishes the
  authoritative catalog; EDGE pulls it).
- Patient-session provisioning / revocation — owned by **ACS** (Screen 07).
- Any i18n / locale switch — the product is English-only (ADR-018).

## 6. Architectural principles

- **Standalone-first** in every feature and component; **NgModule only** in the lazy entry
  (`libs/pat/.../pat.module.ts`) — shared ADR-006 (module-entry-as-library).
- **Signals-first** state: facades expose `signal<T>` private + `.asReadonly()`; no NgRx, no manual
  `BehaviorSubject` as source of truth.
- **Lazy-by-default**: the Shell loads `@neuroassist/pat` via `loadChildren`; sub-routes via
  `loadComponent`.
- **OnPush mandatory** on all components.
- **Ports & adapters at the data edge**: features talk to facades; facades talk to a `*_PORT` token;
  `providePat({ adapter })` defaults to **`http`** (pat-service exists), with a `MockAdapter` serving
  fixtures in the same wire shape (carry-forward `scaffold:mock-adapter-default`).
- **Access decisions never inline**: every permission check goes through
  `@neuroassist/shared/access-decision` (`AccessDecisionService.can('pat.command.create' | …)`),
  never `if (user.role === …)`.
- **HTTP only through the Access Layer**: `@neuroassist/shared/access-http-base` (correlation id +
  JWT; tenant is server-derived from the JWT claim); components never touch `HttpClient`.
- **Design tokens only**: Tailwind v4 utilities bound to oklch tokens from
  `@neuroassist/shared/ui-tokens`; no hardcoded colour/spacing; dark is the default theme.
- **English-only** copy (ADR-018); no locale layer in v1.

## 7. Success signals

| Signal | Target |
|---|---|
| Command create / recalibrate flow completion | ≥ 95% without support |
| Time-to-interactive, PAT lazy chunk cold | TTI < 2.5 s on the pilot machine |
| CLS on the command list | < 0.1 |
| p95 catalog save (click → persisted) | < 500 ms |
| Live-test start latency (click → webcam preview) | perceived immediate |
| Access-decision correctness | zero inline role checks (lint gate) |
| Calibration completeness | every saved command has a valid gesture, sensitivity and min < max duration |
