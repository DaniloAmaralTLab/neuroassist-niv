<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Proposal lifecycle and the human-in-the-loop gate (SAFETY)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY.**

## Contexto
The assistant (Anthropic Claude) proposes categories/phrases, but LLM output must never become the
patient's voice on its own. We need an explicit lifecycle that (a) separates what the model may do
from what only a human may do, (b) records the dual authorization (ADR-002), and (c) guarantees one
approval yields exactly one immutable publication (CONV is idempotent on `trn:publish:<approvalId>`).

## Decisão
**Adopt an explicit proposal state machine with a human-only approval gate:**
```
draft → proposed → (caregiver_approved ⟂ patient_approved) → approved
      → synthesizing → indexed → published            (terminal)
proposed|caregiver_approved|patient_approved → rejected   (terminal)
draft|proposed|approved → withdrawn                       (terminal)
published → erased                                        (terminal; ADR-005/ADR-007)
```
Rules:
- The LLM may only produce `draft`/`proposed`. **No automated transition crosses the `approved`
  gate** — `approved` requires both halves of the dual authorization (ADR-002, INV-TRN-2).
- `approved → synthesizing` is blocked unless a `granted` voice-cloning consent exists (ADR-005,
  INV-TRN-3).
- TRN publishes to CONV only when every approved phrase is synthesized (INV-TRN-4, no dangling asset).
- One `approval` → at most one `Publication`, idempotent on `trn:publish:<approvalId>` (INV-TRN-6).
Alternative rejected: an "auto-publish on high model confidence" shortcut — rejected outright; model
confidence is never an authorization (SAFETY).

## Consequências
- Positive: a clear, testable boundary between model suggestion and human decision; the gate cannot be
  crossed by the LLM or by a single actor.
- Positive: idempotent, immutable publication aligns exactly with CONV's publish contract.
- Positive: the state machine makes consent and synthesis preconditions explicit and auditable.
- Negative / trade-off: more states than a naive "draft/approved" flow; justified by the safety and
  compliance obligations and by the need to resume across vendor outages.
