<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposicoes a Validar
- Dependencias Criticas
-->

# 06 — Risks, Gaps and Assumptions

## Riscos
- **R1 — Stale offline vocabulary (SAFETY-adjacent).** During a long offline window, a vocabulary
  recalibrated/extended in TRN is not available until the next successful refresh. Accepted cost of
  offline-first (ADR-003); the old bundle keeps the patient speaking, and `version`/"last synced"
  make staleness observable.
- **R2 — Voice-asset confidentiality (COMPLIANCE).** The patient's cloned voice is biometric-
  adjacent; leakage or mis-synthesis (wrong patient's voice) is high-impact. Mitigated by consent
  at authoring (TRN), tenant isolation, erasure via crypto-shred (ADR-005/ADR-006), and CONV never
  calling the vendor.
- **R3 — Privacy of what the patient says.** Persisting phrase-spoken content would create a
  sensitive behavioral record. Mitigated by **not** persisting free text; usage is opt-in and
  minimal (ADR-006).
- **R4 — Publish/erasure availability coupling.** `TreePublished`/erasure audit is hard-502 (HIST
  ADR-005): a HIST outage blocks a *publish*, but — by design — never blocks the patient's live
  speech. Monitored as a bounded blast radius.
- **R5 — Retrieval expectation mismatch.** The registry assumes Elasticsearch/kNN, which is
  disabled. v1 assisted search is Postgres FTS/trigram behind a `SearchPort` (ADR-002); semantic
  quality is lower than kNN until pgvector/ES is adopted. The patient's core navigation does not
  depend on it.
- **R6 — Patient-Mode host shell undecided.** Which app mounts GEST detection + the CONV speech
  tree in Patient Mode is a cross-cutting project decision (RAG gap G1, EDGE ADR-005/ADR-012); the
  in-process navigation seam assumes a host that composes both.

## Gaps Conhecidos
- **G1 — Publish direction TRN↔CONV.** Recommended TRN→CONV **push** (`POST /conv/trees:publish`,
  service-client `conv.tree.publish`). Alternative (CONV pulls from TRN like EDGE pulls from PAT)
  is viable; the exact direction and the TRN contract are a Specs-level detail.
- **G2 — Audio storage location & vendor DPA.** Where synthesized audio and the voice model id live
  (blob store, region, encryption key per subject) and the ElevenLabs data-processing agreement are
  owned by TRN authoring; CONV needs only a stable `storageRef` + erasable key reference.
- **G3 — `SearchPort` contract.** The query/response shape for assisted lookup (and whether v1 ships
  any server-side search at all vs client-side only) is to be pinned in Specs.
- **G4 — Opt-in usage policy.** Consent capture, retention period and DASH surfacing for
  `UsageSignal` need product + counsel confirmation.
- **G5 — Permission catalogue codes.** `conv.*` authorities must be added to the catalogue JSON and
  numeric codes computed with the generator before Scaffold (D-639).

## Suposicoes a Validar
- CONV consumes PAT with a **service-client** identity (`pat.patient.read`), **not** the patient-
  session token (confirmed: PAT INV-PAT-7, ACS authority matrix lists the CONV service client).
- The patient-session token carries exactly `conv.tree.read`, `conv.audio.read`,
  `conv.usage.record` (and `gest.*` for GEST); `conv.tree.publish` is never in it (ACS INV-3).
- CONV is **not** wired for escalation/alarms (EVNT out-of-band, EVNT ADR-005) — confirmed by M0.
- Audio synthesis happens only in TRN authoring; CONV runtime never calls ElevenLabs — **boundary
  to confirm with the owner** (adopted as the orchestrator default).
- English-only content; schema-per-tenant; messaging disabled — inherited project invariants.

## Dependencias Criticas
- **ACS** (JWKS + patient-session token semantics, INV-3).
- **PAT** (patient reference read; ETag/304; `403` on patient-session token).
- **HIST** (`POST /hist/audit`; ADR-005 failure policy; ADR-006 crypto-shred erasure).
- **TRN** (approved tree versions + synthesized audio — the content CONV serves).
- **MIG** (centralized Flyway for the `conv` schema).
- **GEST station runtime** (in-process gesture→navigation seam on the station; EDGE ADR-004 cache
  pattern reused for the offline tree bundle).
