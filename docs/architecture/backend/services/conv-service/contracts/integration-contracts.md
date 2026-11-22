# CONV — Integration Contracts

> Service: `conv-service` · **No external vendor at runtime.** Internal sync REST + blob storage only.
> EARS guide: `../../../standards/ears-notation.md`.

## 1. External systems

**None at runtime.** ElevenLabs (voice synthesis) and the Claude/Anthropic authoring dialog are
**TRN** concerns; CONV serves only the pre-synthesized cached output (ADR-005). CONV introduces no new
vendor relationship, no `TtsPort`, and makes no vendor call on any path (INV-CONV-5).

## 2. Blob / object storage (`AudioAssetPort`)

CONV reads pre-synthesized audio **bytes** from blob/object storage via `AudioAssetPort` and holds
only references (`storage_ref`) + an erasable `voice_model_ref` (`data-model.md` §2.5).

- Auth: storage credentials from config/secret (service identity), not patient-derived.
- EARS:
  - WHEN serving `GET /conv/audio/{assetId}`, THE SYSTEM SHALL fetch the cached clip through `AudioAssetPort` by `storage_ref` and stream it; THE SYSTEM SHALL never synthesize (ADR-005).
  - WHEN erasing (`conv.audio.delete`), THE SYSTEM SHALL crypto-shred the per-subject key so the stored bytes/reference become unreadable (ADR-005/ADR-006).

## 3. `SearchPort` — assisted lookup (ADR-002, NOT on the patient loop)

- v1 adapter = PostgreSQL FTS (`tsvector`) + trigram (`pg_trgm`) over `phrase` (`data-model.md` §2.4).
- **Caregiver/TRN-side only.** The patient's live search is **client-side over the cached tree**
  (zero network, INV-CONV-5); CONV exposes no patient-session search endpoint in v1 (api-contract §1).
- pgvector-in-Postgres is the drop-in semantic upgrade; ES/kNN can be adopted later **behind the same
  `SearchPort`** with no contract change (ADR-002 — note the project runs with Elastic disabled).
- EARS:
  - THE SYSTEM SHALL NOT place any `SearchPort` call on the patient's navigation/playback path (INV-CONV-5).
  - WHERE an assisted-lookup endpoint is later exposed, THE SYSTEM SHALL gate it behind a TRN service-client authority, never a patient-session one.

## 4. Internal relationships (summary — details in `hub-integration.md`)

| Direction | Peer | Transport | Auth |
|---|---|---|---|
| TRN → CONV | publish / retire / erase | sync REST (push) | TRN service-client token |
| CONV → PAT | patient reference read | sync REST (Feign) | `pat.patient.read` service-client |
| CONV → HIST | audit facts | sync REST (Feign) | `hist.audit.record` service-client |
| CONV ← ACS | token validation | JWKS (resource server) | — |
| station → CONV | tree/audio read, usage | sync REST | patient-session token |

## 5. Resilience

- TLS outside localhost (TECH-006); internal-network only; no public ingress except via GWY.
- **Live path never depends on an outbound call** (INV-CONV-5): the station reads from its local cache;
  a CONV/PAT/HIST/network outage never prevents navigation or playback.
- Publish: `TreePublished` audit is in-band hard-502 (publishing is not time-critical — integrity wins).
- Retire/erase: commit + durable idempotent retry (erasure never blocked by a HIST outage — ADR-006).
- PAT read: `If-None-Match`/`304`; a PAT outage degrades operator context but never the station path.

## 6. Provisioning dependency (INT item — EDGE/provisioning)

- **INT-CONV-1 (first sync at provisioning):** a cold, empty station that has never fetched a bundle is
  offline-**mute** (no cached tree). THE SYSTEM REQUIRES that the station perform a successful first
  `GET /conv/tree` while online at provisioning/pairing time, before being handed to the patient. This
  is an **EDGE/provisioning** obligation (device enroll → pair → first CONV sync), not a CONV backend
  endpoint — listed here and in SPEC-10 so it is pinned as a cross-module contract (ADR-003).
