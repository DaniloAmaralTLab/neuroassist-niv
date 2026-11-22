# TRN — Data Model

> Service: `trn-service` · Stack: Java 21 / Spring Boot + Spring Data JPA · PostgreSQL ·
> **schema-per-tenant** (shared `../../../adr/ADR-003-multi-tenancy.md`). Migrations are **Flyway,
> centralized in MIG**; TRN contributes versioned SQL and ships **no runner** (doc 05).
> The ```` ```sql ```` blocks below are the **canonical DDL** consumed by `be-migration-generator.py`
> / `be-entity-generator.py`.

## 1. Conventions

- **PK strategy:** UUID (`uuid` column, server default `gen_random_uuid()`); time-ordered ids where
  MIG's `uuid_generate_v7()` baseline is available (persistence.arch.json). Cross-service references
  (`patient_id` → PAT, `conv_version_id` → CONV) are **id-only — no cross-service foreign keys** (doc 05).
- **Timestamps:** `timestamptz`, UTC; `created_at`/`updated_at` on mutable aggregates.
- **Tenancy:** every authoring table lives in the per-tenant `trn` schema (`-- schema: tenant`); the
  only global rows are the `trn.*` authority seeds in `neuroassist_global` (§4). Every repository call
  runs under a resolved `TenantContext` — `TenantContextHolder.require()` is the first line of each
  application service (RULE-04, INV-TRN-8); `X-Tenant-Id` is never trusted.
- **Minimisation (ADR-004/ADR-007):** **no raw LLM transcript or patient free text** is retained as a
  compliance record — only the minimal draft `label`/`text` needed to build a proposal persists.
- **Sensitive personal data (ADR-005):** voice samples, the ElevenLabs voice-model id and every
  `*_ref` are **biometric-adjacent health-context personal data**, stored under a per-subject crypto
  key; relational rows hold only references. Columns carrying such data are flagged `PERSONAL-DATA`.
- **Erasure (ADR-005/ADR-006):** erasure is **crypto-shred** — delete the per-subject key so refs
  become unreadable and mark the immutable row `erased` (never a hard `DELETE` of the governance row).
- **Encoding:** UTF-8; all authored content is English-only (project constraint).

## 2. Entities

### 2.0 Extensions

Extensions are installed once by MIG's baseline block (`V0001–V0009`, neuroassist-niv-migrations
doc 05); TRN re-declares them idempotently so the service DDL is self-contained.

```sql
-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram assisted dedup fallback when ES is degraded (ADR-006)
```

### 2.1 `training_session` [tenant]

Aggregate root of an authoring activity opened by a caregiver for exactly one patient. Holds the
pointer to the minimal dialog context (not the raw transcript — ADR-004) and parents the proposals.

```sql
-- schema: tenant
CREATE TABLE training_session (
    id                  uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           varchar(50)  NOT NULL,
    patient_id          uuid         NOT NULL,
    opened_by           uuid         NOT NULL,
    status              varchar(16)  NOT NULL DEFAULT 'open',
    dialog_context_ref  varchar(200) NULL,
    opened_at           timestamptz  NOT NULL DEFAULT now(),
    closed_at           timestamptz  NULL,
    created_at          timestamptz  NOT NULL DEFAULT now(),
    created_by          uuid         NULL,
    updated_at          timestamptz  NOT NULL DEFAULT now(),
    updated_by          uuid         NULL,
    PRIMARY KEY (id),
    CHECK (status IN ('open','closed'))
);
CREATE INDEX ix_training_session_patient ON training_session (tenant_id, patient_id, status);
COMMENT ON TABLE training_session IS 'TRN authoring session for one patient; parents proposals. dialog_context_ref points to minimal context, never a raw LLM transcript (ADR-004). Tenant-scoped (INV-TRN-8).';
```

**Invariants:** INV-TRN-8 (tenant-scoped; `tenant_id` defense-in-depth on top of schema isolation).

### 2.2 `proposal` [tenant]

A draft category or phrase under consideration, with its lifecycle `state` (ADR-003). The LLM may only
produce `draft`/`proposed`; the `approved` gate is crossable by human action only (INV-TRN-2).

```sql
-- schema: tenant
CREATE TABLE proposal (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     varchar(50)  NOT NULL,
    session_id    uuid         NOT NULL,
    patient_id    uuid         NOT NULL,
    type          varchar(16)  NOT NULL,
    label         varchar(200) NULL,
    text          varchar(500) NULL,
    parent_ref    varchar(80)  NULL,
    state         varchar(24)  NOT NULL DEFAULT 'draft',
    origin        varchar(16)  NOT NULL DEFAULT 'assistant',
    created_at    timestamptz  NOT NULL DEFAULT now(),
    created_by    uuid         NULL,
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    updated_by    uuid         NULL,
    PRIMARY KEY (id),
    CHECK (type IN ('category','phrase')),
    CHECK (origin IN ('assistant','caregiver')),
    CHECK (state IN ('draft','proposed','caregiver_approved','patient_approved','approved',
                     'synthesizing','indexed','published','rejected','withdrawn','erased')),
    CHECK ( (type = 'phrase'   AND text  IS NOT NULL)
         OR (type = 'category' AND label IS NOT NULL) ),
    FOREIGN KEY (session_id) REFERENCES training_session (id) ON DELETE CASCADE
);
CREATE INDEX ix_proposal_session ON proposal (session_id, state);
CREATE INDEX ix_proposal_patient ON proposal (tenant_id, patient_id, state);
CREATE INDEX ix_proposal_text_trgm ON proposal USING gin (text gin_trgm_ops);
COMMENT ON TABLE proposal IS 'Draft category/phrase + lifecycle state (ADR-003). LLM reaches only draft/proposed (INV-TRN-2); no raw transcript retained (ADR-004).';
```

**Invariants:** INV-TRN-2 (LLM output stored as data; `state` leaves `draft`/`proposed` only by human
action — enforced by the application state machine, SPEC-02). INV-TRN-5 (only `approved`/`published`
rows are eligible for the ES index — SPEC-10 §2).

### 2.3 `authorization` [tenant]

The dual-authorization value object, 1:1 with a `proposal` (PK = `proposal_id`). Holds the caregiver
half and the patient/guardian assent fact. Neither half alone crosses the gate; the two halves must be
**distinct actors** (ADR-002, INV-TRN-1). The patient assent is a **domain fact**, never a `trn.*`
OAuth authority (ACS INV-3).

```sql
-- schema: tenant
CREATE TABLE authorization (
    proposal_id                 uuid         NOT NULL,
    tenant_id                   varchar(50)  NOT NULL,
    caregiver_confirmed_by      uuid         NULL,
    caregiver_confirmed_at      timestamptz  NULL,
    patient_confirmed_by        varchar(120) NULL,
    patient_assent_method       varchar(40)  NULL,
    patient_assent_evidence_ref varchar(200) NULL,
    patient_relationship        varchar(40)  NULL,
    patient_confirmed_at        timestamptz  NULL,
    created_at                  timestamptz  NOT NULL DEFAULT now(),
    updated_at                  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (proposal_id),
    FOREIGN KEY (proposal_id) REFERENCES proposal (id) ON DELETE CASCADE,
    CHECK ( caregiver_confirmed_by IS NULL
         OR patient_confirmed_by   IS NULL
         OR caregiver_confirmed_by::text <> patient_confirmed_by )
);
COMMENT ON TABLE authorization IS 'Dual-authorization VO 1:1 with proposal (ADR-002). Both halves required and DISTINCT for approved (INV-TRN-1). patient_relationship set when a guardian substitutes for a non-verbal patient; NULL on self-assent. Patient assent is a domain fact, not a trn.* authority (ACS INV-3).';
```

**Invariants:** INV-TRN-1 (a proposal reaches `approved` only when both `caregiver_confirmed_at` and
`patient_confirmed_at` are present; the `CHECK` plus the approval service forbid a single actor
supplying both halves).

### 2.4 `consent_record` [tenant]

Voice-cloning consent for the patient **and** legal representative, captured **before** any synthesis.
A hard precondition for `approved → synthesizing` (ADR-005, INV-TRN-3).

```sql
-- schema: tenant
CREATE TABLE consent_record (
    id                        uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id                 varchar(50)  NOT NULL,
    patient_id                uuid         NOT NULL,
    scope                     varchar(24)  NOT NULL DEFAULT 'voice_cloning',
    granted_by_patient        boolean      NOT NULL DEFAULT false,
    granted_by_representative boolean      NOT NULL DEFAULT false,
    representative_ref        varchar(120) NULL,
    status                    varchar(16)  NOT NULL DEFAULT 'granted',
    evidence_ref              varchar(200) NULL,
    granted_at                timestamptz  NOT NULL DEFAULT now(),
    revoked_at                timestamptz  NULL,
    revoked_by                uuid         NULL,
    created_at                timestamptz  NOT NULL DEFAULT now(),
    updated_at                timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CHECK (scope IN ('voice_cloning')),
    CHECK (status IN ('granted','revoked')),
    CHECK (status <> 'granted' OR (granted_by_patient AND granted_by_representative))
);
CREATE UNIQUE INDEX uq_consent_one_active
    ON consent_record (tenant_id, patient_id, scope) WHERE status = 'granted';
