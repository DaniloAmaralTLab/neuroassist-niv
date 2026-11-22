# FE-TRN-021 -- AssentEvidenceFormComponent — distinct-actor validation (confirmedBy != caregiver subject), method/evidenceRef/relationship fields

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`AssentEvidenceFormComponent` captures the in-session patient/guardian assent evidence fields (`confirmedBy`, `method`, `evidenceRef`, `relationship?`) and validates that `confirmedBy` differs from the caregiver-session subject before emitting the `(record)` output — refusing same-actor assent before egress.

## Context / Problem statement
- SPEC-02 §2: `AssentEvidenceFormComponent` takes inputs for the four evidence fields; emits `(record { confirmedBy, method, evidenceRef, relationship? })` → `ProposalFacade.recordPatientAssent(id, payload)`.
- SPEC-03 §3: `confirmedBy` MUST differ from the caregiver who recorded the caregiver half (BE INV-TRN-1); the VM carries the caregiver subject so the form can refuse before egress.
- SPEC-07 §2: 409 `dual-authorization-same-actor` → banner "must be a different person from the caregiver"; record nothing. The form pre-validates before even submitting.

## Approach (execution path)
1. Create `AssentEvidenceFormComponent` (standalone, OnPush): inputs for `confirmedBy` (name/identifier), `method` (e.g., head-nod, eye-blink, verbal), `evidenceRef` (optional narrative), `relationship?` (guardian/patient).
2. Inject caregiver subject from `@neuroassist/shared/auth-session` (or receive it as `@Input caregiverSubject: string`).
3. On submit: validate `confirmedBy !== caregiverSubject`; if same actor → show inline error "must be a different person" and do NOT emit `(record)`.
4. Emit `(record payload)` only when validation passes.

## Non-goals
- No audio evidence recording (beyond what the evidence ref field captures).
- 409 `dual-authorization-same-actor` from the server is handled additionally by ProposalFacade (FE-TRN-012); this form pre-validates as a first line of defense.

## Layer(s)
frontend / Feature lib (`libs/trn/feature-patient-assent/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§2 — AssentEvidenceFormComponent)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§3 distinct-actor rule)

## Architecture alignment
- Standalone + OnPush
- Pre-egress same-actor validation (defense in depth alongside facade/BE validation)
- No free-text LLM or AI input — purely structured fields

## Implementation checklist (by layer/file)

- 🔲 `feature-patient-assent/src/lib/assent-evidence-form/assent-evidence-form.component.ts` — form with confirmedBy/method/evidenceRef/relationship
- 🔲 Pre-submit validation: `confirmedBy !== caregiverSubject` → inline error, no emit
- 🔲 Unit test: same-actor submit → no (record) output + error shown
- 🔲 Unit test: distinct-actor submit → (record) output with correct payload

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 3 / Feature lib (patient-assent)

## Labels
type:feature
layer:frontend
scope:trn
priority:P3

## Acceptance criteria
- `confirmedBy === caregiverSubject` → no `(record)` emission; inline "different person" error visible.
- `confirmedBy !== caregiverSubject` → `(record)` emits with `{ confirmedBy, method, evidenceRef, relationship? }`.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-019 (PatientAssentPageComponent — parent)
- FE-TRN-012 (ProposalFacade — caregiver subject accessible via shared/auth-session)

## Data impact
- None — form submission delegates to ProposalFacade.

## API / Contract impact
- Payload `{ confirmedBy, method, evidenceRef, relationship? }` sent to `POST /trn/proposals/{id}/patient-assent` (§4.2).

## Testing / Evidence required
- Unit tests: same-actor and distinct-actor paths.

## Risks / Notes
- Same-actor assent is a core safety constraint (INV-TRN-1); both pre-egress validation here and 409 handling in the facade (FE-TRN-012) must be in place.
