<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

## Schema Strategy
**Schema-per-tenant** (shared ADR-003), one `conv` schema per tenant (family or clinic). All
tables are tenant-scoped; there is no CONV-owned global schema (the model-access/version table and
JWKS live in ACS/`neuroassist_global`). Every query runs under a resolved `TenantContext`
(`TenantContextHolder.require()` as the first line of each application service). PostgreSQL is the
engine (`stack.database.engine = postgresql`). Audio **bytes** live in blob/object storage (not in
Postgres); CONV persists only references and manifests.

## Initial Entities
> Draft — contracts/data-model is produced in Specs. Names are indicative.

- **published_tree** — the aggregate root per patient: `tenant_id`, `patient_id` (PAT ref),
  `active_version` (fk), `created_at`, `updated_at`. One row per (tenant, patient).
- **tree_version** — immutable snapshot: `id`, `patient_id`, `version`, `etag`, `content_hash`,
  `status` (`active` | `superseded` | `withdrawn`), `published_at`, `published_by` (TRN actor id),
  `tree_json` (serialized categories + phrases) **or** normalized `category`/`phrase` child tables.
- **audio_asset** — manifest entry: `id`, `tree_version_id`, `asset_id`, `storage_ref`,
  `voice_model_ref`, `duration_ms`, `content_hash`. The `voice_model_ref` is a sensitive, erasable
  reference (ADR-005/ADR-006), not the voice model itself.
- **usage_signal** *(opt-in)* — `id`, `patient_id`, `phrase_id`, `occurred_at`. **No free text.**
  Written only when usage logging is enabled; isolated from the tree aggregate.

Relationships are id-only across services: `patient_id` references PAT; `published_by` references
an ACS/TRN actor id. No cross-service foreign keys.

## Migration Strategy
**Flyway, centralized in MIG** (Java stack convention). CONV contributes versioned SQL for its
`conv` schema (`V<N>__conv_<change>.sql`) applied by the MIG runner across tenant schemas; CONV
runs no migrations of its own. Any new permission (`conv.tree.read`, `conv.audio.read`,
`conv.usage.record`, `conv.tree.publish`) is registered in the permission catalogue JSON and seeded
via a `V<N>__iam_permissao_<codigo>.sql` plus a bump of `neuroassist_global.modelo_acesso_versao`
(RBAC process) — handled at Specs/Scaffold, listed here so it is not forgotten.

## Data Lifecycle
- **Tree versions** — retained immutably for traceability; superseded versions kept so the audit
  trail (`TreePublished`) resolves. Pruning of very old superseded versions is a specs-level policy
  (not MVP).
- **Audio assets** — the patient's cloned voice is **biometric-adjacent personal data**. On an
  erasure request (patient or legal representative), the `voice_model_ref` / audio is
  **crypto-shredded** (per-subject key deletion) aligned with HIST **ADR-006**, and the immutable
  record is retained with the payload rendered unreadable; the version transitions to `withdrawn`
  and the fact is audited.
- **Usage signals** — minimal and opt-in; short, bounded retention (specs-level), erasable with the
  patient's data. They are product telemetry (TRN improvement, DASH review), never a compliance
  audit fact.
- **Offline cache (station-side)** — owned by the station, not CONV persistence; it holds the last
  good bundle and is replaced atomically on refresh. Staleness is observable via the bundle
  `version`/`etag` and a "last synced" indicator.