COMMENT ON TABLE consent_record IS 'Voice-cloning consent of patient + legal representative, before any synthesis (ADR-005, INV-TRN-3). granted requires BOTH halves; at most one active consent per patient+scope.';
```

**Invariants:** INV-TRN-3 (no `TtsPort` call unless a `granted`, non-revoked row exists for the patient
and representative). Revocation is handled **never-blocked** (commit + durable-retry, ADR-007, INV-TRN-9).

### 2.5 `voice_model` [tenant]

The ElevenLabs cloned-voice model reference. `vendor_voice_model_id` and `voice_model_ref` are
biometric-adjacent personal data under a per-subject crypto key (ADR-005).

```sql
-- schema: tenant
CREATE TABLE voice_model (
    id                    uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id             varchar(50)  NOT NULL,
    patient_id            uuid         NOT NULL,
    vendor_voice_model_id varchar(200) NULL,     -- PERSONAL-DATA: ElevenLabs model id (ADR-005)
    voice_model_ref       varchar(200) NULL,     -- PERSONAL-DATA: erasable per-subject key ref (ADR-005/006)
    status                varchar(16)  NOT NULL DEFAULT 'active',
    created_at            timestamptz  NOT NULL DEFAULT now(),
    updated_at            timestamptz  NOT NULL DEFAULT now(),
    erased_at             timestamptz  NULL,
    PRIMARY KEY (id),
    CHECK (status IN ('active','erased'))
);
CREATE UNIQUE INDEX uq_voice_model_one_active
    ON voice_model (tenant_id, patient_id) WHERE status = 'active';
