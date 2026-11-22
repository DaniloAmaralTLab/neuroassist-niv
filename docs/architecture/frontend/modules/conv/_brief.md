# CONV — Structured Brief (source for Specs / Backlog / Scaffold)

> Module: **CONV — Conversation via Speech Tree** · Service: `conv-service` · Project: NeuroAssist NIV
> Stack: `java` (Java 21 / Spring Boot, hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled · Content: English-only

1. **Canonical name / prefix:** `conv-service` (canonical `conv`) / prefix `CONV` · package `com.neuroassist.conv`.

2. **Problem it solves:** CONV **is the patient's voice** at runtime. A person with
   ALS/MND who can no longer speak navigates a **speech tree** (category → phrase) and
   plays back the chosen phrase as **pre-synthesized audio in their own cloned voice**.
   The tree is **input-channel-agnostic**: it can be driven by gesture (resolved by the
   in-process GEST station runtime) or by direct touch/mouse. Because this is the only
   channel the patient has to ask for help or converse, CONV must keep working **offline**
   and must **never block a phrase on a server round-trip**. CONV owns the *runtime*
   only — it serves an approved, versioned tree and its cached audio, and plays it; it
   does not author content and does not synthesize audio.

3. **Personas:** primary = **Patient-with-session** (the person who communicates; drives
   the station with the ACS-minted patient-session token restricted to `conv.*`/`gest.*`,
   ACS INV-3). Secondary = **Family Caregiver** (`CAREGIVER`) / **Clinic Coordinator**
   (`CLINIC_COORDINATOR`) who set up Patient Mode and review opt-in usage on the dashboard
   (DASH). Non-human actors: the **patient station** (browser/edge runtime that mounts the
   tree and holds the offline cache) and the **TRN service-client** (authoring phase that
   hands CONV an approved tree version). TRN itself is upstream, not a CONV runtime persona.

4. **MVP scope (minimum viable):** serve the **published per-patient speech-tree bundle**
   (tree structure + audio manifest) behind a strong **ETag/version** (`GET /conv/tree`,
   authority `conv.tree.read`, patient-session token); serve/stream the **cached audio
   assets** (`conv.audio.read`); **offline-first station cache** — the station persists the
   last good bundle + audio and runs it; a read **never hard-fails** on a CONV or network
   outage (the patient keeps speaking from cache, stale-but-usable), refresh is
   opportunistic via `If-None-Match`/`304` (EDGE ADR-004 pattern); **input-channel-agnostic
   navigation** that runs **entirely client-side over the cached tree** (no per-step network
   call) through an in-process station seam fed by both gesture and touch adapters;
   **publish intake** of an approved tree version from TRN (`POST /conv/trees:publish`,
   service-client `conv.tree.publish`) with an audited **TreePublished** fact to HIST;
   optional **opt-in minimal usage signal** (`conv.usage.record`, `phraseId` + timestamp,
   **no free text**).

5. **Out of MVP scope:** authoring/curation of tree content, the LLM dialog and dual
   authorization (**TRN**); **audio synthesis / any ElevenLabs call** (TRN authoring phase —
   CONV runtime never calls the TTS vendor); gesture recognition engine (**GEST**);
   structured-event generation / alarm routing / escalation (**EVNT** — CONV is *not* wired
   for escalation, superseded by EVNT ADR-005); caregiver identity, session provisioning and
   the JWT blacklist (**ACS**); patient registration and the gesture command catalog
   (**PAT**); device enrollment, pairing and heartbeat (**EDGE**); an async outbox/broker
   (messaging disabled); any language beyond English (English-only).

6. **Mandatory external integrations:** none external at runtime. Internal sync REST only:
   CONV ← **TRN** (receives an approved, immutable tree version to publish; service-client
   `conv.tree.publish`); CONV → **PAT** (patient reference read, service-client
   `pat.patient.read`, ETag/304 — a patient-session token is rejected `403` on every `/pat`
   path, PAT INV-PAT-7); CONV → **HIST** (audit `TreePublished`; service-client
   `hist.audit.record`); CONV → **ACS** (JWKS to validate the patient-session token — CONV
   is an ACS resource server for the station); CONV → **MIG** (schema migrations). The
   patient station (patient-session token) → CONV (read tree + audio, record opt-in usage).
   TLS outside localhost (TECH-006); internal-network only.

7. **TechLab AI services depended on:** none (`ai.hasAi = false` for the CONV runtime). The
   LLM (Claude/Anthropic) and ElevenLabs belong to **TRN's authoring phase**, not CONV.
   Messaging disabled (`stack.messaging.enabled = false`), so no event dependency on other
   modules; intra-project relationships are synchronous REST. CONV references `Patient`
   (PAT) by id only.

8. **Anchor domain event:** **PhraseSpoken** (the patient selects and plays a phrase — the
   act of communicating, the reason CONV exists), with **TreePublished** foundational (a
   new approved vocabulary version becomes active for a patient) and **TreeVersionWithdrawn**
   as the terminal/erasure counterpart. `PhraseSpoken` is a domain concept; its persistence
   is **opt-in and minimal** (never free text) and it is **not** a HIST audit fact (ADR-006).

## Decisions resolved in this vision (orchestrator defaults — revisable by the owner)

- **ADR-002 — retrieval without Elasticsearch (the registry says ES/kNN; Elastic is
  disabled for this project).** Recommendation adopted: a `SearchPort` abstraction; v1
  adapter = **PostgreSQL full-text (`tsvector`) + trigram (`pg_trgm`)** for optional
  server-side assisted lookup, and **client-side search over the cached tree** for the
  patient's live navigation (zero network). pgvector-in-Postgres is the drop-in semantic
  upgrade; ES/kNN can be adopted later **behind the same `SearchPort`** with no contract
  change.
- **ADR-003 — offline-first tree + audio cache (SAFETY).** Immutable, versioned per-patient
  bundle served behind a strong ETag; the station runs the last good copy; never a server
  round-trip per phrase; stale cache is usable, refresh is opportunistic (EDGE ADR-004
  pattern).
- **ADR-004 — input-channel navigation seam.** Input-channel-agnostic; gesture (in-process
  GEST station seam) and touch/mouse feed one client-side `NavigationInput` seam over the
  cached tree; no per-navigation CONV endpoint.
- **ADR-005 — patient-voice TTS boundary & consent (SAFETY/COMPLIANCE).** CONV runtime only
  **plays** cached audio via an `AudioAssetPort`; synthesis + consent capture + voice-sample
  storage + vendor data-processing live in **TRN authoring**; a `TtsPort` exists only there.
  Erasure of voice model id / audio aligns with HIST **ADR-006 crypto-shred**.
- **ADR-006 — persistence & audit facts (SAFETY/privacy).** CONV persists **published tree
  versions per patient** (and an opt-in minimal usage signal); the patient's live speaking
  never writes to HIST (so HIST availability never gates the patient's voice). Audit facts
  and their ADR-005 (HIST) hard-502 vs commit+durable-retry classification are listed there.
- **Patient-session `conv.*` authorities (ACS INV-3), English verbs:** `conv.tree.read`,
  `conv.audio.read`, `conv.usage.record`. Not in the patient-session token:
  `conv.tree.publish` (TRN service-client); CONV also consumes `pat.patient.read` and
  `hist.audit.record` as a service-client.

## Source ADRs and upstream contracts respected

- **ACS** `ADR-002-identity-and-authority-model` + `SPEC-02-patient-session-orchestration`
  (INV-3: patient-session token restricted to `conv.*`/`gest.*`, minted without expiry,
  revoked via blacklist → `401`). CONV is the consumer of that token.
- **PAT** api-contract §1.3 `GET /pat/patients/{patientId}` (`pat.patient.read`, matrix lists
  the **CONV service client** as consumer) + INV-PAT-7 (patient-session token `403` on `/pat`).
- **GEST** blueprint station self-check / in-process station seam (the station maps resolved
  commands to actions locally; CONV reuses the same client-side seam for navigation).
- **EDGE** `ADR-004-offline-catalog-distribution` + api-contract §4 `GET /edge/catalog`
  (ETag/304, last-cache-never-hard-fail) — the model for CONV's offline tree bundle.
- **HIST** `ADR-005-audit-write-failure-policy` (hard-502 vs commit+durable-retry) and
  `ADR-006-retention-vs-erasure` (crypto-shred) — CONV classifies its audit facts and its
  erasure against these.
- **EVNT** note: CONV is **not** wired for escalation (superseded by EVNT's out-of-band
  ADR-005); CONV does not emit alarms.
- Project shared (referenced, **not** reemitted): `ADR-001-hexagonal-architecture` (java) ·
  `ADR-002-modular-monolith` · `ADR-003-multi-tenancy` (schema-per-tenant).

## Known generator pitfalls applied proactively (Learning Layer, D-611)

- `security:tenant-filter:order-before-spring-security` — register `TenantContextFilter`
  *inside* the `SecurityFilterChain`, after `BearerTokenAuthenticationFilter`, so the
  tenant is extracted only once the patient-session JWT is authenticated.
- `hexagonal:api-controller:infrastructure-import-rule04` — inbound port signatures must not
  carry `tenantId`; application services call `TenantContextHolder.require()` first;
  controllers must not import `infrastructure.security` (ArchUnit RULE-04).
