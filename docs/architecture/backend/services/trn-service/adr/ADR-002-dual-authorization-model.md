<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Dual-authorization model for content approval (SAFETY/COMPLIANCE)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY/COMPLIANCE.**

## Contexto
Content authored in TRN becomes the patient's **voice** in CONV. The product requires a **dual
authorization** — the caregiver **and** the patient (or a legal guardian) must approve — before any
new category/phrase is published (handoff ADR-016; `SpeechTreeNode.caregiverConfirmed/patientConfirmed`).
A hard constraint complicates the obvious design: ACS **INV-3** restricts the patient-session token
to `conv.*`/`gest.*`, so the patient **cannot** carry a `trn.*` OAuth authority. Many patients are
also non-verbal (the reason the platform exists), so "the patient clicks approve" is not always
possible. We must realise dual authorization without violating INV-3 and without letting a caregiver
silently self-approve both halves.

Options: **(A)** give the patient a `trn.proposal.approve` authority on the patient-session token —
rejected: breaks ACS INV-3, widens the patient token's scope beyond runtime, needs an ACS amendment;
**(B)** treat both halves as a single caregiver action — rejected: destroys the "dual" guarantee;
**(C)** caregiver holds the approval authority, and the **patient/guardian assent is a first-class,
mandatory domain fact** captured in-session (the authoring flow is supervised and in-person), with a
guardian substitute for non-verbal patients.

## Decisão
**Adopt Option C.** A `Proposal` reaches `approved` only when **both** are present:
1. **Caregiver confirmation** — an authenticated caregiver action gated by `trn.proposal.approve`.
2. **Patient/guardian assent** — recorded as `{confirmedBy, method, evidenceRef, relationship?,
   occurredAt}`. The patient expresses assent through their own GEST/touch channel during the
   supervised session; when the patient is non-verbal and cannot confirm, a **legal guardian**
   confirms on their behalf and the `relationship` + evidence are recorded. This is a **domain fact**,
   not a `trn.*` authority — ACS INV-3 stays intact.
The domain enforces that the two halves are **distinct** (a single actor cannot supply both) and that
neither half alone crosses the gate (INV-TRN-1). `ProposalApproved` is audited to HIST (hard-502).
If the owner later requires a **distinct patient-authenticated** action, this upgrades to Option A via
a new ACS/TRN amendment (scoped `trn.*` on the patient-session token) **without** changing the domain
invariant — the pin is recorded as open risk R1.

## Consequências
- Positive: dual authorization is guaranteed and auditable without violating ACS INV-3 or widening the
  patient token.
- Positive: works for non-verbal patients (guardian substitute) — the platform's core population.
- Positive: the "both halves, distinct actors" invariant is testable and cannot be bypassed by the LLM
  or by a lone caregiver.
- Negative / trade-off: the patient assent relies on the in-session (supervised) model rather than an
  independent authenticated channel; evidence capture must be strong, and the alternative (ACS
  amendment) is pinned as a cross-module contract (R1, specs G1).
