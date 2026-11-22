# ADR-005 (TRN-local) — Dual-shell, dual-authorization authoring under one lib

- **Status:** aceita (accepted — orchestrator default; **amended at Specs 2026-11-22**, see the
  Amendment below; status remains `aceita`)
- **Scope:** `libs/trn` — the caregiver training surface (Screen 08) and the patient confirmation
  surface (Screen 09). Does not bind other modules.

> ## Amendment (Specs, 2026-11-22 — single caregiver identity; no patient-session token for TRN)
>
> This ADR, written at vision time, assumed **two identities**: a caregiver JWT for Screen 08 and an ACS
> **patient-session** token (carrying a new `trn.proposal.confirm` authority, open question Q1) for Screen
> 09 under the Patient-Mode host. The **finished BE contract and an orchestrator decision supersede that
> part of the decision** (Decision §2/§3 and "Two guards, real session"):
>
> - **ACS INV-3 is untouched.** The patient-session token stays restricted to `conv.*`/`gest.*`; there is
>   **no** `trn.proposal.confirm` authority, and **no** patient-session token is ever presented to `/trn`
>   (BE api-contract §0.1/§0.2 — a patient-session token is `403` on every `/trn` path). TRN never needs a
>   patient-session token.
> - **The patient/guardian assent is an in-session domain fact under the caregiver's authority** (BE
>   ADR-002 Option C; `POST /trn/proposals/{pid}/patient-assent` requires `trn.proposal.approve` on the
>   **caregiver** token, recorded with a `confirmedBy` distinct from the caregiver half). The dual-auth
>   gate still requires **both** halves, by **distinct actors** (INV-TRN-1) — only the mechanism changes:
>   the patient half is an attested fact, not an OAuth authority.
> - **One identity, not two.** The patient-confirmation surface (Screen 09, `feature-patient-assent`) runs
>   **inside the caregiver session** (assisted / guardian pattern, accessible large targets / switch
>   scanning), not under a separate token. It is built host-portable so it **can** later be rendered in the
>   Patient-Mode host (gap G1, undecided), but that is **not required** for v1 — so, unlike CONV/GEST, TRN
>   is **not** blocked by G1.
>
> Consequently the specs drop `patientConfirmGuard` and the patient-session mount; both TRN routes use the
> single `caregiverAuthoringGuard`. Everything else in this ADR (one lib, two feature surfaces sharing the
> proposal model + lifecycle; dual authorization as the hard publish gate; English-only) stands. See
> SPEC-01 §2/§4, SPEC-05 §2 and `contracts/backend-api-cross-link.md` §3. Q1/R4 (patient-session gains
> `trn.proposal.confirm`) is thereby **closed as "no"** for v1 (a future owner choice to grant a scoped
> `trn.*` on the patient-session token remains an open future option, BE api-contract R1 — not implemented).
> The vision docs are left as written (history preserved); this amendment is the governing text.

## Context

TRN is the authoring phase of the speech tree, deliberately **separated from the patient's daily CONV
use** (BA Amendment 4; ADR-016). The product promise is **Dual Authorization**: new content reaches the
patient's only communication channel (CONV) **only** when both the caregiver and the patient agree. The
BA wireframe places the two halves in **two different shells under two different identities**:

- **Screen 08 (Training)** lives in the **caregiver web Shell** (`neuroassist-niv-web`, beside DASH),
  under a caregiver **JWT** — full-sidebar, keyboard-capable, the place the LLM conversation happens.
- **Screen 09 (Patient confirmation)** lives in the **patient's restricted Patient-Mode host** (same
  shell family as CONV Screen 06), under the ACS **patient-session token** (ADR-012) — no sidebar, no
  management authority, input-channel-agnostic, large targets.

