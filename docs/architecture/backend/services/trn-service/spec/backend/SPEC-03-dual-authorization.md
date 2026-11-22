# SPEC-03 — Dual Authorization (critical sub-feature)

> The safety/compliance pivot of TRN. ADR-002. Anchor event `ProposalApproved`.
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Specify the two-halves approval so a proposal becomes `approved` only with a caregiver confirmation
**and** a patient/guardian assent, recorded by **distinct** actors, without violating ACS INV-3.

## Scope

**In:** caregiver-confirmation endpoint, patient-assent domain fact, distinctness enforcement, the
`approved` transition + `ProposalApproved` audit. **Out:** the lifecycle shell (SPEC-02), synthesis
(SPEC-11).

## Technical decisions (ADR-002, revisable)

- **Option C adopted.** The caregiver holds `trn.proposal.approve`; the **patient/guardian assent is a
  first-class domain fact** `{confirmedBy, method, evidenceRef, relationship?, occurredAt}`, captured
  in-session, **not** a `trn.*` OAuth authority — ACS INV-3 (patient-session token = `conv.*`/`gest.*`)
  stays intact.
- **R1 (revisable future option, not implemented):** giving the patient a scoped `trn.*` on the
  patient-session token (Option A) would need an ACS/TRN amendment; recorded as an open risk, left out of
  v1. The domain invariant INV-TRN-1 is unchanged either way.
- A **legal guardian** substitutes for a non-verbal patient; `relationship` + `evidenceRef` recorded.

## Implementation

- `authorization` row 1:1 with `proposal` (data-model §2.3). `caregiver_confirmed_by` from the token
  subject; `patient_confirmed_by` from the assent body.
- `ApproveProposalService` sets each half and, when both halves are present with **distinct**
  `confirmedBy`, transitions the proposal to `approved` and audits `ProposalApproved` (hard-502).
- Distinctness is enforced by the DB `CHECK` (data-model §2.3) **and** the service — a single actor can
  never supply both halves (INV-TRN-1).

## Edge cases

- Same actor for both halves → `409 dual-authorization-same-actor`, nothing recorded.
- Assent attempted via a `trn.*` authority on a patient-session token → impossible (`403` at the gate);
  assent is a body fact under the caregiver's supervised call.
- Only one half present → stays `caregiver_approved`/`patient_approved`; never `approved`.
- Re-recording the same half → idempotent (no state regression).

## Acceptance criteria (EARS)

- WHEN both the caregiver confirmation and a patient/guardian assent are present on a proposal and recorded by distinct actors, THE SYSTEM SHALL transition it to `approved` and audit `ProposalApproved` to HIST **hard-502** (INV-TRN-1, ADR-002/ADR-007).
- IF a single actor supplies both halves, THEN THE SYSTEM SHALL respond `409 dual-authorization-same-actor` and record nothing (INV-TRN-1).
- WHILE only one half is present, THE SYSTEM SHALL keep the proposal below the `approved` gate and SHALL NOT permit synthesis or publication (INV-TRN-2).
- THE SYSTEM SHALL record the patient assent as a domain fact `{confirmedBy, method, evidenceRef, relationship?}` and SHALL NOT require or accept a `trn.*` authority on a patient-session token for it (ADR-002, ACS INV-3).
- WHEN a guardian substitutes for a non-verbal patient, THE SYSTEM SHALL require `relationship` and `evidenceRef` on the assent fact.
- IF the `ProposalApproved` audit fails, THEN THE SYSTEM SHALL roll back the approval and respond `502 audit-unavailable` (hard-502 — ADR-007).
