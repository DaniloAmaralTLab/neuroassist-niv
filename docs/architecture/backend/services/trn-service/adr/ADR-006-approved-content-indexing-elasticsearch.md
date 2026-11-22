<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-006 — Indexing approved content in Elasticsearch (tenant isolation)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner.

## Contexto
The module description and the project stack (`stack.search.engine = elasticsearch`) call for approved
content to be **indexed in Elasticsearch** — for authoring-side assisted search and dedup ("is there
already a similar phrase?"). This must be reconciled with CONV **ADR-002**, which deliberately keeps
Elasticsearch **off** the patient's live runtime path (CONV uses Postgres FTS / an offline cache so a
phrase never waits on ES). We need an index that helps authoring without leaking into the patient
runtime and without crossing tenants.

## Decisão
**Index only approved content, authoring-side, behind `SearchIndexPort` (Elasticsearch adapter):**
- **Scope:** only `approved`/`published` content is indexed — never drafts, never raw LLM output
  (INV-TRN-5). Indexing happens after the dual-authorization gate.
- **Authoring-side only:** the index backs TRN's assisted search/dedup; it is **not** on the patient's
  live path. This is exactly the seam CONV ADR-002 anticipated ("if later exposed, it is a TRN
  service-client endpoint, never a patient-session one"). CONV runtime remains Postgres/offline.
- **Tenant isolation:** a per-tenant index or a tenant-filtered alias; every query carries the resolved
  `TenantContext` so no lookup crosses tenants (INV-TRN-8).
- **Non-blocking:** indexing is an in-service durable-retry job; an ES outage never blocks a publish to
  CONV (the published tree is the source of truth, CONV owns it). The index is eventually consistent
  and reconciled against published versions (R7).
- **Swappable:** the port keeps ES replaceable (pgvector/other) without a contract change.
Alternatives rejected: (A) indexing drafts/LLM scratch for "better recall" — rejected (privacy, and
unapproved content must not surface); (B) making the ES index a hard dependency of publish — rejected
(it would couple the patient's new vocabulary to ES availability).

## Consequências
- Positive: authoring gets semantic/dedup search while the patient runtime stays ES-free and offline-safe.
- Positive: tenant isolation and "approved-only" indexing keep the index privacy-safe.
- Positive: ES outage degrades authoring search only, never publishing or runtime.
- Negative / trade-off: the index is eventually consistent and must be reconciled with CONV's published
  versions; accepted since CONV, not ES, is the source of truth.
