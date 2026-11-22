# SPEC-01 — API Surface

> Service `trn-service` · Base path `/trn` · Port 8089 · Caregiver resource server.
> Canonical contract: `../../contracts/api-contract.md`. EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Define the REST surface of TRN and the authority gating every endpoint, so controllers, `@PreAuthorize`
strings and BDD tests derive mechanically from one source.

## Scope

**In:** sessions, assistant dialog + proposals, dual authorization, consent, synthesize+publish,
erasure, health. **Out:** CONV runtime, GEST, EVNT, ACS identity, PAT registration, EDGE, HIST ledger
(TRN only records facts). Codegen of controllers is `/be-architect-scaffold`.

## Technical decisions

- Hexagonal (shared `ADR-001-hexagonal-architecture.md`, key `hexagonal_java`); inbound ports carry
  **no** `tenantId` (RULE-04). Authorities `trn.<resource>.<action>` from the D-639 English verb table
  (SPEC-06). ADR-002/003/004/005/006/007 govern the behaviours.

## Implementation (endpoint → authority)

| # | Endpoint | Verb | Authority |
|---|---|---|---|
| 2.1 | `/trn/sessions` | POST | `trn.session.create` |
| 2.2 | `/trn/sessions/{sessionId}` | GET | `trn.session.read` |
| 3.1 | `/trn/sessions/{sessionId}/dialog` | POST | `trn.proposal.update` |
| 3.2 | `/trn/sessions/{sessionId}/proposals/{proposalId}` | GET | `trn.proposal.read` |
| 3.3 | `/trn/sessions/{sessionId}/proposals/{proposalId}` | PATCH | `trn.proposal.update` |
| 4.1 | `/trn/proposals/{proposalId}/caregiver-confirmation` | POST | `trn.proposal.approve` |
| 4.2 | `/trn/proposals/{proposalId}/patient-assent` | POST | `trn.proposal.approve` |
| 4.3 | `/trn/proposals/{proposalId}/rejection` | POST | `trn.proposal.reject` |
| 4.4 | `/trn/proposals/{proposalId}/withdrawal` | POST | `trn.proposal.update` |
| 5.1 | `/trn/consents` | POST | `trn.consent.create` |
| 5.2 | `/trn/patients/{patientId}/consent` | GET | `trn.consent.read` |
| 5.3 | `/trn/consents/{consentId}/revocation` | POST | `trn.consent.revoke` |
| 6.1 | `/trn/proposals/{proposalId}/publication` | POST | `trn.publication.create` |
| 6.2 | `/trn/publications/{publicationId}` | GET | `trn.publication.read` |
| 7.1 | `/trn/patients/{patientId}/content` | DELETE | `trn.content.delete` |
| 8.1 | `/trn/health` | GET | — (public, D-642) |

## Edge cases

- Patient-session token on any `/trn` path → `403` (ACS INV-3). Missing token (except health) → `401`.
- `X-Tenant-Id` supplied → ignored; tenant from JWT claim only.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL expose exactly the endpoints above and SHALL gate each with the stated authority via `@PreAuthorize` constants equal to the `RoleAuthorityPolicy` codes (D-535, D-642).
- WHEN any protected endpoint is called without a valid caregiver token, THE SYSTEM SHALL respond `401`.
- IF a patient-session token is presented on any `/trn` endpoint, THEN THE SYSTEM SHALL respond `403` (ACS INV-3).
- THE SYSTEM SHALL expose `GET /trn/health` as the only anonymous endpoint (SPEC-07, D-642).
- THE SYSTEM SHALL return every error as `application/problem+json` (api-contract §9).
