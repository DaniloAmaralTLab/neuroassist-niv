# FE-TRN-012 -- ProposalFacade — proposals(), pending(), dualConfirm() signals; caregiver-confirmation, patient-assent, reject, withdraw; 409 re-read reconcile

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ProposalFacade` exposes `proposals()`, `pending()` (caregiver_approved only), and `dualConfirm(id)` as readonly signals, with write methods for the four proposal actions, scoped optimistic updates, and a 409 re-read reconcile that restores server truth on `proposal-state-locked` or `dual-authorization-same-actor`.

## Context / Problem statement
- SPEC-03 §3 derived-state rules: `dualAuthorized` and `state` come only from server truth; FE never marks a node published from a single side.
- SPEC-04 §4: caregiver-confirmation, patient-assent, rejection and withdrawal may be optimistically updated (dual-confirm indicator only), with a server-authoritative re-read on 409 conflict.
- SPEC-01 §4: distinct-actor invariant — `patient-assent POST` must carry a `confirmedBy` distinct from the caregiver who posted the caregiver-confirmation half. The facade validates this before egress.
- `pending()` filter: proposals in state `caregiver_approved` only (not `approved`, not `rejected`/`withdrawn`/`erased`).
- Bloqueia: FE-TRN-019 (PatientAssentPageComponent)

## Approach (execution path)
1. Inject `PROPOSAL_PORT`.
2. Expose `proposals = signal<ProposalVM[]>([])`, `pending = computed(() => proposals().filter(p => p.state === 'caregiver_approved'))`, `dualConfirm = (id) => proposals().find(p => p.proposalId === id)?.dualAuthorized ?? false`.
3. `approveCaregiver(id)`: optimistically flip `caregiverConfirmed = true` on the matching proposal; POST caregiver-confirmation; on 409 `proposal-state-locked` → re-read server truth via GET + reconcile signal.
4. `recordPatientAssent(id, payload)`: validate `payload.confirmedBy !== caregiverSubject`; if same actor → banner (never record); POST patient-assent; on 409 `dual-authorization-same-actor` → banner + no mutation.
5. `reject(id)`, `withdraw(id)`: POST the respective endpoint; re-read proposal on success.
6. Never mark a proposal `dualAuthorized = true` before server confirms `state === 'approved'` or later.

## Non-goals
- No publication trigger here (ContentFacade / PublicationFacade, FE-TRN-013).
- No `adjustOptions` fetch in v1 (INT-FE-TRN-2).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/facades/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§2, §3)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§4)

## Architecture alignment
- Optimistic updates scoped to dual-confirm indicator only; server truth on 409
- Distinct-actor validation before egress (INV-TRN-1)
- `pending()` = computed signal; always filtered to `caregiver_approved`

## Implementation checklist (by layer/file)

- 🔲 `facades/proposal.facade.ts` — proposals, pending (computed), dualConfirm; approveCaregiver, recordPatientAssent, reject, withdraw; 409 reconcile
- 🔲 Unit test: `pending()` only includes `caregiver_approved` proposals
- 🔲 Unit test: `recordPatientAssent` with same confirmedBy → no HTTP call + banner
- 🔲 Unit test: 409 `proposal-state-locked` → server re-read + signal reconcile

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `pending()` contains only proposals with `state === 'caregiver_approved'`.
- `recordPatientAssent` with `confirmedBy === caregiverSubject` does NOT send an HTTP request.
- On 409 `proposal-state-locked` the facade re-reads the server and reconciles the signal.
- `dualAuthorized` is never set to `true` before server confirms `state === 'approved'` or later.

## Dependencies
- FE-TRN-007 (Proposal adapters)
- FE-TRN-005 (ProposalVM type)

## Data impact
- Local signal state only; authoritative state always from server.

## API / Contract impact
- Delegates to `PROPOSAL_PORT` (all 6 operations).

## Testing / Evidence required
- Unit tests for distinct-actor validation and 409 reconcile path.

## Risks / Notes
- Same-actor assent is a silent bug if not validated before egress — the unit test for it is a required gate.
