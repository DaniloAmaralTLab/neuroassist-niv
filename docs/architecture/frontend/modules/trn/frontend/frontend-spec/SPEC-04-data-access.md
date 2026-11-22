# SPEC-04 — Data Access — trn (TRN) Frontend

> TRN is a **collaborative, write-heavy, server-authoritative** authoring tool (the opposite of CONV's
> offline runtime): reads hit `trn-service` per navigation, writes are server-authoritative, there is
> **no** offline cache of proposals (doc 05 §3). `HttpClient` lives only in `api/` adapters behind the
> ports; facades never touch HTTP. Endpoints are consumed **exactly as published** in BE
> `contracts/api-contract.md` — no URL is invented. Authorities equal the BE authority constants
> verbatim (D-639). All Claude + ElevenLabs traffic is proxied by `trn-service`; there is **no** vendor
> endpoint in the FE (FE ADR-007).

## 1. Master resource table

| Resource | Endpoint (BE api-contract) | Verb | Service / Port | Facade | Authority | Cache? |
|---|---|---|---|---|---|---|
| Training session | `/trn/sessions` (§2.1) | POST | `TrainingSessionHttpAdapter` behind `TRAINING_SESSION_PORT` | `TrainingSessionFacade` | `trn.session.create` | none |
| Training session | `/trn/sessions/{sessionId}` (§2.2) | GET | ″ | `TrainingSessionFacade` | `trn.session.read` | none |
| Dialog turn | `/trn/sessions/{sessionId}/dialog` (§3.1) | POST | ″ | `TrainingSessionFacade` | `trn.proposal.update` | none |
| Proposal | `/trn/sessions/{sessionId}/proposals/{proposalId}` (§3.2) | GET | `ProposalHttpAdapter` behind `PROPOSAL_PORT` | `ProposalFacade` | `trn.proposal.read` | none |
| Proposal | `/trn/sessions/{sessionId}/proposals/{proposalId}` (§3.3) | PATCH | ″ | `ProposalFacade` | `trn.proposal.update` | none |
| Caregiver confirmation | `/trn/proposals/{proposalId}/caregiver-confirmation` (§4.1) | POST | ″ | `ProposalFacade` | `trn.proposal.approve` | none |
| Patient/guardian assent | `/trn/proposals/{proposalId}/patient-assent` (§4.2) | POST | ″ | `ProposalFacade` | `trn.proposal.approve` | none |
| Rejection | `/trn/proposals/{proposalId}/rejection` (§4.3) | POST | ″ | `ProposalFacade` | `trn.proposal.reject` | none |
| Withdrawal | `/trn/proposals/{proposalId}/withdrawal` (§4.4) | POST | ″ | `ProposalFacade` | `trn.proposal.update` | none |
| Consent | `/trn/consents` (§5.1) | POST | `ConsentHttpAdapter` behind `CONSENT_PORT` | `ConsentFacade` | `trn.consent.create` | none |
| Consent | `/trn/patients/{patientId}/consent` (§5.2) | GET | ″ | `ConsentFacade` | `trn.consent.read` | none |
| Consent revocation | `/trn/consents/{consentId}/revocation` (§5.3) | POST | ″ | `ConsentFacade` | `trn.consent.revoke` | none |
| Publication | `/trn/proposals/{proposalId}/publication` (§6.1) | POST | `PublicationHttpAdapter` behind `PUBLICATION_PORT` | `PublicationFacade` | `trn.publication.create` | none |
| Publication | `/trn/publications/{publicationId}` (§6.2) | GET | ″ | `PublicationFacade` | `trn.publication.read` | none |
| Content erasure | `/trn/patients/{patientId}/content` (§7.1) | DELETE | `ContentHttpAdapter` behind `CONTENT_PORT` | `ContentFacade` | `trn.content.delete` | none |
| — (health, not a FE surface) | `/trn/health` (§8.1) | GET | — | — | — (public) | — |

- **Base path** `${ACCESS_HTTP_BASE}/trn` (via `@neuroassist/shared/access-http-base` interceptors —
  correlation + error-normalize); **never** `/api/v1` (carry-forward pitfall).
- Every write carries `Authorization: Bearer <caregiver JWT>`; a patient-session token is **never**
  presented (BE §0.1 — it is `403` on all `/trn` paths). Tenant is derived server-side from the JWT
  `tenantId` claim; the FE sends **no** `X-Tenant-Id`.
- `POST /trn/proposals/{proposalId}/publication` returns `202 Accepted`; the FE polls
  `GET /trn/publications/{publicationId}` for `pending → published | failed` (SPEC-03 §2). Erasure
  (`DELETE .../content`) returns `202 Accepted` with the erased/retired counts.

## 2. Adapter + mapper convention (Learning pitfall `scaffold:mock-adapter-default`, 7 occurrences)