A single shell with a conditional indicator was explicitly rejected by the BA (addendum §6): hiding
caregiver routes from a patient via CSS/client state is unnecessary attack surface and UX confusion for
someone without the fine motor control to "not click there". Yet both surfaces operate on the **same**
`SpeechTreeNode` proposal and the **same** dual-confirm gate, so splitting them into two modules would
duplicate the proposal model and the lifecycle logic.

## Decision

TRN is **one Nx library `@neuroassist/trn` with two feature surfaces and two identities**:

1. **One lib, two features.** `feature-training` (Screen 08) and `feature-patient-confirm` (Screen 09)
   share `proposals/` (the `ProposalFacade`, dual-confirm + lifecycle status) and the `api/` ports, but
   are **separate routes with separate guards** and are mounted by **separate shells**.
2. **Two mounts, two tokens.** The caregiver web Shell registers `@neuroassist/trn` via
   `TRN_MODULE_DESCRIPTOR` (`section:'care'`, "Training" menu) and runs Screen 08 under the caregiver
   JWT. The **Patient-Mode host** (G1, shared with CONV/GEST) mounts `feature-patient-confirm` under the
   patient-session token. The two surfaces **never share a guard or a shell**.
3. **Two guards, real session.** `caregiverAuthoringGuard` decides from `trn.session.*`/`trn.proposal.*`
   via `AccessDecisionService`; `patientConfirmGuard` decides from `trn.proposal.confirm` on the patient
   session. **Neither hardcodes `return true`** (Learning `guard:stub-permissive`).
4. **Dual-Authorization is the hard gate.** A node is published to CONV (synthesized + ES-indexed +
   activated) **only** when `caregiverConfirmed && patientConfirmed` (en) are both true (ADR-016). The
   publish push itself is **BE-owned**; the FE surfaces lifecycle status (`draft → caregiver-approved →
   patient-pending → published → retired`) and **never** implements CONV publish internals.
5. **English-only** (ADR-018): `content` keeps a per-locale shape but only `content.en` is authored.

## Alternatives considered

- **Single shared shell with a conditional "patient mode" item.** Rejected by the BA (addendum §6):
  attack surface + UX confusion; routes hidden by client state, not truly absent.
- **Two separate modules (`trn-authoring` + `trn-confirm`).** Rejected: duplicates the proposal model,
  the dual-confirm state and the lifecycle logic; harder to keep the gate consistent.
- **Patient confirmation folded into CONV (`libs/conv`).** Rejected: CONV is a read-only offline
  runtime that "never authors"; confirmation is an authoring act. CONV only **links** to TRN Screen 09.
- **Caregiver confirms on the patient's behalf (single authorization).** Rejected: violates the Dual
  Authorization safety promise (R3) — the patient must agree to what enters their only channel.

## Consequences

- (+) One source of truth for proposals + lifecycle; the dual-confirm gate is enforced in one place.
- (+) Each surface runs under the **minimum** identity it needs; no caregiver route is reachable by the
  patient session and vice-versa.
- (+) Screen 08 ships independently of G1 (caregiver web Shell exists); only Screen 09 waits on the host.
- (−) **Two mount points** to wire (web Shell + Patient-Mode host) — more integration surface (G1).
- (−) The patient session must gain `trn.proposal.confirm` (ADR-012 gap, Q1/R4) before Screen 09 works.
- (−) A `scope:trn` lib imported by two shells must keep its public surface minimal (barrel discipline).

## References

- 01 §3–§6, 02 §2–§4 (two mounts, guards), 03 §1–§5 (proposal model, invariants), 06 G1 + Q1/Q4 + R3/R4.
- BA wireframe Screens 08/09 + Addendum §6 (shell decision) + §7 (Training/confirmation placement).
- Shared ADR-006 (module-entry-as-library); ADR-016 (Dual-Authorization RBAC); ADR-018 (English-only);
  ACS ADR-012 (patient session). CONV FE ADR-007 (same `NAVIGATION_INTENT_PORT` seam reused on Screen 09).
- Learning `guard:stub-permissive` (both guards consult the real session).
