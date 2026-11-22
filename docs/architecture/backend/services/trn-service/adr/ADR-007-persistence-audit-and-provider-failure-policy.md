<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-007 — Draft storage, audit facts and external-provider failure policy (SAFETY/privacy)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY/privacy.**

## Contexto
Three questions must be settled together: (1) **what TRN persists** vs what CONV owns; (2) **which
facts become HIST audit records** and under which HIST **ADR-005** failure class (hard-502 vs
commit+durable-retry); (3) **how external-provider failures** (Anthropic, ElevenLabs, Elasticsearch,
CONV) are handled without a broker (messaging disabled) and without ever touching CONV runtime. The
sensitive assets are the patient's voice data and any authoring text; the hard safety rule is that
TRN is never a synchronous dependency of the patient speaking.

## Decisão
**Persisted by TRN (schema-per-tenant):** training sessions, proposals (+ the dual-authorization
value object), consent records, voice-sample/voice-model references (per-subject-keyed), synthesized
audio-asset references, and publications. **Not persisted:** raw LLM dialog transcripts or patient
free text as compliance records (minimised — ADR-004). **Owned by CONV, not duplicated here:** the
published runtime tree and its served audio bytes.

**Facts sent to HIST (`POST /hist/audit`, `hist.audit.record`) with HIST ADR-005 class:**

| Fact | Class | Rationale |
|---|---|---|
| **TrainingSessionStarted** | hard-502 | creation; not time-critical; integrity first. |
| **ConsentGranted** | hard-502 | compliance record of consent; must be durable before synthesis. |
| **ProposalApproved** (dual-auth complete) | hard-502 | the governance pivot; roll back if the audit fails. |
| **ContentPublished** (pushed to CONV) | hard-502 | integrity of what became the patient's voice. |
| **ConsentRevoked** | commit + durable-retry | revocation must never be blocked by a HIST outage. |
| **VoiceModelDeleted / ContentErased** (erasure) | commit + durable-retry | right-to-be-forgotten must never be blocked; idempotent retry. |
| LLM dialog turns / draft edits | not audited | not a compliance fact; minimised, not retained. |

**External-provider failure policy (no broker — in-service durable-retry jobs):**
- **Anthropic down** → no new proposals; session resumable; no effect on approvals/publishes or CONV.
- **ElevenLabs down** → `synthesizing` halts; proposal stays `approved`; retried; **no partial
  publish** (INV-TRN-4).
- **Elasticsearch down** → indexing retried; **publish to CONV still proceeds** (ADR-006).
- **CONV down** → publish/retire/erase retried idempotently (`trn:publish:<approvalId>`); the approval
  is retained until accepted.
The invariant across all four: a TRN or vendor outage **never** affects CONV runtime, and erasure/
revocation facts are **never** blocked (INV-TRN-9).

## Consequências
- Positive: a minimal, privacy-preserving footprint (no raw transcript/voice-free-text log); voice
  data is consent-gated and erasable.
- Positive: one coherent mapping onto HIST ADR-005; integrity for creation/approval/publish, never-block
  for revocation/erasure.
- Positive: broker-free resilience via durable-retry jobs; no partial publishes; runtime isolation
  guaranteed by construction.
- Negative / trade-off: a short "committed-but-not-yet-audited" window on erasure (bounded durable
  queue + reconciliation, as in HIST ADR-005); partial authoring analytics from minimisation (accepted).
