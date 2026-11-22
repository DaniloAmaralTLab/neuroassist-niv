# CONV — Hub Integration

> Service: `conv-service` · Hub services consumed: **MIG, ACS, PAT, HIST**. **No TechLab AI**
> (`ai.hasAi = false`) — the LLM and ElevenLabs belong to TRN authoring, not CONV (ADR-005).
> All calls are synchronous REST over TLS outside localhost (TECH-006), internal-network only.

## 1. ACS — identity / token validation (resource server)

CONV is an **ACS resource server**. It validates the ACS-minted **patient-session** token (station)
and the **TRN service-client** token via **ACS JWKS**; CONV mints no token.

- Base: `neuroassist.acs.base-url` (includes `/acs`). JWKS via ACS well-known (ACS api-contract).
- Patient-session token: `actorType = patient-session`, authorities restricted to `conv.*`/`gest.*`
  (**ACS INV-3**), minted without expiry, revoked via the ACS blacklist → `401`.
- EARS:
  - WHEN a request bears a patient-session token on a `conv.tree.read`/`conv.audio.read`/`conv.usage.record` endpoint, THE SYSTEM SHALL validate it against ACS JWKS and honor the ACS blacklist (`401` if revoked).
  - IF a patient-session token is presented on a TRN-only endpoint (`conv.tree.publish` / `conv.tree-version.retire` / `conv.audio.delete`), THEN THE SYSTEM SHALL respond `403 Forbidden` (ACS INV-3).

## 2. PAT — patient reference (service-client, `pat.patient.read`)

CONV reads the patient reference to confirm the patient exists/is active before publish (and for
operator/caregiver context). Service-client call only.

- Base: `neuroassist.pat.base-url` (includes `/pat`). Endpoint: `GET /pat/patients/{patientId}`
  (`pat.patient.read`), ETag/`304` (PAT api-contract §1.3).
- EARS:
  - WHEN CONV needs a patient reference, THE SYSTEM SHALL call `GET /pat/patients/{patientId}` as a **service-client** (never with the patient-session token — PAT INV-PAT-7 rejects it `403` on `/pat`), using `If-None-Match` to exploit `304`.
  - THE SYSTEM SHALL reference `patientId` only; CONV stores no PAT-owned patient attributes (doc 05).

## 3. HIST — audit facts (service-client, `hist.audit.record`)

CONV POSTs its audit facts (see `event-contracts.md` §3). HIST base URL **includes `/hist`**.

- Base: `neuroassist.hist.base-url` (includes `/hist`). Endpoint: `POST /hist/audit`
  (`hist.audit.record`, service-client), canonical envelope (HIST api-contract §1).
- Classification (HIST ADR-005, local ADR-006): `TreePublished` / `TreeVersionSuperseded` = **hard-502**
  (roll back publish on audit failure); `TreeVersionWithdrawn` / `AudioAssetsErased` = **commit +
  durable-retry** (erasure never blocked).
- EARS:
  - WHEN publishing, THE SYSTEM SHALL audit `TreePublished`+`TreeVersionSuperseded` in the publish transaction and `502` on failure (hard-502).
  - WHEN retiring/erasing, THE SYSTEM SHALL commit first then audit with durable idempotent retry (commit + durable-retry).

## 4. MIG — centralized migrations

- MIG owns and applies the `conv` schema Flyway migrations (block **V0070–V0079**, `data-model.md` §4)
  across tenant schemas. CONV ships versioned SQL and **no runner** (doc 04/05).

## 5. Feign client map

| Client | Service | url prop | Operations |
|---|---|---|---|
| `PatClient` | pat-service | `neuroassist.pat.base-url` | `GET /pat/patients/{patientId}` (`pat.patient.read`) |
| `HistClient` | hist-service | `neuroassist.hist.base-url` | `POST /hist/audit` (`hist.audit.record`) |

> No `AcsClient` Feign call on the hot path: ACS integration is JWKS validation (resource-server
> config), not a Feign RPC. No TRN client — TRN **pushes** to CONV (publish direction TRN → CONV).
