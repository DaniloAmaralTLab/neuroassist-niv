# TRN — Integration Contracts

> Service: `trn-service` · **External data processors at authoring time:** Anthropic Claude (LLM),
> ElevenLabs (TTS), Elasticsearch (approved-content index). All vendor SDKs live **only** in
> `infrastructure/`, behind ports (ADR-004/005/006). Internal sync REST to CONV/PAT/HIST (messaging
> disabled). **TRN is never on the patient's live path** — a vendor/TRN outage never affects CONV
> runtime (INV-TRN-9). EARS guide: `../../../standards/ears-notation.md`.

## 1. Anthropic Claude — LLM dialog (`LlmDialogPort`, ADR-004)

External **data processor**; the adapter (`AnthropicLlmDialogAdapter`) lives in `infrastructure/`.

- **Auth:** vendor API key from config/secret (service identity), never patient-derived.
- **Data minimisation (INV-TRN-7):** only draft category/phrase text and the caregiver prompt leave the
  system; **no** patient name, PHI or free-text identifier — the patient is referenced by `patientId`
  only. No HIST/audit content is sent to the vendor.
- **Untrusted output:** the model response is **data, never an instruction** — it can only populate a
  `draft`/`proposed` proposal; it never sets an authority, selects a tenant, flips an approval, or
  triggers a publish/erase (prompt-injection containment, INV-TRN-2).
- **Governance:** the Anthropic DPA, region and retention are **TRN obligations**. The port keeps the
  vendor swappable with no domain impact.
- **Failure:** off the patient path; an outage returns `503 llm-unavailable` and leaves the session
  resumable (ADR-007). No retry job (interactive, human-paced).
- EARS:
  - WHEN calling `LlmDialogPort`, THE SYSTEM SHALL send only draft text + the caregiver prompt and `patientId`, and SHALL NOT send any name, PHI or free-text identifier (INV-TRN-7, ADR-004).
  - THE SYSTEM SHALL store the model output as a `draft`/`proposed` proposal only and SHALL NOT execute any instruction, authority, tenant selection or publish/erase derived from it (INV-TRN-2).
  - IF Anthropic is unavailable, THEN THE SYSTEM SHALL respond `503 llm-unavailable` and affect no approval, publication or CONV runtime (ADR-007).

## 2. ElevenLabs — voice synthesis (`TtsPort`, ADR-005)

External **data processor**; the adapter (`ElevenLabsTtsAdapter`) lives in `infrastructure/`.

- **Auth:** vendor API key from config/secret.
- **Consent-gated (INV-TRN-3):** invoked **only** after a `granted`, non-revoked voice-cloning
  `consent_record` (patient + legal representative), and **only** for `approved` phrases.
- **Sensitive data:** voice samples + the cloned voice-model id are biometric-adjacent personal data
  stored under a **per-subject crypto key**; relational rows hold only refs (data-model §2.5–2.7).
- **Erasure:** on `trn.content.delete`, delete the vendor voice model + crypto-shred the per-subject key
  (ADR-005/006). The ElevenLabs DPA, region and sample/model retention are **TRN obligations**.
- **Failure:** off the patient path; an ElevenLabs outage halts only the `synthesizing` step — the
  proposal stays `approved`, the synthesis is retried via `outbound_job`, and there is **no partial
  publish** (INV-TRN-4, ADR-007).
- EARS:
  - WHEN synthesizing an approved phrase, THE SYSTEM SHALL first verify a `granted`, non-revoked consent and SHALL NOT call `TtsPort` otherwise (INV-TRN-3).
  - IF ElevenLabs is unavailable, THEN THE SYSTEM SHALL retry the synthesis durable-retry job and SHALL NOT publish a version with any unsynthesized asset (no partial publish — INV-TRN-4).
  - WHEN erasure is requested, THE SYSTEM SHALL delete the ElevenLabs voice model and crypto-shred the per-subject key, never blocked by a vendor/HIST outage (INV-TRN-9).

## 3. Elasticsearch — approved-content index (`SearchIndexPort`, ADR-006)

Project search engine (`stack.search.engine = elasticsearch`). Adapter
(`ElasticsearchSearchIndexAdapter`) in `infrastructure/`; authoring-side assisted search / dedup only.

- **Scope (INV-TRN-5):** indexes **only** `approved`/`published` content — never drafts, never raw LLM
  output. Indexing happens after the dual-authorization gate.
- **Authoring-side only:** backs TRN's assisted search/dedup; it is **not** on the patient live path —
  the seam CONV ADR-002 anticipated (CONV runtime stays Postgres/offline).
- **Tenant isolation (INV-TRN-8):** a per-tenant index or a tenant-filtered alias; every query carries
  the resolved `TenantContext`.
- **Non-blocking:** an in-service durable-retry job; an ES outage **never** blocks a publish to CONV
  (the published tree is the source of truth, CONV owns it). Eventually consistent, reconciled against
  published versions (R7). The port keeps ES swappable (pgvector/other) with no contract change; a
  `pg_trgm` fallback supports dedup while ES is degraded (data-model §2.0).
- EARS:
  - THE SYSTEM SHALL index content only in `approved`/`published` state, tenant-scoped, and SHALL NOT index drafts or raw LLM output (INV-TRN-5, INV-TRN-8).
  - IF Elasticsearch is unavailable, THEN THE SYSTEM SHALL retry indexing but SHALL still complete the publish to CONV (indexing never blocks publishing — ADR-006).

## 4. Internal relationships (summary — details in `hub-integration.md`)

