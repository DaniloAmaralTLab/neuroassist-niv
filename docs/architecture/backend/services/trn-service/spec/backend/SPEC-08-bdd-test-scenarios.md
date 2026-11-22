# SPEC-08 — BDD Test Scenarios

> Gherkin features live in `../../tests/cucumber/*.feature` (pure Gherkin, never `.md`). This doc holds
> the prose: feature index, reusable steps and example data. Step **glue** is generated in scaffold
> format by `/be-architect-specs-validate` — **not** here. EARS guide: `../../../../standards/ears-notation.md`.

## Feature index

| Feature file | Covers | SPECs |
|---|---|---|
| `training-session.feature` | open/read a session; PAT resolution; `TrainingSessionStarted` hard-502 | SPEC-01/02, hub §3/§4 |
| `assistant-dialog.feature` | LLM dialog turn; minimisation; untrusted output; LLM-down resumable | SPEC-02, integ §1 |
| `dual-authorization.feature` | two halves; distinct actors; guardian substitute; `ProposalApproved` | SPEC-03 |
| `consent-and-synthesis.feature` | consent capture/revoke; synthesis consent-gate; no partial publish | SPEC-11, integ §2 |
| `publish-and-idempotency.feature` | synthesize→index→publish; idempotent publish; ES-down non-blocking | SPEC-05/10/11 |
| `erasure.feature` | crypto-shred; CONV retire/erase; never blocked by HIST/CONV outage | SPEC-11, integ §5 |

## Reusable steps (documented here; glue generated in scaffold)

- `Given a caregiver authenticated for tenant <tenant>` — valid ACS caregiver JWT, tenant from claim.
- `Given a patient <patientId> exists in PAT` — PAT stub returns the patient (ETag).
- `Given an open training session <sessionId> for patient <patientId>`.
- `Given a proposed phrase proposal <proposalId> with text <text>`.
- `Given a granted voice-cloning consent for patient <patientId>`.
- `Given the caregiver half of proposal <proposalId> is confirmed by <caregiverId>`.
- `When the patient assent for <proposalId> is recorded by <confirmedBy> via <method>`.
- `Then proposal <proposalId> is in state <state>`.
- `Then HIST received a <fact> audit fact`.
- `Then CONV received a publish with idempotencyKey <key>`.

## Example data (prose — Scenario Outline cells carry NO quotes)

- States: draft, proposed, caregiver_approved, patient_approved, approved, synthesizing, indexed,
  published, rejected, withdrawn, erased.
- Assent methods: gesture, touch, guardian_signature. Relationship (guardian): legal-guardian, parent.
- Error types: proposal-state-locked, dual-authorization-same-actor, incomplete-consent,
  consent-required, not-approved, llm-unavailable, audit-unavailable.
- Idempotency key format: trn:publish:<approvalId> (no surrounding quotes in a table cell).

> **Gherkin rule:** in a `Scenario Outline` `Examples` table, a cell value never carries its own quotes
> (write `gesture`, not `"gesture"`); the step text supplies any quoting. Keep one feature per file,
> kebab-case names, no `-feature` suffix.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL be exercised by the six Gherkin feature files above, each covering the EARS criteria of its referenced SPEC.
- THE SYSTEM SHALL load BDD scenarios only from pure Gherkin `.feature` files; reusable steps and example data SHALL reside in this document (the BDD generator ignores `.md`).
