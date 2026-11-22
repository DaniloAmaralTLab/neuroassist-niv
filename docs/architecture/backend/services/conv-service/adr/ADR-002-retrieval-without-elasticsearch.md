<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Retrieval without Elasticsearch: a SearchPort with a PostgreSQL v1 adapter

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner.

## Contexto
The module registry states CONV uses "pure retrieval (Elasticsearch/kNN) for assisted semantic
search". But the **Elastic Stack is disabled** for this project (`stack.elastic.enabled = false`);
only PostgreSQL is available (`stack.database.engine = postgresql`). v1 cannot assume ES. Two
distinct retrieval needs exist: (1) the patient's **live navigation** of category → phrase, which
must run offline with zero network; (2) an **optional assisted lookup** ("type/choose to find a
phrase") that may run server-side when online.

Options for (2): **(A) PostgreSQL full-text (`tsvector`) + trigram (`pg_trgm`)**; **(B) pgvector
embeddings in Postgres** (semantic, closest to kNN); **(C) client-side search over the cached
tree** (no server at all).

## Decisão
**Adopt a `SearchPort` abstraction and ship a PostgreSQL adapter for v1**, combined with
client-side search for the live path:
- The patient's **live navigation/lookup runs client-side over the cached tree** (Option C) — it
  must never need the network (ADR-003/ADR-004).
- The **optional server-side assisted lookup** uses **PostgreSQL FTS + trigram** (Option A) behind
  `SearchPort`. It is lexical, good enough for an English phrase catalog, and needs no new infra.
- **pgvector-in-Postgres** (Option B) is the designated **semantic upgrade** and a drop-in
  `SearchPort` adapter; **Elasticsearch/kNN can be adopted later behind the same `SearchPort`**
  with no change to CONV's contracts.

Retrieval is therefore a port, not a vendor: the registry's ES intent is honored as a *future*
adapter, not a v1 dependency.

## Consequências
- Positive: no dependency on disabled infrastructure; the patient's core experience (navigation)
  needs no search backend at all.
- Positive: ES/pgvector adoption is an adapter swap — contracts, API and domain are unchanged.
- Negative: v1 server-side assisted search is lexical (no semantic ranking) until pgvector or ES is
  added; acceptable because navigation is the primary interaction and is unaffected.
- Negative: two search code paths (client-side cache search + server `SearchPort`); kept small by
  sharing the phrase model.
