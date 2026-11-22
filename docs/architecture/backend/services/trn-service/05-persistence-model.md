<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

## Schema Strategy
Schema-per-tenant (shared `../../../adr/ADR-003-multi-tenancy.md`), PostgreSQL. All authoring data
lives in the per-tenant schema `t_<tenantId>`; the only global rows are authority seeds in
`neuroassist_global`. `TenantContextHolder.require()` resolves the schema from the caregiver JWT
`tenantId` claim before any repository call (RULE-04); `X-Tenant-Id` is never trusted. The
Elasticsearch approved-content index is isolated the same way — a per-tenant index or a tenant-filtered
alias — so no query can cross tenants (ADR-006, INV-TRN-8).

| Data | Location |
|---|---|
| `trn.*` authority seeds (authority catalogue rows) | `neuroassist_global` (seeded by MIG, see Migration Strategy) |
| Training sessions, proposals, consent, voice-asset refs, publications | `t_<tenantId>` |
| Synthesized audio bytes, voice samples | blob/object storage, referenced by `storageRef` under a per-subject crypto key (not in the relational schema) |
| Approved-content search documents | Elasticsearch, tenant-isolated |

## Initial Entities
Draft (rascunho) — refined in `/be-architect-specs` (`data-model.md`). TRN stores **drafts and
governance records**; CONV owns the **published** tree (no duplication of the published runtime here).

- **training_session** — `id` (uuid, pk), `tenant_id`, `patient_id` (ref PAT), `opened_by`
  (caregiver), `status` (`open` | `closed`), `opened_at`, `closed_at`. Holds the dialog context ref.
- **proposal** — `id` (pk), `tenant_id`, `session_id` (fk), `type` (`category` | `phrase`),
  `label`/`text` (draft), `parent_ref` (nullable), `state`
  (`draft|proposed|caregiver_approved|patient_approved|approved|synthesizing|indexed|published|rejected|withdrawn`),
  `created_at`, `updated_at`. **No raw LLM transcript retained** beyond the minimal draft content.
- **authorization** — `proposal_id` (fk), `caregiver_confirmed_by`, `caregiver_confirmed_at`,
  `patient_confirmed_by`, `patient_assent_method`, `patient_assent_evidence_ref`,
  `patient_relationship` (null when the patient self-assents; set when a guardian confirms),
  `patient_confirmed_at`. Enforces INV-TRN-1 (both halves, distinct actors).
- **consent_record** — `id` (pk), `tenant_id`, `patient_id`, `scope` (`voice_cloning`),
  `granted_by_patient`, `granted_by_representative`, `status` (`granted` | `revoked`), `granted_at`,
  `revoked_at`, `evidence_ref`. Precondition for synthesis (INV-TRN-3).
- **voice_model** — `id` (pk), `tenant_id`, `patient_id`, `vendor_voice_model_id` (ElevenLabs),
  `voice_model_ref` (erasable per-subject key reference), `status` (`active` | `erased`),
  `created_at`, `erased_at`.
- **voice_sample** — `id` (pk), `tenant_id`, `patient_id`, `storage_ref`, `content_hash`,
  `captured_at`. Bytes in blob storage under the per-subject key.
- **audio_asset** — `id` (pk), `tenant_id`, `patient_id`, `asset_id` (stable), `storage_ref`,
  `voice_model_ref`, `media_type`, `duration_ms`, `content_hash`, `status` (`available` | `erased`).
  Handed to CONV in the published manifest.
- **publication** — `id` (pk), `tenant_id`, `patient_id`, `approval_id`, `idempotency_key`
  (`trn:publish:<approvalId>`), `conv_version_id` (returned by CONV), `status`
  (`pending` | `published` | `failed`), `published_at`, `last_error`. Enforces INV-TRN-6.

Standard audit columns (`created_at/created_by/updated_at/updated_by`) per project convention;
`tenant_id` on every tenant-scoped table even though the schema already isolates (defense in depth).

## Migration Strategy
Centralized **Flyway via MIG** (TRN owns no runner; shared ADR-003). Per the established reserved-block
convention (CONV used `V0070–V0079`, with `V0077` seeding the `conv.*` authorities in
`neuroassist_global`), TRN is proposed the next reserved block **`V0080–V0089`**:

- Tenant-schema DDL for the entities above, applied to every `t_<tenantId>` schema by MIG.
- One global migration in the block seeds the **`trn.*` authority catalogue rows** in
  `neuroassist_global` (D-639 — codes derived from English verbs, see api surface in `/be-architect-specs`).

> The exact block and ordinals are a **MIG-owned decision**; this doc proposes `V0080–V0089` to avoid
> collision with CONV's `V0070–V0079`. Confirm with MIG before `/be-architect-backlog` emits migration
> issues (06 §Gaps). TRN introduces **no** cross-schema foreign keys; references to PAT/CONV are by id.

## Data Lifecycle
- **Minimisation.** Raw LLM dialog and patient free text are **not** retained as compliance records;
  only the minimal draft content needed to build a proposal persists (ADR-004/ADR-007). No patient
  name or PHI is stored for the Anthropic path.
- **Consent-gated voice data.** Voice samples and the voice model exist only after a `granted`
  consent; they are stored under a per-subject crypto key (ADR-005).
- **Erasure (right-to-be-forgotten).** On `trn.content.delete`: delete the ElevenLabs voice model,
  **crypto-shred** the per-subject key (voice samples, audio refs, `voice_model_ref` become
  unreadable), mark `voice_model`/`audio_asset` `erased`, and call CONV `conv.tree-version.retire` +
  `conv.audio.delete`. Immutable records are retained with their payload rendered unreadable (not
  hard-deleted), aligned with HIST `ADR-006`. The erasure facts are audited **commit + durable-retry**
  — never blocked by a HIST or CONV outage (INV-TRN-9).
- **Retention.** Publications and governance facts are retained for audit; the authoritative published
  tree lives in CONV. Drafts of rejected/withdrawn proposals may be pruned per the project retention
  policy (to be confirmed — 06 §Gaps).
