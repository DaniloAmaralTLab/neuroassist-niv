# SPEC-10 — Integrations

> Canonical detail: `../../contracts/hub-integration.md`, `../../contracts/integration-contracts.md`.
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective
Pin CONV's internal integrations and the cross-module contracts it depends on.

## 1. Hub integrations
- **ACS** (resource server): validate patient-session + TRN service-client tokens via JWKS; honor
  blacklist. **PAT**: `GET /pat/patients/{id}` (`pat.patient.read`, service-client, ETag/304).
  **HIST**: `POST /hist/audit` (`hist.audit.record`, base URL includes `/hist`). **MIG**: owns `conv`
  migrations (V0070–V0079).

## 2. No external vendor / no TechLab AI
- CONV makes no runtime vendor call; `AudioAssetPort` reads cached bytes from blob storage; no
  `TtsPort` (synthesis is TRN, ADR-005). `ai.hasAi = false`.

## 3. Search (ADR-002)
- `SearchPort` v1 = Postgres FTS + `pg_trgm`, **caregiver/TRN-side only**, not on the patient loop; no
  patient-session search endpoint in v1 (Elastic disabled project-wide). ES/kNN later behind the same
  port, no contract change.

## 4. Cross-module contracts to pin (INT items)
- **INT-CONV-1 (first sync at provisioning — EDGE/provisioning):** a cold-empty station is offline-mute;
  provisioning MUST perform a successful first `GET /conv/tree` while online before patient handover
  (ADR-003). Owner: EDGE/provisioning (not a CONV endpoint).
- **INT-CONV-2 (TRN publish client):** TRN must hold a service-client token with `conv.tree.publish`
  (and `conv.tree-version.retire`, `conv.audio.delete` for lifecycle/erasure) to push versions to CONV
  (publish direction TRN → CONV).
- **INT-CONV-3 (ACS patient-session authorities):** the ACS-minted patient-session token must carry
  `conv.tree.read`, `conv.audio.read`, `conv.usage.record` and nothing else from CONV (ACS INV-3).
- **INT-CONV-4 (PAT consumer):** CONV is listed as a `pat.patient.read` service client; PAT rejects a
  patient-session token on `/pat` (PAT INV-PAT-7).
- **INT-CONV-5 (consent upstream):** CONV assumes every published version was consented at TRN
  authoring (ADR-005 G1/G2); CONV captures no consent.

## Acceptance criteria (EARS)
- THE SYSTEM SHALL call PAT and HIST only as a service-client, never with the patient-session token (PAT INV-PAT-7).
- THE SYSTEM SHALL place no `SearchPort` call on the patient's navigation/playback path (INV-CONV-5).
- THE SYSTEM REQUIRES a station first-sync at provisioning before patient handover (INT-CONV-1).
- THE SYSTEM SHALL accept publish/retire/erase only from a TRN service-client bearing the matching authority (INT-CONV-2).
