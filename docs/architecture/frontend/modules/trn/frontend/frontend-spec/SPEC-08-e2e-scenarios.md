# SPEC-08 — E2E Scenarios — trn (TRN) Frontend

> The Gherkin scenario inventory. Each `.feature` lives in `../e2e/` and is the executable mirror of the
> EARS acceptance criteria in SPEC-01/03/04/05/06/07 (the `fe-ears-coverage` gate matches each criterion
> clause to a scenario here by keyword overlap). This file lists scenarios only — it declares no new rule
> (no EARS section). Gherkin keywords are **English** (D-566). Scenario titles echo the EARS criterion
> nouns so the coverage matcher casa.

## 1. Feature files

| Feature file | Covers (SPEC → clauses) | Theme |
|---|---|---|
| `training-session-and-llm-states.feature` | SPEC-01 (render training), SPEC-03 (responding/fabricated, ended-pending, server-authoritative), SPEC-07 (llm-unavailable) | Screen 08 — training session + LLM states |
| `dual-authorization-assent.feature` | SPEC-01 (render assent), SPEC-03 (pending caregiver-approved filter), SPEC-04 (optimistic + 409 re-read), SPEC-07 (same-actor, proposal-state-locked) | the dual-authorization assent gate |
| `consent-gate.feature` | SPEC-07 (incomplete-consent, consent-required) | voice-cloning consent gate |
| `publication-and-pending-synth.feature` | SPEC-03 (pending-synth), SPEC-04 (publication poll, not optimistic), SPEC-07 (not-approved, pending-synth) | publication lifecycle + pending-synth |
| `erasure-and-content.feature` | SPEC-05 (hide erase), SPEC-07 (audit-unavailable) | erasure + governance facts |
| `audio-preview-fail-safe.feature` | SPEC-03 (honest preview source), SPEC-04 (no preview endpoint), SPEC-07 (preview fallback) | fail-safe audio preview cascade |
| `rbac-and-authorities.feature` | SPEC-01 (guard, routes), SPEC-05 (authorities, vendor, map), SPEC-07 (401, 403, 404) | caregiver guard, RBAC + caregiver-path errors |
| `shell-and-channels.feature` | SPEC-06 (descriptor, egress, intent seam), SPEC-04 (endpoints as published, bearer, adapter default) | Shell registration + input channels |

## 2. Scenario inventory (titles mirror the EARS criterion nouns)

**training-session-and-llm-states.feature**
- Navigating to training renders the training-session authoring surface
- A dialog turn in flight shows the responding state and renders no fabricated proposal
- An llm-unavailable dialog turn shows assistant-unavailable with retry and preserves drafts
- Ending a session with pending proposals persists them as ended-pending without discard
- Proposal state and dual-authorization are derived only from trn-service never a single side

**dual-authorization-assent.feature**
- Navigating to training assent renders the assisted patient-assent surface
- The patient-assent pending list holds only caregiver-approved proposals
- A patient assent by the same actor as the caregiver is refused with the distinct-actor banner
- An optimistic confirmation reconciles on a proposal-state-locked conflict by re-reading server truth

**consent-gate.feature**
- Capturing consent without both the patient and the representative is refused as incomplete-consent
- Requesting publication without granted consent is blocked and routes to the consent-capture gate
- Revoking voice consent stops a future synthesis for the patient

**publication-and-pending-synth.feature**
- Requesting publication of an approved proposal polls the publication status without an optimistic published
- Publishing a not-approved proposal is refused with the not-dual-authorized banner
- A publication pending synthesis is surfaced as pending-synth and never shown as published

**erasure-and-content.feature**
- Lacking trn.content.delete hides the erase affordance
- A hard-502 audit-unavailable shows the governance-fact banner and is not persisted
- Erasing a patient's voice content requests the content deletion and surfaces the retired counts

**audio-preview-fail-safe.feature**
- A caregiver preview with no available clip falls back to device TTS then large text never silent
- With no pre-publication preview endpoint the preview resolves to device TTS then large text without an invented URL
- The preview source is reported honestly and never be-clip when no clip is available

**rbac-and-authorities.feature**
- The caregiver authoring guard redirects to sign-in when there is no caregiver session rendering no authoring surface
- The caregiver authoring guard decides from the real caregiver session and never a hardcoded true
- TRN registers exactly the two caregiver routes and no patient-session route or confirm-training route
- Lacking trn.proposal.approve disables the approve and capture-patient-assent affordances
- Lacking trn.publication.create hides the publish affordance
- The permission map holds only the twelve caregiver authorities and no trn.proposal.confirm
- The TRN UI exposes no vendor affordance for Claude or ElevenLabs
- A 401 unauthenticated call routes to the session-ended surface without retrying the revoked token
- A 403 forbidden call disables the affordance with a missing-permission message without fabricating a result
- A 404 patient-not-found on session creation shows the banner and creates no session

**shell-and-channels.feature**
- TRN registers a single Training destination in the caregiver web Shell under the caregiver identity
- TRN egress attaches the caregiver bearer and never a patient-session token
- The no-op navigation-intent port lets the assent surface touch and switch-scan work without a host
- A host-wired GEST-fed port routes a gesture intent onto the same selected-node model
- A gesture intent targeting an absent or unauthorized node is ignored leaving touch and switch-scan unaffected
- TRN consumes the trn-service endpoints as published under base access-http-base without an invented URL
- Published trn-service binds the HTTP adapter as the default and maps responses through the wire mappers

## 3. Notes

- No `Scenario Outline` is required for TRN; each criterion maps to one concrete scenario (Examples values
  carry no quotes where an Outline is ever used — gate rule).
- The gesture-intent scenarios assume the (optional) host-wired `NAVIGATION_INTENT_PORT`; the no-op-default
  scenario proves touch + switch-scan without a host (G1 is optional for TRN — SPEC-06 §4).
