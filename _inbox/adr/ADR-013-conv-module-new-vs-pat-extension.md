# ADR-013 — CONV module (speech tree): new module vs. PAT extension

> **Date:** 2026-08-30 (promoted to `accepted` on 2026-08-30)
> **Status:** accepted
> **Decision maker:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — **decision closed**, confirmed directly by Danilo Amaral: Option 1 (new `CONV` module).

---

## Context

The post-handoff briefing (§4, question 1) asks for the speech tree (augmentative and alternative communication). Today no module of this kind exists in the real catalog (`GEST`/`EVNT`/`PAT`/`ACS`/`EDGE`/`HIST`/`DASH`, all already implemented as services/libs). The question is whether the speech tree fits as an extension of `pat-service`/`libs/pat` (code already in production) or requires a new module (its own service + Nx lib).

## Options considered

### Option 1 — New `CONV` module (own service + Nx lib)

- **Advantages:**
  - Follows the pattern already established in the project ("1 module = 1 unit of work for the AI pipeline", see `technical-framing.md §11.3`)
  - Does not couple the speech-tree data model (categories/nodes/phrases) to the schema already in production in `pat-service`, which today is "patient registry + command catalog" — independent evolution with no regression risk for the existing `pat-service`
  - Deploy isolation: `CONV` can evolve (e.g. TTS, tree customization) without requiring a `pat-service` release
- **Disadvantages:**
  - One more service/lib to maintain, version, test and monitor
  - Must decide how CONV references `Patient` (owned by `pat-service`) — inter-service coupling to be designed
- **Cost:** medium — scaffolding work for a new module, but no regression risk on the existing PAT code

### Option 2 — Extension of `pat-service`/`libs/pat`

- **Advantages:**
  - Reuses the `pat-service` infrastructure already implemented (authentication, multi-tenancy, deploy)
  - No need to design inter-service communication to reference `Patient`
- **Disadvantages:**
  - Breaks the "1 module = 1 unit of work" pattern already established and used as a reference across the project's module registry
  - Couples the evolution of the speech tree (potentially volatile — categories, phrases, TTS) to the release cycle of `pat-service`, which is stable and in production today
  - Regression risk: any schema change to accommodate the speech tree touches a table/service that already sustains the real command catalog (`Command`, `GestureType`) in use by the pilot patient

## Decision

**Closed: Option 1 (new `CONV` module)**, following the pattern already established in the project and avoiding coupling a new, potentially volatile feature (speech tree, TTS) to the `pat-service` schema already in production. Mapping a command recognized by GEST to a tree node stays as an integration between `CONV` and the existing command catalog of `pat-service`, not as a schema extension of `pat-service` itself — see §4.8/§12 (question 6) of Framing v3 for the data-model question that was still open.

## Rationale

Consistency with the module pattern already recorded in Framing §11.3; lower regression risk in `pat-service`, which already sustains the command catalog of the real pilot in production.

## How to reverse if the decision proves wrong

Medium cost — if the speech tree turns out to be too small to justify its own service, migrating from standalone `CONV` into `pat-service` is cheaper than the reverse path (since real data would still be isolated in `CONV`, not mixed into the `pat-service` schema).

## Signals that it is wrong

- The overhead of maintaining an entire `CONV` service for a small data volume (1 patient, a few dozen nodes) proves disproportionate in practice.
- The need for an atomic transaction between `Command` (PAT) and a tree node (CONV) proves frequent enough that the inter-service coupling becomes a complexity bottleneck.

## Complementary decision closed on 2026-08-30 (speech-tree data model)

**Briefing question 6 — ✅ decided:** a simple tree, with no structure more elaborate than needed for category → phrase navigation:

- Entity `SpeechTreeNode`: `parentId` (null = tree root), `type` (`category` | `phrase`), `text` (displayed label / content spoken via TTS).
- Optional binding to `engineFeatureRef` — the vocabulary already unified in commit `89f4ee5` of the real repository (see `gest/frontend` ADR-008 D4) — to map a gesture recognized by GEST directly to a selected tree node, without needing a mapping model of CONV's own.
- TTS is a **presentation** responsibility (the node text is synthesized at selection time) — the CONV module does not persist audio.

This keeps the integration with `pat-service` limited to the existing `engineFeatureRef` vocabulary, with no schema change in PAT — consistent with the cost/risk rationale that motivated Option 1 (new module) above.

## TODO[architect]

The decision on new module vs. extension and the `SpeechTreeNode` data model are closed. What remains is implementation work: scaffolding via `new-project.py`, the real `SpeechTreeNode` schema in `CONV`, and the concrete integration with the `engineFeatureRef` vocabulary of `pat-service`/`gest-service` (confirm against the real code whether the vocabulary from commit `89f4ee5` is available as an API consumable by a service external to GEST/PAT, or whether new exposure is needed).
