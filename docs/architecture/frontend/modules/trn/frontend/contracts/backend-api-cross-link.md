# Backend API Cross-Link — trn (TRN) Frontend

> TRN **consumes** trn-service exactly as published (`backend/services/trn-service/contracts/api-contract.md`);
> it **redefines no BE contract** and invents no URL (NÃO fazer: redefine BE contracts). This cross-link maps
> each FE port to its BE endpoint, pins the authority set, records the orchestrator decision + the ADR-005
> amendment, the FE INT requests and the upstream BE INT items, and lists the open items. The BE contract is
> the source of truth; where this file and the BE contract differ, the BE contract wins.

## 1. FE port → BE endpoint map

| FE port / facade | BE endpoint (api-contract) | Verb | Auth (token) | Authority | FE usage |
|---|---|---|---|---|---|
| `TRAINING_SESSION_PORT` / `TrainingSessionFacade` | `/trn/sessions` (§2.1) | POST | caregiver | `trn.session.create` | open a training session for a patient; `201` + `Location` |
| ″ | `/trn/sessions/{sessionId}` (§2.2) | GET | caregiver | `trn.session.read` | read a session + its proposals' states |
| ″ | `/trn/sessions/{sessionId}/dialog` (§3.1) | POST | caregiver | `trn.proposal.update` | assistant dialog turn → draft/proposed proposals; `503 llm-unavailable` honest state |
| `PROPOSAL_PORT` / `ProposalFacade` | `/trn/sessions/{sessionId}/proposals/{proposalId}` (§3.2) | GET | caregiver | `trn.proposal.read` | read a proposal + its `authorization` VO |
| ″ | `/trn/sessions/{sessionId}/proposals/{proposalId}` (§3.3) | PATCH | caregiver | `trn.proposal.update` | refine a draft/proposed proposal; Adjust in v1 |
| ″ | `/trn/proposals/{proposalId}/caregiver-confirmation` (§4.1) | POST | caregiver | `trn.proposal.approve` | caregiver half; `confirmedBy` = token subject |
| ″ | `/trn/proposals/{proposalId}/patient-assent` (§4.2) | POST | caregiver | `trn.proposal.approve` | **in-session patient/guardian assent fact** (distinct actor); `{confirmedBy, method, evidenceRef, relationship?}` |
| ″ | `/trn/proposals/{proposalId}/rejection` (§4.3) | POST | caregiver | `trn.proposal.reject` | reject a non-terminal proposal |
| ″ | `/trn/proposals/{proposalId}/withdrawal` (§4.4) | POST | caregiver | `trn.proposal.update` | withdraw a draft/proposed/approved (pre-publish) proposal |
| `CONSENT_PORT` / `ConsentFacade` | `/trn/consents` (§5.1) | POST | caregiver | `trn.consent.create` | capture patient + representative voice-cloning consent |
| ″ | `/trn/patients/{patientId}/consent` (§5.2) | GET | caregiver | `trn.consent.read` | read the consent gate state |
| ″ | `/trn/consents/{consentId}/revocation` (§5.3) | POST | caregiver | `trn.consent.revoke` | revoke consent (never blocked) |
| `PUBLICATION_PORT` / `PublicationFacade` | `/trn/proposals/{proposalId}/publication` (§6.1) | POST | caregiver | `trn.publication.create` | request synthesize+index+publish of an approved proposal; `202` |
| ″ | `/trn/publications/{publicationId}` (§6.2) | GET | caregiver | `trn.publication.read` | poll publish lifecycle status (`pending`/`published`/`failed`) |
| `CONTENT_PORT` / `ContentFacade` | `/trn/patients/{patientId}/content` (§7.1) | DELETE | caregiver | `trn.content.delete` | right-to-be-forgotten erasure; `202` + counts |
| — (health, not a FE surface) | `/trn/health` (§8.1) | GET | public | — | ops/GWY only; not called by the UI |

**All endpoints take the caregiver token.** A patient-session token is rejected `403` on every `/trn` path
(BE §0.1/§0.2, ACS INV-3); TRN never presents one.

## 2. Authority set (BE-canonical, D-639)

The TRN FE permission map (SPEC-05 §2) is exactly the **twelve caregiver** authorities, copied **verbatim**
from BE api-contract §10 / data-model §4.1 and present in the permission catalogue (`trn` module):

```
trn.session.create     trn.session.read
trn.proposal.read      trn.proposal.update    trn.proposal.approve    trn.proposal.reject
trn.publication.create trn.publication.read
trn.consent.create     trn.consent.read       trn.consent.revoke
trn.content.delete
```

