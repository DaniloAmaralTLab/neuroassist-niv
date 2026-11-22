# FE-TRN-031 -- e2e: dual-authorization-flow.feature + publication-pending-synth.feature (dual-confirm indicator, pending-synth polling)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Two Playwright e2e specs: `dual-authorization-flow.feature` asserts the full dual-confirm lifecycle (proposal advances from `proposed` → `caregiver_approved` → `patient_approved` → `approved`, dual-confirm indicators updating at each step); `publication-pending-synth.feature` asserts `pending-synth` badge appears during synthesis and clears when publication reaches `synthesized` state.

## Context / Problem statement
- SPEC-08 §4: dual-authorization flow and pending-synth are distinct e2e scenarios.
- Dual-auth flow: proposal card shows caregiver ✓/⏳ and patient ⏳/⏳ → caregiver approves → caregiver ✓/⏳ → patient assents → patient ✓/✓ → dual-confirm indicator both ✓ → Publish affordance enabled.
- Pending-synth: publication `POST` succeeds with 202 → state badge switches to `pending-synth` → polling adapter updates state to `synthesized` → badge clears → `published` state displayed.

## Approach (execution path)
1. Create `apps/trn-e2e/src/features/dual-authorization-flow.spec.ts`:
   - Setup: caregiver session, existing session with 1 proposed proposal (state: `proposed`).
   - Assert initial dual-confirm indicator: caregiver ⏳, patient ⏳.
   - Trigger caregiver approve → assert caregiver ✓, patient ⏳.
   - Navigate to `/training/assent` → submit assent for distinct actor.
   - Assert patient ✓ → Publish affordance visible.
2. Create `apps/trn-e2e/src/features/publication-pending-synth.spec.ts`:
   - Setup: dual-approved proposal.
   - Trigger Publish → assert `pending-synth` badge on the node card.
   - HTTP intercept: mock publication polling endpoint to return `synthesized` after 1 poll.
   - Assert `pending-synth` badge clears; proposal card transitions to `published`.

## Non-goals
- No testing of the audio synthesis itself (BE-authoritative via ElevenLabs/TTS).

## Layer(s)
frontend / e2e (`apps/trn-e2e/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§4)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§2 pending-synth state)

## Architecture alignment
- Dual-confirm indicator driven by ProposalVM signals (not duplicated state)
- pending-synth → synthesized is polling-driven (not websocket) in v1

## Implementation checklist (by layer/file)

- 🔲 `apps/trn-e2e/src/features/dual-authorization-flow.spec.ts`
- 🔲 `apps/trn-e2e/src/features/publication-pending-synth.spec.ts`
- 🔲 HTTP intercept helper for publication polling stub

**Tests**
- 🔲 `npx nx e2e trn-e2e` PASS for both specs

## Milestone
Wave 9 / e2e + Hardening

## Labels
type:test
layer:frontend
scope:trn
priority:P9

## Acceptance criteria
- Dual-auth spec: dual-confirm indicators update correctly at each lifecycle step.
- Dual-auth spec: Publish affordance appears only after both ✓ indicators are set.
- pending-synth spec: badge appears on 202 Accepted and clears when polling returns `synthesized`.
- `npx nx e2e trn-e2e` runs for both specs.

## Dependencies
- FE-TRN-012 (ProposalFacade — dualConfirm, proposal state progression)
- FE-TRN-017 (ProposedNodeCardComponent — dual-confirm indicator)
- FE-TRN-009 (Publication adapter — polling loop)

## Data impact
- e2e test fixtures only.

## API / Contract impact
- `POST /trn/proposals/{id}/approve`, `POST /trn/proposals/{id}/patient-assent`, `POST /trn/publications`, `GET /trn/publications/{id}` (polling).

## Testing / Evidence required
- Both specs PASS or PENDING with descriptive messages.

## Risks / Notes
- Polling interval must be overridden to a minimal value in e2e config to avoid slow tests.
- Publication `pending-synth` badge clearing depends on the PublicationFacade polling being wired (FE-TRN-009).
