# FE-TRN-016 -- ConsentGateBannerComponent + ConsentCaptureDialog — consent gate enforcement, incomplete-consent, consent-required routing

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ConsentGateBannerComponent` renders when `consentState !== 'granted'` and blocks preview/publish affordances; opening it triggers `ConsentCaptureDialog` which routes the `incomplete-consent` and `consent-required` error paths.

## Context / Problem statement
- SPEC-02 §1: `ConsentGateBannerComponent` takes `@Input consentState: 'unknown' | 'granted' | 'missing' | 'revoked'`; emits `(captureConsent)` → opens `ConsentCaptureDialog`.
- SPEC-07 §2: 422 `incomplete-consent` → "both patient and representative must consent" → no granted consent; 409 `consent-required` → block publish, route to consent gate.
- SPEC-07 §5: consent gate error routes to this dialog, not a generic error modal.

## Approach (execution path)
1. Create `ConsentGateBannerComponent` (standalone, OnPush): `@Input consentState`, emits `(captureConsent)`. Renders inline banner with status indicator and CTA button when `consentState !== 'granted'`.
2. Create `ConsentCaptureDialog` (standalone): captures `patient` and `representative` consent checkboxes/fields; calls `ConsentFacade.capture(payload)`. On 422 `incomplete-consent`: shows "both required" message inline; does NOT dismiss or mark consent granted.
3. Wire `(captureConsent)` in `TrainingSessionPageComponent` to open the dialog.
4. `consent-required` on publication error (FE-TRN-025): re-routes caregiver to the consent gate flow (same dialog).

## Non-goals
- No consent persistence beyond the server POST.
- Consent revocation UI is in a separate affordance (FE-TRN-026 or FE-TRN-025 scope).

## Layer(s)
frontend / Feature lib (`libs/trn/feature-training/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§2, §5)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 — ConsentGateBannerComponent)

## Architecture alignment
- Standalone + OnPush
- Calm inline banner (not a modal) for the gate itself; dialog only for capture
- `incomplete-consent` → inline validation error, not a modal dismiss

## Implementation checklist (by layer/file)

- 🔲 `feature-training/src/lib/consent-gate-banner/consent-gate-banner.component.ts` — standalone, OnPush, @Input consentState, @Output captureConsent
- 🔲 `feature-training/src/lib/consent-capture-dialog/consent-capture-dialog.component.ts` — dialog with patient + representative fields
- 🔲 Unit test: banner renders when `consentState === 'missing'`
- 🔲 Unit test: dialog shows "both required" error on 422 incomplete-consent

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 3 / Feature lib (training)

## Labels
type:feature
layer:frontend
scope:trn
priority:P3

## Acceptance criteria
- Banner renders for `consentState !== 'granted'` and does NOT render when `consentState === 'granted'`.
- 422 `incomplete-consent` shows an inline error in the dialog and does NOT mark consent granted.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-013 (ConsentFacade)
- FE-TRN-014 (TrainingSessionPageComponent — parent)

## Data impact
- None — rendering only; consent state is server-authoritative.

## API / Contract impact
- Consent capture delegates to `ConsentFacade.capture()` → `POST /trn/consents`.

## Testing / Evidence required
- Unit tests: banner visibility states; dialog 422 handling.

## Risks / Notes
- Consent gate is not a full-page takeover — the proposal list stays visible beneath the banner per SPEC-07 §5.
