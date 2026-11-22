# SPEC-08 — E2E Scenarios — pat (PAT) Frontend

> Gherkin scenarios for `apps/pat-e2e` (Playwright). Each scenario below becomes a `Scenario:` in a
> `.feature` under `../e2e/`. Scenarios are authored in **English** — the FE stub generator parses
> English Gherkin only (carry-forward `fe_nx_register_module_parses_only_english_gherkin`; D-566).
> Scenarios share domain nouns with the EARS acceptance statements in SPEC-01..07 so the
> EARS-coverage matcher (`fe-ears-coverage.py`) can pair them. This SPEC has no EARS section.

## 1. Feature files

| `.feature` | Covers | Primary EARS source |
|---|---|---|
| `command-catalog.feature` | catalog load states, RBAC hiding, guard redirect, patient-session denial | SPEC-01, SPEC-03, SPEC-05 |
| `add-command.feature` | create command, duration window, label required, compound gesture | SPEC-02, SPEC-03, SPEC-04 |
| `calibrate-command.feature` | PATCH calibrate, retired-command conflict, re-validation | SPEC-04, SPEC-07 |
| `retire-command.feature` | retire, idempotent no-op, exclude from active list | SPEC-03, SPEC-04 |
| `register-gesture-type.feature` | inline register, code-taken field error, engine-support caveat | SPEC-04, SPEC-07 |
| `register-patient.feature` | onboarding patient register, name required, wizard advance | SPEC-02, SPEC-03, SPEC-06 |
| `live-webcam-test.feature` | advisory live test, webcam unavailable never blocks save | SPEC-02, SPEC-07 |

## 2. Scenario inventory

### command-catalog
- Load the patient's active command catalog and render the rows with urgency and sensitivity.
- Show the empty state when the patient has no active command.
- Render a page error with a Retry affordance when the catalog load fails.
- Hide the "New command" action when the session lacks `pat.command.create`.
- Redirect to login when the session is absent on a PAT route.
- Deny the catalog to a patient-session token that carries no `pat.*` authority.

### add-command
- Add a command with a label, urgency, gesture, sensitivity and a min/max duration window.
- Keep save disabled while the label is blank.
- Keep save disabled while the minimum gesture time is not less than the maximum.
- Add a compound command with a second primitive and recommend a live test.

### calibrate-command
- Recalibrate an active command and replace the row after the server confirms.
- Show an inline banner when a calibration save hits a retired command and do not re-tune it.
- Map a validation error on calibration to the duration field without mutating the row.

### retire-command
- Retire an active command and drop it from the active catalog list.
- Retiring an already-retired command is an idempotent no-op.

### register-gesture-type
- Register a new gesture type inline and select it in the open gesture slot.
- Reject a duplicate gesture-type code with a field error, not a global toast.
- Surface the caveat that naming a gesture type does not imply engine support.

### register-patient
- Register a patient with a name and advance the onboarding wizard to the first-command step.
- Keep submit disabled while the patient name is blank.

### live-webcam-test
- Start the live webcam test and show the active preview state.
- A denied or unavailable webcam sets the live-test error state and keeps the save control enabled.

## 3. Stub-integrity rule (carry-forward, Learning ev=45 on `*-e2e`)

Generated Playwright stubs MUST fail explicitly until implemented — `test.fixme()` or
`throw new Error('TODO[<ISSUE>]: implement')` — and MUST NOT use a vacuous
`await expect(page).toHaveURL(/.*/)` under `test.skip` (R6). RBAC scenarios seed the authority via the
session mechanism the shell reads (sessionStorage / refresh endpoint — `fe-e2e:auth`), not an
unrelated header (`fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`). Each spec resets
its own seed to avoid state leak across specs (`fe-e2e:shared-seed:state-leak-across-specs`). The live
webcam test uses a fake media stream / permission stub — a Playwright spec never opens a real camera.
