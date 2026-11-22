# EDGE — Structured Brief (source for Specs / Backlog / Scaffold)

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: `java` (Java 21 / Spring Boot, hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled

1. **Canonical name / prefix:** `edge-service` (canonical `edge`) / prefix `EDGE`.

2. **Problem it solves:** NeuroAssist NIV runs gesture detection *locally* on the
   patient's device (ADR-002 embedded AI edge; ADR-006 hybrid edge+cloud). The cloud
   needs a trustworthy way to **enroll** that local agent (the "edge station"), **pair**
   it to a patient, hand it a **device identity** it can use to report, **monitor** that
   it is alive (heartbeat → online/offline), and keep it **operational offline** by
   distributing the command catalog it detects against. EDGE owns that device lifecycle;
   no other module does.

3. **Personas:** primary = **Clinic Coordinator** (`CLINIC_COORDINATOR`, enrolls and
   pairs a device once, revokes/deactivates it); secondary = **Family Caregiver**
   (`CAREGIVER`, reads device status on the dashboard, can revoke); non-human actor =
   **Edge device** (the browser-based station of ADR-014, authenticates with the
   EDGE-issued `edge.device` token, records heartbeats and reads its cached catalog).

4. **MVP scope (minimum viable):** device enrollment (coordinator) with a short-lived
   pairing code; code-based **pairing/claim** flow (`awaiting_claim` → `paired`) that
   mints the device credential; **device-token issuance** (`edge.device`, EDGE is the
   device authorization endpoint — ACS validates, does not mint); **heartbeat**
   recording + a watchdog that flips a device to `offline` after a missed-heartbeat
   threshold (ADR-014 D5); **offline catalog distribution** — EDGE pulls the PAT catalog
   with a service-client identity (`pat.command.read`, ETag/304) and serves the last
   good copy to the paired device (ADR-004 staleness ownership); device **deactivate /
   revoke / unpair**. Same pairing reused for the Android/Chromium mobile station
   (ADR-014) with no flow of its own.

5. **Out of MVP scope:** gesture recognition itself (GEST owns detection truth);
   structured-event generation and alarm routing (EVNT); the patient-with-session actor
   and its CONV/GEST authorities (ACS, ADR-012 Option C — a *separate* credential that
   coexists on the same device); caregiver identity and the JWT blacklist (ACS); native
   mobile pipeline and iOS background capture (ADR-014 Option 2, deferred); an async
   outbox/broker for edge→cloud sync (messaging disabled; ADR-006 signal only).

6. **Mandatory external integrations:** none external. Internal sync REST only:
   EDGE → PAT (catalog pull, service-client `pat.command.read`, ETag/304); EDGE → ACS
   (JWKS to validate caregiver/coordinator tokens; EDGE is itself an ACS resource server
   for human-facing endpoints); EDGE → HIST (audit of enroll/pair/revoke/deactivate);
   EDGE → MIG (schema migrations). The edge device → EDGE (pairing, heartbeat, catalog
   read). TLS outside localhost (TECH-006); internal-network only (OPS-002).

7. **TechLab AI services depended on:** none (`ai.hasAi = false`). Messaging disabled
   (`stack.messaging.enabled = false`), so no event dependency on other modules;
   intra-project relationships are synchronous REST. EDGE references `Patient` (PAT) and
   `Caregiver` (ACS) by id only; PAT and ACS reference `EdgeDevice` (EDGE) by id only —
   no cross-service FK either way.

8. **Anchor domain event:** **DevicePaired** (an enrolled edge station claims its code
   and becomes an operational, credentialed device), with **DeviceEnrolled**
   foundational and the heartbeat-driven **DeviceWentOffline** / **DeviceCameOnline** as
   the connectivity lifecycle, and **DeviceRevoked** terminal.

## Source ADRs (handoff `_inbox/adr/`) material to this module

- ADR-002 — AI embedded on the edge (detection is local; EDGE monitors the agent, does
  not run detection).
- ADR-006 — hybrid edge + cloud (device operates offline; EDGE owns last-fetched catalog
  and the edge→cloud sync boundary; outbox is a future signal, not MVP).
- ADR-014 — GEST on the patient's mobile phone + pairing reuse (the mobile phone is one
  more "station"; device token `edge.device`, EDGE pairing reused with no flow of its
  own; D5 heartbeat watchdog mandatory).
- ADR-012 — patient identity model (the patient-session is ACS's actor, *not* the EDGE
  device token; the two credentials coexist on the same device).
- Upstream contracts respected: ACS `ADR-002-identity-and-authority-model` ("edge device
  token owned by EDGE; ACS validates but does not mint it"); PAT `ADR-004`/api-contract
  §3.3.1 (catalog ETag/304, offline staleness owned by EDGE); PAT api-contract
  authority matrix (detection service client `pat.command.read`).
- Project shared: `ADR-001-hexagonal-architecture` (java) · `ADR-003-multi-tenancy`
  (schema-per-tenant) — referenced, not reemitted.

## Known generator pitfalls applied proactively (Learning Layer, D-611)

- `security:tenant-filter:order-before-spring-security` — register `TenantContextFilter`
  *inside* the `SecurityFilterChain` (`http.addFilterAfter(..., BearerTokenAuthenticationFilter.class)`),
  never as a standalone `@Component` servlet filter; so `SecurityContextHolder` is
  populated when tenant is extracted from the JWT. Flagged for scaffold/P5.
- `hexagonal:api-controller:infrastructure-import-rule04` — inbound port signatures must
  NOT carry `tenantId`; application services call `TenantContextHolder.require()` as the
  first line; controllers must not import `infrastructure.security` (ArchUnit RULE-04).