TRN adds **no** UI authority and introduces **no** `trn.proposal.confirm`. The **outbound** service-client
authorities (`conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`, `hist.audit.record`,
`pat.patient.read`) are held by `trn-service` **server-side** (integration-contracts §4, INT-TRN-1) — they are
**not** FE UI authorities.

## 3. Orchestrator decision, ADR amendment, INT items

**Orchestrator decision (overrides the FE vision where they conflict):**
- The patient/guardian half of the dual authorization is an **in-session domain fact** attested under the
  **caregiver's** authority: `POST /trn/proposals/{pid}/patient-assent` requires `trn.proposal.approve` on the
  **caregiver** token (BE ADR-002 Option C; api-contract §4.2). ACS INV-3 is **untouched** — the patient-session
  token stays `conv.*`/`gest.*` only, there is **no** `trn.proposal.confirm`, and TRN **never** needs a
  patient-session token. The patient-confirmation surface (Screen 09) therefore runs **inside the caregiver
  session** (assisted/guardian pattern with accessible large targets / switch scanning), not as a separate
  identity; it **can** be rendered in a Patient-Mode host later (G1 undecided) but that is **not required**.
- The **FE ADR-005 wording is amended** accordingly (status stays `aceita` — see the amendment note appended to
  `adr/ADR-005-dual-shell-dual-authorization-authoring.md`); this cross-link and the specs reflect the amended
  single-identity model.

**FE INT requests (to the BE — proposed, not assumed; no invented URL):**
- **INT-FE-TRN-1 (trn-service).** No pre-publication **audio-preview** endpoint exists (synthesis is only at
  publication, §6). A preview read is proposed so the caregiver can hear a proposal in the cloned voice before
  publishing; until it lands, preview degrades to device TTS → large text (SPEC-07 §3). Non-blocking.
- **INT-FE-TRN-2 (trn-service).** No per-proposal **short-variations** endpoint exists for Screen 09 "Adjust";
  the only LLM surface is `POST .../dialog`. In v1 Adjust routes to a caregiver PATCH refine → re-approval
  (framing Q2). A dedicated variations read is proposed. Non-blocking.

**Upstream BE INT items (consumed server-side — no FE surface):** INT-TRN-1 (ACS service-client token),
INT-TRN-2 (publish after dual-auth + `sourceVersionRef`), INT-TRN-3 (consent before synthesis), INT-TRN-4
(erasure never blocked) — `integration-contracts.md` §5.

**Resolved by the BE contract (no FE amendment needed):**
- **Adjust re-approval (vision Q2).** v1 default: an adjusted proposal re-enters caregiver re-approval
  (PATCH keeps it `draft`/`proposed`; a change after approval is a new proposal — BE §3.3/ADR-003).
- **Error model.** BE `ProblemDetail` `type` slugs map to FE behaviour verbatim (BE §9 → SPEC-07 §2).

## 4. Open items

- **ADR-005 amendment** — single caregiver identity (above); appended to the FE ADR, status `aceita`.
- **G1 Patient-Mode host — OPTIONAL for TRN.** Both surfaces run in the caregiver web Shell today; the assent
  surface is host-portable so it can later mount in the Patient-Mode host, but it is not a v1 dependency.
- **`shared/access-decision` is a Wave-0 stub.** `caregiverAuthoringGuard` is stub-permissive at the PLATFORM /
  frontend `routeGuards` level until it is fleshed out; it decides from the real caregiver session and **never**
  hardcodes `return true`. TRN does not invent `access-decision`.
- **Registry label.** `modules.registry[TRN].frontendLib = "trn-ui"` contradicts the verified on-disk
  convention `@neuroassist/trn` (`frontend/libs/trn`). Specs follow the verified convention; the registry label
  is reconciled in `/fe-architect-promote` (CONV precedent: fix `project-context.json`
  `modules.registry[TRN].frontendLib`). Non-blocking.
- **CONV pending-confirmation link-out.** CONV SPEC-01 links a patient-facing "N phrases to confirm" banner to
  `/patient/confirm-training`. Under this decision the assent is caregiver-driven in-session; the patient-facing
  link is a cross-module reconcile item owned by CONV (TRN edits no CONV doc). Non-blocking.

## 5. Verbatim-consumption rule

TRN binds the BE endpoints **as published**: same paths, same verbs, same authorities, same error `type` slugs
(BE §9 → SPEC-07 §2). It redefines nothing. A change to the session/proposal/consent/publication/erasure
contract is a **BE** change first; the FE adapters then follow the new wire shape through the shared mappers
(SPEC-04 §2).
