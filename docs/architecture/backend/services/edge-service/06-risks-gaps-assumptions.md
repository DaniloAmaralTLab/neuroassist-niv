<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposições a Validar
- Dependências Críticas
-->

# 06 — Risks, Gaps, Assumptions

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Riscos

- **R1 — Silent detection stop (aggravated on mobile).** ADR-014 names it "the worst
  failure mode of this product." A phone locks its screen and switches apps far more than a
  dedicated PC, so heartbeats may lapse during real use. Mitigation: the watchdog +
  visible `offline` on the dashboard are mandatory, and the heartbeat threshold must be
  tuned conservatively. EDGE surfaces silence; it cannot force the browser to stay awake.
  **Partly mitigated since ADR-005 (SAFETY-GEST-1):** the heartbeat now carries a
  `detectionState`, and a scheduled lapse sweep escalates "not detecting while connected" to
  EVNT — the case the connectivity-only signal could not catch. See R6 for the new boundary.
- **R2 — Pairing-code leakage.** A bearer code that mints a device credential is a secret;
  if intercepted it could pair a rogue station. Mitigation: short TTL, single-use, hashed
  at rest, TLS (TECH-006), and audit of every claim.
- **R3 — Stale catalog during long offline windows.** EDGE serves the last good catalog
  (ADR-004); a command recalibrated in PAT while the edge is offline is not detected until
  refresh. Accepted trade-off of the offline-first design; bounded by a refresh hint and
  made visible via `fetchedAt`.
- **R4 — Device-token revocation latency.** A long-lived device token needs an immediate
  kill path; if resource servers cache validation, a revoked device could linger.
  Mitigation: see Gap G1 — introspection/short-TTL-refresh decision.
- **R5 — Tenant-filter ordering regression (Learning).** If `TenantContextFilter` runs as a
  standalone servlet filter before Spring Security, `SecurityContextHolder` is empty and
  tenant resolution fails for every request. Design-out: register it inside the
  `SecurityFilterChain` (`addFilterAfter(BearerTokenAuthenticationFilter.class)`),
  `FilterRegistrationBean(enabled=false)`, no `@Component`/`@Order`.
- **R6 — Detection-lapse coverage boundary (ADR-005, SAFETY-GEST-1).** The new detection-state
  + lapse mechanism changes what is guaranteed about a silent detection stop. **Now
  guaranteed:** a station that is **connected but not detecting** — it reports `PAUSED` /
  `DEGRADED` / `UNAVAILABLE` / `UNKNOWN`, or stops beating — for `N` minutes (default 2) raises
  a detection-lapse escalation to EVNT (push → SMS → voice, EVNT ADR-005). An older station
  that omits `detectionState` is treated as `UNKNOWN`, never `RUNNING`, so it is **not** falsely
  assumed healthy (INV-EDGE-9). **Not guaranteed:** a station that is **fully off** (no process,
  no network) cannot self-report `PAUSED` — a powered-off phone sends nothing; that case is
  caught instead by the **heartbeat-stop** arm (silence for `N` ⇒ `cause = HEARTBEAT_STOPPED`),
  so it still raises a lapse, but only after `N`, not instantly. The residual uncovered windows
  are (a) any lapse **shorter than `N`** (the threshold debounces benign pauses, trading latency
  against false alarms) and (b) anything **before the first successful pair/heartbeat** (no
  device state to lapse yet). Mitigation: tune `N` conservatively; EVNT owns the escalation
  ladder; the raise is retried-not-dropped on EVNT outage (safety-critical). EDGE surfaces the
  lapse; it still cannot force the browser awake.

## Gaps Conhecidos

- **G1 — Exact device-token validation & immediate-revocation mechanism.** ADR-002 (local)
  fixes that EDGE *mints* the `edge.device` token (ACS validates, does not mint). The
  concrete validation fabric (EDGE JWKS trusted by PAT/EVNT alongside ACS) and the
  immediate-revoke path (introspection endpoint vs. short-TTL + heartbeat-coupled refresh)
  must be finalized in specs. Aligns with ACS ADR-002 and ADR-012's open TODO.
- **G2 — Which service-client identity EDGE uses to call PAT.** The catalog pull must carry
  `pat.command.read` via a service-client credential (never a patient-session token). How
  that service-client is issued/held (static client credential, or an internal
  resource-server client per ACS introspect model) is a specs-level detail.
- **G3 — Reactivate semantics for a `deactivated` device.** Doc 03 allows
  `deactivated → paired`; whether that reuses the old credential or re-issues one needs a
  decision (default: re-issue, consistent with least-surprise around revocation).
- **G4 — Coexistence of two credentials on one device.** ADR-012/014 require the
  `edge.device` token and the patient-session token to live side by side in the same app;
  EDGE owns only the first. The hand-off boundary with ACS's session provisioning (which
  references `deviceId`) must be walked through in specs.
- **G5 — EVNT reporting contract.** The edge station reports a recognized gesture using the
  `edge.device` token; the endpoint and payload belong to EVNT (not yet architected). EDGE
  must expose the device identity EVNT will trust, but the report contract is EVNT's.
- **G6 — EVNT detection-lapse escalation contract (ADR-005, SAFETY-GEST-1).** On a detection
  lapse the EDGE backend raises/resolves to EVNT with an ACS-issued service-client token, a
  per-episode idempotency key and a fixed payload (`integration-contracts.md` §6.2). The EVNT
  **endpoint path** and **authority string** are EVNT-owned and not yet specified — an **INT
  TODO[architect]** to confirm when EVNT's specs are amended next (this round does not edit
  EVNT). EDGE's side is fixed; the escalation ladder (push → SMS → voice) is EVNT's (EVNT
  ADR-005).

## Suposições a Validar

- **A1** — Pilot runs on **Android/Chromium** (ADR-014); iOS is out of scope. A single
  pilot patient/tenant; volumes are tiny.
- **A2** — The project's centralized **MIG/Flyway** owns EDGE's migrations across all
  schemas (consistent with ACS/PAT).
- **A3** — A **scheduled in-process watchdog** is acceptable at pilot scale (no broker, no
  external scheduler); the heartbeat interval and offline threshold are configurable.
- **A4** — PAT's catalog-pull ETag/304 contract (api-contract §3.3.1) is stable and EDGE is
  an accepted `pat.command.read` **service client** (PAT authority matrix lists GEST/EDGE).
- **A5** — ACS JWKS is reachable for EDGE to validate caregiver/coordinator tokens; HIST
  audit is best-effort within the request (no broker).

## Dependências Críticas

- **ACS** — JWKS trust anchor for human endpoints; validator (not minter) of `edge.device`
  tokens; references `EdgeDevice` by `deviceId` when provisioning a patient session.
- **PAT** — upstream source of the command catalog EDGE caches and serves (ETag/304);
  references `EdgeDevice` by id only.
- **HIST** — audit sink for device lifecycle actions.
- **MIG** — owns Flyway migrations for EDGE's per-tenant and global tables.
- **GWY** — fronts EDGE and propagates `X-Correlation-Id`.
- **GEST / EVNT** — downstream consumers of the device identity EDGE establishes (detection
  station reuse per ADR-014; gesture reporting via EVNT); EDGE provides identity + liveness,
  not detection or events. Since ADR-005, **EVNT is also an outbound dependency** on a
  safety-critical path: EDGE raises/resolves detection lapses to EVNT (G6), which owns the
  alerting/escalation ladder (EVNT ADR-005).
