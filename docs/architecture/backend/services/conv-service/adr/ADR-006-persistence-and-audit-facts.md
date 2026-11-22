<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-006 — What CONV persists, which facts go to HIST, and the conv.* authorities (SAFETY/privacy)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY/privacy.**

## Contexto
Two questions must be settled: (1) **what CONV persists server-side** and (2) **which facts become
HIST audit records** and under which HIST **ADR-005** failure policy (hard-502 vs
commit+durable-retry). The sensitive asset is *what the patient says*: a free-text log of spoken
phrases would be a high-risk behavioral record. Separately, the patient's live speaking must never
depend on HIST (HIST is a synchronous dependency of every write path; its availability bounds the
writer — HIST doc 06 R1). ACS **INV-3** restricts the patient-session token to `conv.*`/`gest.*`;
CONV must publish its `conv.*` authorities using the generator's English verbs.

## Decisão
**Persisted server-side (schema-per-tenant):**
- **`PublishedTree` / `TreeVersion`** per patient — immutable versioned bundles (tree + audio
  manifest), the source of the offline bundle. The authoritative CONV state.
- **`UsageSignal`** — **opt-in, minimal**: `phraseId` + timestamp, **no free text**, isolated from
  the tree aggregate. Written only when usage logging is consented. Product telemetry (TRN
  improvement / DASH), **not** a compliance record.
- **Not persisted:** the free text of what the patient said; any per-keystroke navigation. The
  live speaking path writes nothing server-side on the critical path.

**Facts sent to HIST (`POST /hist/audit`, service-client `hist.audit.record`) with ADR-005 class:**

| Fact | Sent to HIST? | ADR-005 class | Rationale |
|---|---|---|---|
| **TreePublished** (new active version via TRN) | yes | **hard-502** | creation/non-safety path; publishing is not time-critical — integrity first (roll back publish if audit fails). |
| **TreeVersionSuperseded** | yes (part of publish tx) | **hard-502** | same transaction as TreePublished. |
| **TreeVersionWithdrawn / AudioAssetsErased** (erasure) | yes | **commit + durable-retry** | erasure/right-to-be-forgotten must never be blocked by a HIST outage; idempotent retry (HIST ADR-003), aligned with ACS's access-ending split. |
| **PhraseSpoken** (patient played a phrase) | **no** | — | the patient's live voice must never depend on HIST; recorded only as the opt-in `UsageSignal`, never a compliance audit fact. |

The key SAFETY property: **the patient's live speaking path emits no HIST write**, so HIST
availability can never gate the patient's voice. Erasure is placed in the never-block set for the
same reason ACS puts revocation there.

**conv.* authorities (ACS INV-3, English verbs):**
- **Patient-session token (station):** `conv.tree.read` (read the published bundle),
  `conv.audio.read` (read/stream cached audio), `conv.usage.record` (opt-in usage).
- **Not in the patient-session token:** `conv.tree.publish` (TRN **service-client** — authoring
  publish). CONV also consumes `pat.patient.read` and `hist.audit.record` as a **service-client**
  (never via the patient-session token, which is `403` on `/pat` and not a HIST actor).

## Consequências
- Positive: minimal, privacy-preserving footprint of patient speech; no free-text speech log.
- Positive: the patient's voice is decoupled from HIST availability (no live audit write).
- Positive: erasure is never blocked (commit+durable-retry), audit integrity kept for publishing
  (hard-502); one coherent mapping onto HIST ADR-005.
- Negative: opt-in usage yields partial analytics (acceptable; privacy over completeness).
- Negative: a short "committed-but-not-yet-audited" window on erasure (bounded durable queue +
  reconciliation, as in HIST ADR-005).
