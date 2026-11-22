# Backend API Cross-Link — conv (CONV) Frontend

> CONV **consumes** conv-service exactly as published (`backend/services/conv-service/contracts/api-contract.md`);
> it **redefines no BE contract** and invents no URL (NÃO fazer: redefine BE contracts). This cross-link maps
> each FE port to its BE endpoint, pins the authority set, records the upstream INT items / amendments, and
> lists the open items (host G1, access-decision stub, registry label). The BE contract is the source of
> truth; where this file and the BE contract differ, the BE contract wins.

## 1. FE port → BE endpoint map

| FE port / service | BE endpoint (api-contract) | Verb | Auth (token) | Authority | FE usage |
|---|---|---|---|---|---|
| `TREE_SNAPSHOT_PORT` / `TreeSyncService` | `/conv/tree` (§2.1) | GET | patient-session | `conv.tree.read` | out-of-loop sync; strong `ETag` + `If-None-Match`→`304`; cached in IndexedDB |
| `AUDIO_ASSET_PORT` / `AudioPlaybackService` | `/conv/audio/{assetId}` (§3.1) | GET | patient-session | `conv.audio.read` | prefetch + cached-Blob fetch; `206` range; immutable `Cache-Control`; `410` erased → fallback |
| `USAGE_SIGNAL_PORT` / `UsageSignalService` | `/conv/usage-signals` (§4.1) | POST | patient-session | `conv.usage.record` | opt-in; `phraseId` + `occurredAt` + `idempotencyKey`, **no free text**; `202`/`200` idempotent |
| — (health, not a FE surface) | `/conv/health` (§8.1) | GET | public | — | ops/GWY only; not called by the patient UI |

**Not consumed by the FE (TRN service-client only — no CONV UI):** `POST /conv/trees` (`conv.tree.publish`),
`POST /conv/tree-versions/{versionId}:retire` (`conv.tree-version.retire`),
`DELETE /conv/patients/{patientId}/audio` (`conv.audio.delete`). A patient-session token is rejected `403` on
these (ACS INV-3; BE §0.2). CONV renders no surface for them.

## 2. Authority set (BE-canonical, D-639)

The CONV FE permission map (SPEC-05 §2) is exactly the **patient-session** authority set:
`{ conv.tree.read, conv.audio.read, conv.usage.record }` — copied **verbatim** from BE api-contract §10 and
present in the permission catalogue (`arch/decisions/permission-catalogue.arch.json`, `conv` module, all six
authorities populated). CONV adds **no** UI authority. `pat.patient.read` is a **service-client** read CONV
makes server-side for patient context — **not** a patient-session UI authority, so it is not in the FE map.

## 3. Resolved questions, INT items and upstream amendments

**Resolved by the BE contract (no amendment needed):**
- **Audio-delivery shape (vision Q3).** Resolved: the tree response carries an `audioManifest`
  (`assetId` → `/conv/audio/{assetId}`, `contentHash`, `mediaType`, `durationMs`); clips are **immutable**,
  range-serveable (`206`), with `Cache-Control: ... immutable` (BE §2.1/§3.1). FE caches Blobs by `assetId`.
- **Event emission on select (vision Q2 / doc 03 §5 TODO).** Resolved: CONV emits **no** catalog Event on the
  live path; `PhraseSpoken` is client-side with no CONV call, persisted only as an opt-in `usage_signal`
  (BE event-contracts §2, INV-CONV-5/6). FE confirms: selecting a phrase triggers playback + an opt-in usage
  signal only — no EVNT call.
- **Consent (INT-CONV-5).** CONV captures no consent; every published version was consented at TRN authoring
  (BE SPEC-10 §4). FE captures none.

**INT items the FE raises / depends on upstream:**
- **INT-FE-CONV-1 (GEST).** GEST must publish navigation intents **in-process** to CONV's
  `NAVIGATION_INTENT_PORT` (mirror of `STATION_LIVENESS_PORT`, reversed). This is a GEST FE integration export;
  GEST never HTTP-calls CONV (ADR-007). Non-blocking (no-op default). Logged for `/fe-architect-backlog`.
- **INT-FE-CONV-2 (EDGE / provisioning) — amendment to BE SPEC-10 INT-CONV-1.** BE INT-CONV-1 requires a
  successful first `GET /conv/tree` while online before patient handover. **Proposed amendment:** the
  first-sync obligation should also **prefetch the audio manifest's clips** into the station cache (not only
  read the tree), because the FE offline promise (R1) is that the patient can **speak** offline — a tree
  without cached audio degrades every phrase to the TTS/text fallback. Owner: EDGE/provisioning (not a CONV
  endpoint). Non-blocking but safety-relevant.

> These are **frontend** export/obligation requests; they add **no** backend endpoint and change **no** BE
> authority. INT-FE-CONV-2 is an amendment proposed to the BE SPEC-10 INT item's wording, not a new endpoint.

## 4. Open items (host G1, access-decision, registry label)

- **G1 — Patient-Mode host is UNDECIDED (shared with GEST `INT-FE-GEST-003`).** No host app is assumed. CONV
  ships as a **library facade** (Port/Adapter/Facade: `CONV_MODULE_DESCRIPTOR`, `CONV_ROUTES`, `provideConv`,
  no-op `NAVIGATION_INTENT_PORT`) so it mounts into whatever host is chosen. The host must wire the
  patient-session interceptor (CONV egress), the device-token interceptor (GEST/EDGE egress),
  `STATION_LIVENESS_PORT` (edge←gest) and `NAVIGATION_INTENT_PORT` (gest→conv). Host choice = open item.
- **`shared/access-decision` is a Wave-0 stub** (interface only). `patientSessionGuard` is **stub-permissive**
  at the **PLATFORM / frontend `routeGuards`** level until it is fleshed out; it decides from the real
  patient-session presence today and **never** hardcodes `return true`. CONV does not invent `access-decision`.
- **Registry label.** `modules.registry[CONV].frontendLib = "conv-ui"` contradicts the verified on-disk
  convention `@neuroassist/conv` (`frontend/libs/conv`, matching gest/edge/pat). Specs follow the verified
  convention; the registry label should be reconciled (non-blocking, carried from vision doc 06).
- **Q1 — two tokens on one station** (patient-session for CONV vs `edge.device` for GEST/EDGE): interceptor
  scoping per egress is a host concern (doc 06 Q1; owner default: yes, two tokens).

## 5. Verbatim-consumption rule

CONV binds the BE endpoints **as published**: same paths, same verbs, same authorities, same error `type`
slugs (BE §9 → SPEC-07 §2). It redefines nothing. A change to the tree/audio/usage contract is a **BE** change
first; the FE adapters then follow the new wire shape through the shared mappers (SPEC-04 §2).