COMMENT ON COLUMN voice_model.vendor_voice_model_id IS 'PERSONAL-DATA (biometric-adjacent): ElevenLabs voice-model id; deleted at the vendor on erasure (ADR-005).';
COMMENT ON COLUMN voice_model.voice_model_ref IS 'PERSONAL-DATA: erasable per-subject key reference; crypto-shred on erasure (ADR-005/006).';
```

### 2.6 `voice_sample` [tenant]

Patient voice recordings used to clone the voice. Bytes live in blob storage under the per-subject
key; the row holds only `storage_ref` + `content_hash` (ADR-005).

```sql
-- schema: tenant
CREATE TABLE voice_sample (
    id           uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    varchar(50)  NOT NULL,
    patient_id   uuid         NOT NULL,
    storage_ref  varchar(400) NOT NULL,     -- PERSONAL-DATA: blob ref under per-subject key (ADR-005)
    content_hash varchar(80)  NOT NULL,
    captured_at  timestamptz  NOT NULL DEFAULT now(),
    erased       boolean      NOT NULL DEFAULT false,
    erased_at    timestamptz  NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX ix_voice_sample_patient ON voice_sample (tenant_id, patient_id, erased);
COMMENT ON TABLE voice_sample IS 'Patient voice recordings; bytes in blob storage under a per-subject crypto key (ADR-005). Crypto-shredded on erasure (erased=true).';
```

### 2.7 `audio_asset` [tenant]

A synthesized clip for an approved phrase. Carries a stable `asset_id`, handed to CONV in the published
manifest (CONV persists only the reference — CONV ADR-005). Erasable by crypto-shred.

```sql
-- schema: tenant
CREATE TABLE audio_asset (
    id              uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       varchar(50)  NOT NULL,
    patient_id      uuid         NOT NULL,
    proposal_id     uuid         NULL,
    asset_id        varchar(80)  NOT NULL,
    storage_ref     varchar(400) NOT NULL,     -- PERSONAL-DATA: synthesized clip ref under per-subject key
    voice_model_ref varchar(200) NULL,         -- PERSONAL-DATA: erasable per-subject key ref (ADR-005/006)
    media_type      varchar(60)  NOT NULL DEFAULT 'audio/mpeg',
    duration_ms     integer      NOT NULL,
    content_hash    varchar(80)  NOT NULL,
    status          varchar(16)  NOT NULL DEFAULT 'available',
    created_at      timestamptz  NOT NULL DEFAULT now(),
    erased_at       timestamptz  NULL,
    PRIMARY KEY (id),
    UNIQUE (tenant_id, patient_id, asset_id),
    CHECK (duration_ms >= 0),
    CHECK (status IN ('available','erased')),
    FOREIGN KEY (proposal_id) REFERENCES proposal (id) ON DELETE SET NULL
);
CREATE INDEX ix_audio_asset_patient ON audio_asset (tenant_id, patient_id, status);
COMMENT ON TABLE audio_asset IS 'Synthesized clip handed to CONV in the publish manifest (assetId/storageRef/voiceModelRef/contentHash). Crypto-shred on erasure (ADR-005/006). INV-TRN-4: every published phrase has an available asset.';
```

**Invariants:** INV-TRN-4 (TRN never publishes a version whose phrase references an `asset_id` without
a matching `available` row in the same version — CONV rejects a dangling ref `422`).

### 2.8 `publication` [tenant]

The record of pushing one immutable approved version to CONV, keyed by `approval_id` /
`idempotency_key = trn:publish:<approvalId>` (INV-TRN-6). `conv_version_id` is returned by CONV.

```sql
-- schema: tenant
CREATE TABLE publication (
    id              uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       varchar(50)  NOT NULL,
    patient_id      uuid         NOT NULL,
    approval_id     uuid         NOT NULL,
    idempotency_key varchar(200) NOT NULL,
    conv_version_id uuid         NULL,
    status          varchar(16)  NOT NULL DEFAULT 'pending',
    attempt_count   integer      NOT NULL DEFAULT 0,
    last_error      varchar(500) NULL,
    published_at    timestamptz  NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (tenant_id, approval_id),
    UNIQUE (tenant_id, idempotency_key),
    CHECK (status IN ('pending','published','failed'))
);
CREATE INDEX ix_publication_patient ON publication (tenant_id, patient_id, status);
COMMENT ON TABLE publication IS 'One immutable publication per approval, idempotent on trn:publish:<approvalId> (INV-TRN-6). conv_version_id returned by CONV (api-contract §5).';
```

**Invariants:** INV-TRN-6 (one approval → at most one publication; the two `UNIQUE` constraints make a
republish idempotent, aligned with CONV SPEC-05).

### 2.9 `outbound_job` [tenant]

The broker-free **durable-retry** substrate (ADR-007, messaging disabled). Every long or flaky vendor /
cross-service call (ElevenLabs synthesis, ES index, CONV publish/retire/erase, never-blocked HIST
audit) is a persisted, idempotent job. Guarantees "synthesis/publish may take time" and "erasure/
revocation must eventually complete" without a message bus.

```sql
-- schema: tenant
CREATE TABLE outbound_job (
    id              uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       varchar(50)  NOT NULL,
    patient_id      uuid         NULL,
    job_type        varchar(32)  NOT NULL,
    target_ref      varchar(200) NULL,
    idempotency_key varchar(200) NOT NULL,
    status          varchar(16)  NOT NULL DEFAULT 'pending',
    attempt_count   integer      NOT NULL DEFAULT 0,
    next_attempt_at timestamptz  NOT NULL DEFAULT now(),
    last_error      varchar(500) NULL,
    payload         jsonb        NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (tenant_id, job_type, idempotency_key),
    CHECK (job_type IN ('synthesize','index','publish','retire','erase_conv_audio','audit')),
    CHECK (status IN ('pending','in_progress','done','failed'))
);
CREATE INDEX ix_outbound_job_due ON outbound_job (status, next_attempt_at);
COMMENT ON TABLE outbound_job IS 'Broker-free durable-retry queue (ADR-007). Idempotent per (job_type, idempotency_key). Never-blocked facts (erase_conv_audio, revocation audit) are enqueued and retried until accepted (INV-TRN-9).';
```

**Invariants:** INV-TRN-9 (erasure / consent-revocation facts are enqueued and retried, never blocked by
a HIST or CONV outage; a TRN/vendor outage never affects CONV runtime). The `payload` holds **no** raw
LLM transcript or patient free text (ADR-004 minimisation).

## 3. Relations

```
training_session (1) ──< proposal (N)
proposal         (1) ──1 authorization (1)        [PK = proposal_id; dual-auth VO]
proposal         (1) ──< audio_asset (N)          [synthesized clip per approved phrase]
consent_record                                    [per (tenant, patient); precondition for synthesis]
voice_model / voice_sample / audio_asset          [per patient; per-subject-key refs]
publication                                        [per approval; idempotent to CONV]
outbound_job                                       [durable-retry for synth/index/publish/retire/erase/audit]
patient_id      ──(id-only, no FK)──> PAT
conv_version_id ──(id-only, no FK)──> CONV TreeVersion
```

## 4. Migration plan (Flyway block — TRN owns **V0080–V0089**)

TRN's reserved Flyway range is **V0080–V0089** (doc 05). Verified across all modules on 2026-11-22 by
grepping every `services/*/contracts/data-model.md` and the backend `issues/` tree: ACS `V0010–V0019`,
PAT `V0020–V0029`, EDGE `V0030–V0039`, EVNT/GEST `V0040–V0059`, HIST `V0060–V0069`, CONV `V0070–V0079`
(`V0077` seeds `conv.*`); **no module uses `V008x`**. MIG took the baseline block `V0001–V0009` and
explicitly acknowledges TRN owns `V0080–V0089` (neuroassist-niv-migrations doc 05, ADR-004) — no
collision. MIG is being designed in parallel and is told to pick `V0090+` or none.

| Migration | Schema | Content |
|---|---|---|
| `V0080__trn_extensions.sql` | global | §2.0 pgcrypto + pg_trgm |
| `V0081__trn_training_session.sql` | tenant | §2.1 `training_session` |
| `V0082__trn_proposal.sql` | tenant | §2.2 `proposal` (+ trgm index) |
| `V0083__trn_authorization.sql` | tenant | §2.3 `authorization` (dual-auth VO) |
| `V0084__trn_consent_record.sql` | tenant | §2.4 `consent_record` (+ one-active partial unique) |
| `V0085__trn_voice_model_sample.sql` | tenant | §2.5 `voice_model` + §2.6 `voice_sample` |
| `V0086__trn_audio_asset.sql` | tenant | §2.7 `audio_asset` |
| `V0087__trn_publication.sql` | tenant | §2.8 `publication` |
| `V0088__trn_outbound_job.sql` | tenant | §2.9 `outbound_job` (durable-retry) |
| `V0089__iam_permissao_trn.sql` | global | seed the 12 `trn.*` authorities (§5) + bump `neuroassist_global` model-access version (RBAC process, doc 05) |

> The exact block/ordinals are a **MIG-owned decision**; this doc proposes `V0080–V0089` and is already
> reconciled with MIG. The 12 authority codes are computed with the generator's English verb table
> (D-639) — not invented (see SPEC-06 and `permission-catalogue.arch.json` module `trn`).

### 4.1 Authority seed (`V0089`, global)

The seed inserts one catalogue row per code below into `neuroassist_global` (mirrors CONV `V0077`):

```
trn.session.create     trn.session.read
trn.proposal.read      trn.proposal.update   trn.proposal.approve   trn.proposal.reject
trn.publication.create trn.publication.read
trn.consent.create     trn.consent.read      trn.consent.revoke
trn.content.delete
```

> ACS assembles the **TRN service-client** token (`conv.tree.publish`, `conv.tree-version.retire`,
> `conv.audio.delete`, `hist.audit.record`, `pat.patient.read`) — those are **CONV/HIST/PAT** authority
> rows seeded by their own modules, not by TRN (see `integration-contracts.md` §4, INT-TRN items).

## 5. Data lifecycle

- **Minimisation (ADR-004/ADR-007).** Raw LLM dialog turns and patient free text are **not** retained;
  only minimal draft `label`/`text` persists. No patient name/PHI is stored for the Anthropic path
  (INV-TRN-7).
- **Consent-gated voice data (ADR-005).** `voice_sample` / `voice_model` / `audio_asset` exist only
  after a `granted` `consent_record`; all bytes/ids live under a per-subject crypto key.
- **Erasure — right-to-be-forgotten (ADR-005/ADR-006).** On `trn.content.delete`: delete the ElevenLabs
  model, delete the per-subject key (voice samples, audio refs, `voice_model_ref` become unreadable),
  mark `voice_model`/`voice_sample`/`audio_asset` `erased`, retire affected CONV versions
  (`conv.tree-version.retire`) and request CONV audio erasure (`conv.audio.delete`). Immutable records
  are retained with payload unreadable — never hard-deleted. The erasure facts are audited
  **commit + durable-retry** via `outbound_job`, never blocked by a HIST/CONV outage (INV-TRN-9).
- **Retention.** Publications and governance facts are retained for audit; the authoritative published
  tree lives in CONV. Drafts of `rejected`/`withdrawn` proposals may be pruned per the project retention
  policy (to be confirmed — 06 §Gaps).

## 6. Schema-level mapping

| Table | Schema |
|---|---|
| (extensions) | global |
| `training_session` | tenant (`trn`) |
| `proposal` | tenant (`trn`) |
| `authorization` | tenant (`trn`) |
| `consent_record` | tenant (`trn`) |
| `voice_model` | tenant (`trn`) |
| `voice_sample` | tenant (`trn`) |
| `audio_asset` | tenant (`trn`) |
| `publication` | tenant (`trn`) |
| `outbound_job` | tenant (`trn`) |
| `trn.*` authority seed | global (`neuroassist_global`) |
