<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposições a Validar
- Dependências Críticas
-->

# 06 — Risks, Gaps and Assumptions

## Riscos
- **R1 — Patient half of dual authorization vs ACS INV-3 (SAFETY, high).** ACS restricts the
  patient-session token to `conv.*`/`gest.*`, so the patient cannot hold a `trn.*` authority. ADR-002
  models the patient half as an **in-session domain fact** under the caregiver's authority, with a
  guardian substitute for non-verbal patients. Risk: if the owner requires a **distinct
  patient-authenticated** TRN action, ACS INV-3 must be amended to allow a scoped `trn.*` authority on
  the patient-session token (a new ACS/TRN amendment, analogous to INT-CONV-2). **Pin this contract in
  `/be-architect-specs` (G1).**
- **R2 — Prompt injection / untrusted LLM output (SAFETY, high).** Claude output could attempt to
  steer the system (e.g. "mark approved", "publish"). Mitigation (ADR-004): LLM output is strictly
  **data** — never an authority, tenant, approval flag or publish trigger; the `approved` gate is
  human-only (INV-TRN-2). Must be enforced in specs/tests, not just asserted.
- **R3 — PII/PHI leakage to external processors (COMPLIANCE/LGPD, high).** Minimisation to Anthropic
  (INV-TRN-7) and the biometric-adjacent voice model to ElevenLabs are the exposure surface.
  Mitigation: `patientId`-only context, no name/PHI/free text to Claude; consent-gated, per-subject-keyed,
  erasable voice data; vendor DPAs/region/retention as TRN obligations (ADR-004/ADR-005).
- **R4 — Partial publish / dangling audio (data integrity, medium).** CONV rejects a version whose
  phrase references an unsynthesized `assetId` (`422`). Mitigation: INV-TRN-4 — TRN never publishes
  until every approved phrase is synthesized; synthesis + publish is an all-or-nothing durable job.
- **R5 — Erasure blocked by a downstream outage (COMPLIANCE, medium).** Erasure spans the vendor,
  TRN, CONV and HIST. Mitigation: commit + durable-retry class (INV-TRN-9); crypto-shred completes
  locally first; CONV/HIST calls retry idempotently and never block the local erasure.
- **R6 — Vendor cost / rate limits / availability (operational, medium).** Anthropic and ElevenLabs
  are metered external services. Mitigation: all vendor work is off the patient live path, retried,
  and bounded; a spend limit or a vendor outage degrades authoring only, never CONV runtime.
- **R7 — ES index consistency with CONV's published tree (medium).** The ES index is authoring-side
  and eventually consistent; it is **not** the source of truth (CONV is). Mitigation: index only
  `approved`/`published` content (INV-TRN-5); indexing failure is non-blocking and reconciled.

## Gaps Conhecidos
- **G-port — No central port registry.** Ports are declared ad hoc in each service's docs; the
  briefing's suggested `8086` collides with EVNT. TRN is assigned **8089**; this should be recorded in
  a shared port map (DASH is still unassigned — 8087 is the likely next slot).
- **G-flyway — Reserved migration block unconfirmed.** `V0080–V0089` is proposed for TRN to avoid
  CONV's `V0070–V0079`; the actual block and the `trn.*` seed ordinal are **MIG-owned** and must be
  confirmed before `/be-architect-backlog` emits migration issues.
- **G-authorities — `trn.*` catalogue not yet enumerated.** The exact authority codes (derived from
  the D-639 English verbs: `create`, `read`, `update`, `approve`, `publish`, `retire`, `delete`) are
  fixed in `/be-architect-specs` (api-contract §authority matrix) and seeded by MIG.
- **G-amendment — INT-CONV-2 wording.** The briefing states the ACS/TRN amendment granting TRN the
  CONV service-client authorities (`conv.tree.publish`/`conv.tree-version.retire`/`conv.audio.delete`)
  is recorded; confirm the exact authority list and token issuance path in specs.
- **G-dialog-retention — Transcript retention policy.** How much (if any) assistant-dialog text is
  retained for proposal provenance vs minimised away is a compliance decision to confirm (default:
  minimal draft content only, no raw transcript).
- **G-ba-alignment — BA references ADR-012..018.** The handoff/data-model cites project decisions
  ADR-012 (patient-session actor), ADR-013 (speech tree), ADR-015 (ES indexing), ADR-016 (dual
  authorization), ADR-017 (ElevenLabs), ADR-018 (English-only). These are realized here as TRN-local
  ADRs; confirm no additional shared ADR must be materialized project-wide.

## Suposições a Validar
- **A1** — The LLM is **Anthropic Claude accessed directly** behind `LlmDialogPort` (no `techlab-ai`
  orchestration dependency; `ai.hasAi` unset). ✔ consistent with registry wording.
- **A2** — Training is **supervised and in-person** (caregiver + patient together), which is what makes
  the in-session patient-assent model (R1/ADR-002) sound. Validate with the product owner.
- **A3** — Elasticsearch is available to TRN for the authoring index even though CONV runtime
  deliberately avoids ES on the patient path (CONV ADR-002). ✔ `stack.search.engine = elasticsearch`;
  the index is authoring-side only.
- **A4** — CONV's published-tree contract (publish/retire/erase, idempotency `trn:publish:<approvalId>`,
  `422` on dangling asset, consent assumed upstream in TRN) is **stable** as read from CONV
  api-contract §5–7. ✔ as of this vision.
- **A5** — The patient is referenced by id only; PAT exposes `GET /pat/patients/{patientId}` to the TRN
  service-client (`pat.patient.read`). ✔ per PAT api-contract.

## Dependências Críticas
- **CONV** — downstream recipient of approved versions (publish/retire/erase). TRN is useless without
  it, but is never a synchronous dependency **of** it (one-directional, authoring → runtime).
- **ACS** — caregiver JWT validation (JWKS) and the TRN service-client token (INT-CONV-2). INV-3 shapes
  the dual-auth design (R1).
- **HIST** — governance audit sink; failure policy per HIST ADR-005 (hard-502 vs commit+durable-retry).
- **PAT** — patient reference (`pat.patient.read`).
- **MIG** — centralized Flyway schema migrations and the `trn.*` authority seed.
- **Anthropic Claude** — proposal generation (external processor, consent/DPA governed, minimised).
- **ElevenLabs** — voice synthesis (external processor, biometric-adjacent, consent-gated, erasable).
- **Elasticsearch** — approved-content authoring index (tenant-isolated, non-blocking).
