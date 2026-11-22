# FE-TRN-007 -- Proposal adapters (HTTP + Mock) + wire mappers (ProposalWire, AuthorizationWire, toDomain)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ProposalHttpAdapter` and `ProposalMockAdapter` implement `PROPOSAL_PORT` with six operations (get, update, caregiver-confirmation, patient-assent, rejection, withdrawal), with `ProposalWire` + `AuthorizationWire` types mirroring BE JSON and `toProposalVM` mapper converting to `ProposalVM` with all derived flags.

## Context / Problem statement
- SPEC-04 §1: six operations under `PROPOSAL_PORT` — GET/PATCH proposal, POST caregiver-confirmation, POST patient-assent, POST rejection, POST withdrawal (see BE api-contract §3.2, §3.3, §4.1–§4.4).
- `AuthorizationWire` holds the dual-confirm VO (`caregiver_confirmed_at`, `patient_confirmed_at`) from which `caregiverConfirmed`, `patientConfirmed` and `dualAuthorized` are derived in the mapper.
- `patient-assent` POST carries `{ confirmedBy, method, evidenceRef, relationship? }` as request body.
- Bloqueia: FE-TRN-012 (ProposalFacade)

## Approach (execution path)
1. Create `models/wire/authorization.wire.ts` with `AuthorizationWire` (caregiver_confirmed_at, patient_confirmed_at, etc.).
2. Create `models/wire/proposal.wire.ts` with `ProposalWire` (embedded `authorization: AuthorizationWire`).
3. Create `mappers/proposal.mapper.ts` with `toProposalVM(wire: ProposalWire): ProposalVM` — derives `caregiverConfirmed`, `patientConfirmed`, `dualAuthorized` from the authorization VO; `adjustOptions: []` in v1 (no variations endpoint, INT-FE-TRN-2).
4. Create `ports/proposal.port.ts` defining `ProposalPort` interface.
5. Create `adapters/proposal-http.adapter.ts` implementing all six operations.
6. Create `adapters/proposal-mock.adapter.ts` serving wire fixtures through the same mapper.

## Non-goals
- No ProposalFacade here (FE-TRN-012).
- `adjustOptions` is always `[]` in v1 — no variation fetch (INT-FE-TRN-2).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§1, §2, §4)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§3 derived-state rules)

## Architecture alignment
- Authorization VO derived fields computed once in mapper (not duplicated in facade)
- `dualAuthorized` derived only from server truth (INV-TRN-6 — SPEC-03 §3)
- `adjustOptions: []` v1 (INT-FE-TRN-2 tracks the future variations endpoint)

## Implementation checklist (by layer/file)

- 🔲 `models/wire/authorization.wire.ts` — AuthorizationWire
- 🔲 `models/wire/proposal.wire.ts` — ProposalWire (embedded AuthorizationWire)
- 🔲 `mappers/proposal.mapper.ts` — toProposalVM deriving caregiverConfirmed, patientConfirmed, dualAuthorized
- 🔲 `ports/proposal.port.ts` — ProposalPort interface + PROPOSAL_PORT token
- 🔲 `adapters/proposal-http.adapter.ts` — 6 operations
- 🔲 `adapters/proposal-mock.adapter.ts` — fixture + same mapper

**Tests**
- 🔲 Mapper unit test: `dualAuthorized === true` only when both confirmed_at fields are non-null
- 🔲 Mapper unit test: `caregiverConfirmed = wire.authorization.caregiver_confirmed_at != null`
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `toProposalVM` derives `dualAuthorized` only when both authorization halves are non-null (server truth).
- `adjustOptions` is always `[]` in v1 output of the mapper.
- HTTP adapter POSTs patient-assent body `{ confirmedBy, method, evidenceRef, relationship? }` to `/trn/proposals/{id}/patient-assent`.
- Both adapters produce `ProposalVM` via the shared mapper.

## Dependencies
- FE-TRN-005 (ProposalVM type)
- FE-TRN-003 (provideTrn — binds PROPOSAL_PORT)

## Data impact
- None — read-only mapper.

## API / Contract impact
- GET/PATCH `/trn/sessions/{sessionId}/proposals/{proposalId}` (§3.2, §3.3); POST `/trn/proposals/{id}/caregiver-confirmation`, `/patient-assent`, `/rejection`, `/withdrawal` (§4.1–§4.4).

## Testing / Evidence required
- Mapper unit test: dualAuthorized logic verified with all combinations.

## Risks / Notes
- `409 proposal-state-locked` and `409 dual-authorization-same-actor` are handled at the facade level (FE-TRN-012), not here.
