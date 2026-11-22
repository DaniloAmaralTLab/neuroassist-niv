# ADR-015 — Elasticsearch as the semantic search engine (pure retrieval) for CONV

> **Date:** 2026-08-31 (Amendment 4)
> **Status:** accepted
> **Decision maker:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — decision closed in this conversation.

> NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

---

## Context

Amendment 3 (ADR-013) closed the `CONV` module as a manually navigable speech tree (category → phrase). Amendment 4 adds a new requirement: navigation must be **assisted by semantic search** — the patient triggers a gesture/input and the system finds the phrase closest to the intent, instead of requiring full manual tree navigation every time. This requires indexing the tree content (the text of each `SpeechTreeNode`) as **vector embeddings** for similarity search (kNN).

There was no dedicated search engine in the project stack (`technical-framing.md §11.2`: "Search engine: N/A"). This decision introduces Elasticsearch as a new and **fundamental** component of the CONV runtime — it is not a peripheral analytics index, it is part of the patient's critical communication path.

## Options considered

### Option 1 — Elasticsearch with `dense_vector`/kNN, pure retrieval (no generative LLM at runtime)

- **Advantages:**
  - The answer always comes from the curated catalog (`SpeechTreeNode` already reviewed in the TRAINING phase, see ADR-016) — no risk of the system "inventing" a phrase the patient would not have said, an unacceptable risk in an assistive health context;
  - No real-time LLM API cost (aligned with FIN-001 — no budget);
  - Low and predictable latency (local kNN, no round trip to an external LLM provider).
- **Disadvantages:**
  - Only finds what was already indexed in the TRAINING phase — does not generalize to phrases never registered;
  - Search quality depends on the quality of the embeddings and the coverage of the tree.
- **Cost:** medium — self-hosted Elasticsearch (single node, given the volume of 1 patient and OPS-002 internal network) + embedding-generation pipeline at ingestion (ADR-016).

### Option 2 — Full RAG (Elasticsearch + LLM generating the answer at runtime)

- **Advantages:** more flexible — could compose answers for situations not foreseen in the tree.
- **Disadvantages:**
  - The risk of hallucination in an assistive health context is unacceptable — an incorrectly generated phrase can communicate something the patient did not mean, in a channel that is used even for calls for help (`GEST`/`EVNT` cover emergency, but `CONV` covers general day-to-day communication, which also needs to be reliable);
  - API cost per interaction, violating the spirit of FIN-001;
  - Higher latency (round trip to the LLM provider on every phrase).
- **Cost:** high — unacceptable product risk for the gain in flexibility.

### Option 3 — Traditional keyword search (no embeddings), no Elasticsearch

- **Advantages:** simpler, no new infrastructure component.
- **Disadvantages:** does not capture semantic similarity (e.g. a partial gesture/input would have no way to "approximate" the right phrase) — does not meet the assisted-search requirement.
- **Cost:** low, but does not solve the problem.

## Decision

**Option 1 — Elasticsearch with vector search (kNN), pure retrieval.** The CONV runtime never calls an LLM to generate new text; it only searches, by semantic similarity, for the existing tree node closest to the captured intent. Generation/expansion of tree content happens only in the TRAINING phase (ADR-016), separate from daily use.

## Rationale

In an assistive health context, reliability and predictability of the answer weigh more than generative flexibility. Pure retrieval eliminates hallucination risk at runtime and keeps operating cost in line with FIN-001.

## How to reverse if the decision proves wrong

Migrating from pure retrieval to generative RAG is additive (the indexing/embedding infrastructure would already be in place) — it would only require coupling an LLM to the retrieval result. Reverting Elasticsearch altogether would require going back to purely manual navigation (already supported as a fallback — see constraint OPS-003).

## Signals that it is wrong

- Tree coverage (number of indexed phrases) insufficient for the patient's real needs, causing frustration from frequently "not finding" the right phrase;
- Data volume so low (a few dozen nodes) that vector search brings no perceptible gain over manual navigation — the overhead of maintaining Elasticsearch is disproportionate to the benefit.

## Related constraints

- `TECH-007` — CONV uses Elasticsearch for semantic retrieval; runtime is pure retrieval.
- `OPS-003` — fallback to static navigation if Elasticsearch is unavailable.
- `SEC-002` — data indexed in Elasticsearch (tree text/embeddings) is sensitive health data (LGPD, Brazilian data-protection law), same safeguards as REG-001.

## Complementary decisions closed on 2026-08-31

- **Embedding model:** self-hosted (e.g. `paraphrase-multilingual-MiniLM-L12-v2` via sentence-transformers; the product is English-only, so an English-only model would also be acceptable), running as a sidecar on the same single server (consistent with OPS-002 — internal network). No per-use cost (FIN-001) and no dependence on the internet at indexing time, suited to the low volume (dozens of nodes). Called only in the TRAINING phase (when approving/editing a node), never at runtime.
- **Reindexing strategy:** incremental per node — each `SpeechTreeNode` is its own document (ID = node ID), upserted into ES on approve/edit; never a full reindex of the entire tree.
- **Sizing:** a single Elasticsearch node is enough given the volume (1 patient, a few dozen phrases) — revisit only if the product expands to institutional tenants (out of MVP scope).

## TODO[architect]

- Packaging of the embedding sidecar (own container vs. local process) and how it is called from the Java backend — an implementation detail, no longer an architecture decision.
