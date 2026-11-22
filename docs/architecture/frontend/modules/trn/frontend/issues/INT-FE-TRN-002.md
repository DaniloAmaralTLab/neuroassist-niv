# INT-FE-TRN-002 -- No short-variations endpoint in v1 → AssentNodeCardComponent Adjust = caregiver PATCH refine (v1 PATCH, v2 wire)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`AssentNodeCardComponent.Adjust` affordance routes to caregiver PATCH refine in v1 (no variations dropdown shown); when BE adds a short-variations endpoint (`GET /trn/proposals/{id}/variations`), the `adjustOptions` array populates and the in-session variations picker activates without structural changes.

## Context / Problem statement
- SPEC-04 §5: `adjustOptions = []` in v1 (no short-variations endpoint).
- If `adjustOptions.length === 0`, the Adjust affordance routes back to the caregiver refine PATCH flow (proposal text re-editing + re-approval) instead of showing a variations picker.
- In v1, the Adjust button on `AssentNodeCardComponent` is equivalent to "back to refine" — it triggers `(adjust id)` output which the parent routes to caregiver refine.

## Coordination required
- **BE team (trn-service):** FE needs `GET /trn/proposals/{id}/variations` to offer short alternatives in-session. Without it, the assent experience requires round-tripping to the caregiver refine page on any adjustment.

## Approach (FE v1)
1. `AssentNodeCardComponent.Adjust`: emits `(adjust id)` → parent (`PatientAssentPageComponent`) navigates back to `/training` to open the caregiver refine dialog for that proposal.
2. No free-text input, no variations dropdown in v1.
3. `adjustOptions = signal<string[]>([])` — no call to fetch variations.

## FE changes when BE endpoint lands (wire-up path)
1. `ProposalFacade.fetchVariations(proposalId)` → `GET /trn/proposals/{id}/variations` → populate `adjustOptions`.
2. `AssentNodeCardComponent`: when `adjustOptions.length > 0`, show inline picker instead of routing away.
3. No structural changes to `(adjust id)` output — it simply becomes no-op when variations are available inline.

## Non-goals
- No LLM free-text input at the assent surface in v1.
- No patient-side text generation.

## Layer(s)
frontend / Feature lib (patient-assent)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§5)

## Architecture alignment
- `adjustOptions = []` declared as `signal<string[]>([])` — ready for v2 wire
- Adjust affordance degrades gracefully to PATCH refine in v1

## Implementation checklist

- 🔲 `AssentNodeCardComponent.Adjust`: emit `(adjust id)` → parent routes to caregiver refine
- 🔲 `adjustOptions = signal<string[]>([])` declared in ProposalFacade
- 🔲 Coordination note filed to BE team
- 🔲 Unit test: Adjust with `adjustOptions = []` → routes to caregiver refine (emits `(adjust)`)

## Milestone
Wave 2 / Integration flag

## Labels
type:integration
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `adjustOptions` is always `[]` in v1; no HTTP call to `GET /trn/proposals/{id}/variations` is made.
- Adjust affordance emits `(adjust id)` → parent routes to caregiver refine page.
- When BE adds the endpoint and `adjustOptions.length > 0`, the inline picker appears without code changes to the card.

## Dependencies
- FE-TRN-020 (AssentNodeCardComponent — Adjust affordance)
- FE-TRN-012 (ProposalFacade — adjustOptions signal)

## Risks / Notes
- Round-tripping to the caregiver refine page on Adjust is a UX degradation for the patient/guardian; this should motivate the BE team to prioritize the variations endpoint.