| Direction | Peer | Transport | Auth |
|---|---|---|---|
| TRN → CONV | publish / retire / erase | sync REST (push, Feign) | TRN service-client token |
| TRN → PAT | patient reference read | sync REST (Feign) | `pat.patient.read` service-client, ETag/304 |
| TRN → HIST | audit governance facts | sync REST (Feign) | `hist.audit.record` service-client |
| TRN ← ACS | caregiver token validation | JWKS (resource server) | — |
| TRN → MIG | centralized migrations | build-time | shared ADR-003 |

### 4.1 CONV publish/retire/erase — exact shapes (CONV `api-contract.md` §5–§7)

- **Publish** `POST /conv/trees` (`conv.tree.publish`): body `{ patientId, sourceVersionRef:
  "trn:approval:<approvalId>", tree:{categories[...phrases(assetId)]}, audioManifest:[{assetId,
  storageRef, voiceModelRef, mediaType, durationMs, contentHash}], idempotencyKey:
  "trn:publish:<approvalId>" }` → `201 Created` `{ versionId, version, etag, contentHash, status,
  supersededVersionId, publishedAt }`; replayed key → `200 OK`; dangling asset → `422
  dangling-audio-reference`; patient-session token → `403`.
- **Retire** `POST /conv/tree-versions/{versionId}:retire` (`conv.tree-version.retire`) → `200 OK`
  `{ versionId, status:"withdrawn", withdrawnAt }`; idempotent.
- **Erase audio** `DELETE /conv/patients/{patientId}/audio` (`conv.audio.delete`) → `202 Accepted`
  `{ patientId, status:"ERASED", erasedAssetCount, withdrawnVersionCount }`; idempotent.

## 5. INT items (cross-module contracts — emitted as issues at `/be-architect-backlog`)

These pin TRN's side of cross-module contracts. Each is declared here and in SPEC-10 so the backlog can
emit it as an `INT-TRN-*` issue. **TRN edits no other module's docs.**

### INT-TRN-1 — TRN service-client token must carry the CONV/HIST/PAT authorities (ACS)

ACS MUST issue the TRN **service-client** token with `conv.tree.publish`, `conv.tree-version.retire`,
`conv.audio.delete`, `hist.audit.record`, `pat.patient.read` in its `authorities` claim. Without them,
CONV returns `403` on publish/retire/erase, HIST `403` on audit, PAT `403` on read. This **closes the
TRN side of CONV `INT-CONV-2`** (CONV already raised the CONV half). The `conv.*` codes are seeded by
CONV `V0077`; `hist.audit.record` and `pat.patient.read` by HIST/PAT; TRN only consumes them.

- Depends on: CONV-009 (V0077 seeds `conv.*`), ACS `RoleAuthorityPolicy` for service-client tokens.
- AC-1 the TRN service-client token contains the five authorities; AC-2 `POST /conv/trees` with it
  returns `201` (not `403`) — verified by an ACS+CONV integration test.

### INT-TRN-2 — Publish only after dual authorization; carry `sourceVersionRef` (CONV)

TRN MUST NOT call `POST /conv/trees` unless `authorization.caregiver_confirmed_at IS NOT NULL AND
authorization.patient_confirmed_at IS NOT NULL` (dual-auth complete, distinct actors, INV-TRN-1), and the
publish body MUST carry `sourceVersionRef = "trn:approval:<approvalId>"` (CONV stores it in
`tree_version.source_version_ref`). This **closes the TRN side of CONV `INT-CONV-5`** (consent upstream:
CONV captures no consent and trusts TRN's approval as the consent receipt — ADR-005 G1/G2).

- Depends on: CONV-006 (CONV stores `sourceVersionRef`).
- AC-1 the TRN publish flow gates on both halves; AC-2 the publish body includes `sourceVersionRef` =
  TRN `approvalId`.

### INT-TRN-3 — Consent captured and durable before any synthesis (TRN-internal/CONV boundary)

A `granted`, non-revoked voice-cloning consent for the patient **and** legal representative MUST exist
and be audited (`ConsentGranted`, hard-502) before any `TtsPort` call (INV-TRN-3, ADR-005). Every version
CONV receives is therefore already consented (CONV ADR-005 G1/G2).

- AC-1 synthesis is refused `409 consent-required` without a granted consent; AC-2 `ConsentGranted` is
  durable (HIST) before the first synthesis.

### INT-TRN-4 — Erasure propagates to CONV, never blocked (CONV/HIST)

On `trn.content.delete`, TRN MUST delete the ElevenLabs model, crypto-shred the per-subject key, call
CONV `conv.tree-version.retire` + `conv.audio.delete`, and audit `VoiceModelDeleted`/`ContentErased`
(commit + durable-retry). HIST/CONV outages MUST NOT block the erasure (INV-TRN-9, ADR-005/ADR-007).

- Depends on: CONV §6/§7 (retire/erase endpoints).
- AC-1 erasure crypto-shreds locally and enqueues CONV retire/erase; AC-2 a simulated HIST/CONV outage
  does not block the local erasure; the facts are retried idempotently until accepted.

> **No EDGE/other-module INT items apply to TRN.** TRN has no device, event, gesture or runtime
> dependency; its only peers are ACS (identity), PAT (reference), HIST (audit) and CONV (publication).

## 6. Resilience

- TLS outside localhost (project TECH standard); internal-network only; no public ingress except via GWY.
- **No TRN endpoint is on the patient's live path** (INV-TRN-9): a CONV/PAT/HIST/vendor/network outage
  degrades authoring only — the patient keeps speaking from CONV's cached bundle.
- **Broker-free durable retry (`outbound_job`, data-model §2.9):** synthesize, index, publish, retire,
  erase and never-blocked audit facts are persisted, idempotent jobs — no message bus (ADR-007).
- **No partial publish:** a publish proceeds only when every approved phrase has a synthesized asset
  (INV-TRN-4); a mid-flight failure leaves the approval retained and retried, never a half-published tree.
