<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — LLM provider boundary and PII policy (SAFETY/COMPLIANCE)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY/COMPLIANCE.**

## Contexto
TRN uses an LLM (Anthropic Claude) to converse with the caregiver/patient and propose content. Two
risks dominate: (1) **data leaving the system** — the prompt context is health-context personal data
(LGPD); (2) **untrusted model output** — a response could try to steer the system (claim an approval,
a tenant, or a publish). The LLM is an **external data processor**, not a trusted component. The port
must keep the vendor swappable and keep the domain free of any SDK.

## Decisão
**Isolate the LLM behind `LlmDialogPort` (Anthropic adapter in `infrastructure/` only) with a strict
PII and trust policy:**
- **Data minimisation:** only the minimal authoring context leaves the system — draft category/phrase
  text and caregiver prompts. **No** patient name, PHI, or free-text identifier; the patient is
  referenced by `patientId` only (INV-TRN-7). No audit/history content is sent to the vendor.
- **Untrusted output:** LLM responses are **data, never instructions**. Model output can never set an
  authority, select a tenant, flip an approval flag, or trigger a publish/erase (prompt-injection
  containment). It may only populate a `draft`/`proposed` proposal for human review (ADR-003,
  INV-TRN-2).
- **Human-in-the-loop:** nothing the model writes is published without the dual authorization
  (ADR-002). Model confidence is never an authorization.
- **Vendor governance:** the Anthropic data-processing agreement, region and retention are TRN
  obligations; the integration is off the patient live path and degrades gracefully when the vendor is
  unavailable (session resumable).
Alternatives rejected: (A) sending richer patient context "for better suggestions" — rejected on
minimisation grounds; (B) letting the model emit structured actions the system executes — rejected as
an injection vector.

## Consequências
- Positive: the external-processor exposure is minimised and auditable; a vendor swap is a port
  adapter change with no domain impact.
- Positive: prompt-injection cannot escalate privilege or publish content, by construction.
- Negative / trade-off: minimised context may yield less tailored suggestions; accepted — safety and
  privacy over suggestion quality. The minimisation and trust rules must be enforced in specs/tests,
  not left as prose.
