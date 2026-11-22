# SPEC-10 — Integrations

> External processors (Anthropic, ElevenLabs, Elasticsearch) + internal sync REST (CONV/PAT/HIST/ACS).
> Full contracts: `../../contracts/integration-contracts.md`, `../../contracts/hub-integration.md`.
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Pin every TRN integration and the cross-module INT items, so adapters and the service-client token are
implemented correctly and the backlog emits the `INT-TRN-*` issues.

## Scope

**In:** the four ports (LLM/TTS/ES/CONV publication) + PAT/HIST + ACS identity + the INT items. **Out:**
the other modules' internals (no edits to their docs).

## External processors (ports in `infrastructure/` only)

| Port | Vendor | Rule | Failure |
|---|---|---|---|
| `LlmDialogPort` | Anthropic Claude | minimised context (patientId only), untrusted output | `503`, session resumable (ADR-004) |
| `TtsPort` | ElevenLabs | consent-gated, approved phrases only, per-subject key | synth retried, no partial publish (ADR-005) |
| `SearchIndexPort` | Elasticsearch | approved-only, tenant-isolated, non-blocking | retried, publish proceeds (ADR-006) |
| `TreePublicationPort` | CONV | publish/retire/erase, idempotent | retried idempotently (ADR-007) |

## Internal (sync REST)

| Peer | Op | Authority | Notes |
|---|---|---|---|
| CONV | `POST /conv/trees` / `:retire` / `DELETE .../audio` | `conv.tree.publish`/`conv.tree-version.retire`/`conv.audio.delete` | TRN service-client; `trn:publish:<approvalId>`; dangling → `422` |
| PAT | `GET /pat/patients/{id}` | `pat.patient.read` | service-client, ETag/304; patient-session `403` (INV-PAT-7) |
| HIST | `POST /hist/audit` | `hist.audit.record` | service-client; hard-502 vs commit+durable-retry (ADR-007) |
| ACS | JWKS validate + mint service-client | — | TRN resource server; ACS INV-3 |

## INT items (declared here + integration-contracts §5 — backlog emits `INT-TRN-*`)

- **INT-TRN-1 — service-client authorities (ACS).** ACS must mint the TRN service-client token with
  `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`, `hist.audit.record`,
  `pat.patient.read`. **Closes the TRN side of CONV `INT-CONV-2`.**
- **INT-TRN-2 — publish only after dual auth + `sourceVersionRef` (CONV).** No publish unless both
  halves present; body carries `sourceVersionRef = trn:approval:<approvalId>`. **Closes the TRN side of
  CONV `INT-CONV-5`** (consent upstream).
- **INT-TRN-3 — consent durable before synthesis.** Granted consent (patient + rep) audited
  (`ConsentGranted`, hard-502) before any `TtsPort` call (INV-TRN-3).
- **INT-TRN-4 — erasure propagates to CONV, never blocked.** Crypto-shred + `conv.tree-version.retire` +
  `conv.audio.delete` + audit, commit + durable-retry (INV-TRN-9).

> No EDGE/GEST/EVNT INT items apply to TRN.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL keep all vendor SDKs in `infrastructure/` behind ports; `domain`/`application` SHALL import no SDK (ADR-004/005/006, RULE-04).
- THE SYSTEM SHALL call CONV/PAT/HIST only with the TRN service-client token carrying the five authorities of INT-TRN-1.
- THE SYSTEM SHALL publish to CONV only after the dual authorization is complete and carry `sourceVersionRef` (INT-TRN-2).
- WHEN Elasticsearch is unavailable, THE SYSTEM SHALL still publish to CONV (indexing non-blocking — ADR-006).
- WHEN HIST or CONV is unavailable, THE SYSTEM SHALL never block erasure/revocation and never affect CONV runtime (INT-TRN-4, INV-TRN-9).
