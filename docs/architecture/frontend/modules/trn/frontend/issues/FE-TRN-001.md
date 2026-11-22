# FE-TRN-001 -- trn.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP (12 caregiver authorities), MODULE_FEATURE_FLAGS

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`libs/trn/src/lib/trn.contract.ts` is authored with the four exports required by the shell integration contract: `MODULE_KEY`, `MODULE_MENU_METADATA`, `MODULE_PERMISSION_MAP` (exactly 12 caregiver authorities, verbatim from BE api-contract §10), and `MODULE_FEATURE_FLAGS` — with **no** `trn.proposal.confirm` and no patient-session authority.

## Context / Problem statement
- TRN is the caregiver-only authoring surface for the speech tree (SPEC-05 §1–§4).
- The permission map must carry exactly the 12 caregiver authority strings from BE api-contract §10 (D-639 verbatim rule). Adding `trn.proposal.confirm` or any patient-session authority would violate ACS INV-3 (ADR-005 amendment).
- Feature flags: `trn.switch-scan.enabled` (on) and `trn.audio-preview.enabled` (on); audio preview degrades to device TTS/text until INT-FE-TRN-1 lands.
- Bloqueia: FE-TRN-002, FE-TRN-003, FE-TRN-004, FE-TRN-023

## Approach (execution path)
1. Create `libs/trn/src/lib/trn.contract.ts` exporting `MODULE_KEY = 'trn'`.
2. Define `MODULE_MENU_METADATA` with key `trn`, title `Training`, icon `school`, section `care`, order `40`, identity `caregiver.jwt`, and one entry: `{ label: 'Training', route: '/training', requires: 'trn.session.read' }`.
3. Define `MODULE_PERMISSION_MAP` with the 12 caregiver authority strings: `trn.session.create`, `trn.session.read`, `trn.proposal.read`, `trn.proposal.update`, `trn.proposal.approve`, `trn.proposal.reject`, `trn.publication.create`, `trn.publication.read`, `trn.consent.create`, `trn.consent.read`, `trn.consent.revoke`, `trn.content.delete`. Each key maps to `{ label, justification }` matching SPEC-05 §2.
4. Define `MODULE_FEATURE_FLAGS` with `trn.switch-scan.enabled: { defaultState: true }` and `trn.audio-preview.enabled: { defaultState: true }` per SPEC-05 §3.
5. Re-export all four symbols from `libs/trn/src/index.ts` barrel.
6. Verify `AccessDecisionService.can(key)` resolves for each key; guards must use these keys unchanged.

## Non-goals
- No code for guard implementations (FE-TRN-023).
- No `trn.proposal.confirm` or any patient-session authority in this map.
- No vendor (Claude/ElevenLabs) authority — those are trn-service service-client authorities held server-side.

## Layer(s)
frontend / Tool entry (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-05-tool-contract.md` (§1–§4)
- `docs/architecture/frontend/modules/trn/frontend/adr/ADR-005-dual-shell-dual-authorization-authoring.md` (Amendment)

## Architecture alignment
- D-639: permission map keys are BE-canonical, verbatim
- Standalone + OnPush + Signals (applies to components, not this contract file)
- No patient-session authority (ACS INV-3 untouched)

## Implementation checklist (by layer/file)

**Lib path: `frontend/libs/trn/src/lib/`**
- 🔲 `trn.contract.ts` — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP (12 keys), MODULE_FEATURE_FLAGS
- 🔲 `src/index.ts` — re-exports all four symbols

**Tests**
- 🔲 Unit test: `MODULE_PERMISSION_MAP` has exactly 12 keys; none equals `trn.proposal.confirm`
- 🔲 Unit test: `MODULE_FEATURE_FLAGS` has `trn.audio-preview.enabled.defaultState === true`
- 🔲 `npx nx lint trn` PASS
- 🔲 `npx nx build trn` PASS (no TS errors)

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- `MODULE_PERMISSION_MAP` keys match exactly the 12 caregiver authority strings from SPEC-05 §2 (no more, no less).
- `MODULE_PERMISSION_MAP` does NOT contain `trn.proposal.confirm` or any patient-session authority.
- `MODULE_MENU_METADATA.identity === 'caregiver.jwt'` (single identity).
- `npx nx build trn` PASS with no TypeScript errors.
- `npx nx lint trn` PASS with no boundary violations.

## Dependencies
- None (this is the foundation for all subsequent TRN FE issues).

## Data impact
- None — this is a static module-contract; it does not read or write tenant state.

## API / Contract impact
- Consumes authority string constants from BE api-contract §10 (read-only reference; no HTTP calls here).

## Testing / Evidence required
- Unit test output showing 12 keys in `MODULE_PERMISSION_MAP`.
- `npx nx build trn` output: 0 errors.

## Risks / Notes
- If a future FE adds `trn.proposal.confirm`, ACS INV-3 is violated — be explicit in the test.
- `trn.audio-preview.enabled` defaults `true` but no BE preview endpoint exists in v1 (INT-FE-TRN-1); the guard/affordance handles the degrade.