- `provideTrn()` ships **default `adapter:'http'`** — **trn-service is specified** (its api-contract,
  SPEC-01..11 and generator-config are published). The earlier `'mock'` default (vision ADR-007 §7,
  written while trn-service was unarchitected) is **superseded**; the Mock adapter remains available by
  explicit override for offline dev / e2e only. A providers spec proves the default resolves to the HTTP
  adapters.
- HTTP adapters type responses as `<...Wire>` records **mirroring the BE JSON** (`TrainingSessionWire`,
  `ProposalWire`, `AuthorizationWire`, `ConsentWire`, `PublicationWire`, `ErasureAckWire`) and
  `.pipe(map(toDomain))` into the VMs. The **Mock** adapter serves the **same wire shape** through the
  **same mappers**, so switching the default never bypasses a mapper.

## 3. Reads are per-navigation; no offline cache

TRN **keeps the framework default** ("call the API per navigation"). Reads (session, proposals, pending,
consent, publication status) hit `trn-service` each navigation; there is **no** offline cache of
proposals (authoring over stale drafts would risk publishing content the other party already changed).
The only local persistence is per-viewer UI convenience (e.g. an unsent draft message), never
authoritative proposal state.

## 4. Optimistic updates

**Scoped and reversible.** Caregiver-confirmation, patient-assent, rejection and withdrawal may update
the dual-confirm indicator optimistically for responsiveness, with a **server-authoritative re-read on
conflict** — a `409 proposal-state-locked` or `409 dual-authorization-same-actor` reconciles the
indicator to server truth (documented rollback). **Publication is never optimistic**: a node is shown
`published` only when `trn-service` reports `publication.status = published`; on an ElevenLabs delay the
node stays `pending-synth` (never a faked "published"). **LLM proposals are never optimistic** — the FE
renders only what `/dialog` returns; on a `503 llm-unavailable` it shows an honest error and fabricates
nothing.

> The vision mentioned a `412` on concurrent approval; the BE exposes **no** `412` — concurrency maps to
> `409 proposal-state-locked`, which the FE handles by re-reading server truth (reconciled here).

## 5. INT items — upstream dependencies

| INT id | Needed by | Owner | What is needed | Blocking? |
|---|---|---|---|---|
| **INT-FE-TRN-1** | caregiver audio preview before publication (vision Q3) | **trn-service (BE)** | the BE api-contract exposes **no** pre-publication audio-preview endpoint; synthesis happens only at publication (§6). A preview of a proposal's phrase in the patient's cloned voice needs a BE read (e.g. `GET /trn/proposals/{id}/preview-audio`). **Proposed, not assumed.** Until it lands, preview resolves to device TTS → large text (SPEC-07 §3). | no — the fail-safe cascade covers it |
| **INT-FE-TRN-2** | Screen 09 "Adjust" short variations (vision Q2/A7) | **trn-service (BE)** | the BE exposes **no** per-proposal "short LLM-suggested variations" endpoint; the only LLM surface is `POST .../dialog` (§3.1). In v1 Adjust routes to a **caregiver PATCH refine** that re-enters re-approval. A dedicated variations endpoint is **proposed, not assumed**. | no — v1 Adjust = caregiver refine |

> These are **frontend** requests for BE endpoints — they add **no** authority and invent **no** URL
> (the proposed paths are illustrative and owned by the BE if accepted). They are logged for
> `/fe-architect-backlog`. The upstream **BE** INT items (INT-TRN-1 ACS service-client token, INT-TRN-2
> publish-after-dual-auth, INT-TRN-3 consent-before-synthesis, INT-TRN-4 erasure-never-blocked,
> `integration-contracts.md` §5) are consumed server-side and need **no** FE surface.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL consume the trn-service endpoints exactly as published under base `${ACCESS_HTTP_BASE}/trn` and SHALL NOT invent a URL or use `/api/v1`.
- THE SYSTEM SHALL present only the caregiver bearer on every `/trn` request and SHALL NOT send an `X-Tenant-Id` header or a patient-session token.
- WHERE trn-service is specified, THE SYSTEM SHALL bind the HTTP adapter as the default for every TRN port and SHALL map each response through the shared wire mappers.
- WHEN a caregiver confirmation or patient assent or rejection is applied optimistically, THE SYSTEM SHALL update the dual-confirm indicator and IF the server responds `409` proposal-state-locked or same-actor, THEN THE SYSTEM SHALL re-read the server truth and reconcile the indicator.
- THE SYSTEM SHALL request publication through `POST /trn/proposals/{proposalId}/publication` and SHALL poll the publication status and SHALL NOT mark the node published optimistically.
- WHEN no pre-publication preview endpoint exists, THE SYSTEM SHALL resolve the audio preview to device TTS then large text and SHALL NOT invent a preview URL.
