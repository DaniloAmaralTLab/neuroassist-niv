# 06 — Risks, Gaps, Assumptions — edge (EDGE)

## 1. Risks

| # | Risk | Area | Mitigation |
|---|---|---|---|
| R1 | `edge-service` BE is **not yet architected** (only `acs-service` and `pat-service` exist). The FE wire shape (`EdgeDeviceWire`, pairing/claim endpoints) may shift. | BE contract | Keep every adapter behind the `toEdgeDevice` mapper over `EdgeDeviceWire`; treat the claim/pairing endpoints as provisional until `edge-service` specs land; the FE spec cross-links the BE contract once it exists. |
| R2 | Screen 07 mixes **device pairing (EDGE)** and **patient-session provisioning (ACS)** on one screen. Promoting one module could absorb the other's concern. | Ownership seam | Hard boundary (ADR-005 / doc 02 §3): EDGE owns only the device-pairing panel + status; ACS owns the PatientSession list + provision/revoke (ADR-012/SEC-001). The seam is a SPEC decision — which module renders which portion and how shared step state flows. |
| R3 | A false **"online"** could make a caregiver trust a dead detector. The prototype reads a facade value; if `edge-service` is unreachable the FE must not default to "online". | UX / safety | Liveness is **server-derived** only (ADR-005); an unreachable service renders "status unavailable", never "online". Offline is amber, never an alarm. |
| R4 | The **onboarding wizard** is shell-orchestrated and spans ACS (tenant, invite), PAT (patient, first command) and EDGE (device pairing, step 3). The wizard chrome ownership is undecided. | Ownership seam | EDGE assumes it contributes the device-pairing panel, not the wizard chrome; the step-state sharing contract is a SPEC decision (mirrors PAT doc 06 and ACS). |
| R5 | `provideEdge` default regressing to the **wrong** adapter: shipping `mock` after `edge-service` lands, or `http` before it exists (Learning `scaffold:mock-adapter-default`, 7 occurrences). | Scaffold / promote | Default is `mock` **now** (BE absent); flip to `http` the moment `edge-service` specs land; a providers spec proves the intended default. |
| R6 | A **permissive guard stub** (`canViewDeviceGuard`/`canPairDeviceGuard` returning `true`) would expose device management without an access check (Learning `guard:stub-permissive`, 6 occurrences). | Scaffold / promote | Every guard consumes `AccessDecisionService.can('edge.device.*')`; a guard spec proves no hardcoded `true`; never inspect `user.role` inline. |
| R7 | Confusing the `edge.device` **identity token** (agent, for GEST) with a caregiver `edge.*` **authority** could leak management access to a device token. | Security / authz | Keep the two strictly separate (ADR-014): dashboard guards read only `edge.*` authorities; the device token is never a menu/guard key; patient-session tokens carry no `edge.*` authority (ACS INV-3). |
| R8 | Downstream promote emits Playwright stubs with vacuous assertions under `test.skip`. | Test integrity | Carry-forward: stubs must use `test.fixme()` or `throw new Error('TODO[<ISSUE>]')`, never `await expect(page).toHaveURL(/.*/)` under skip. |

## 2. Known gaps

- `edge-service` BE specs (device registry, pairing/claim flow, heartbeat/status projection) are **not
  yet written** — the FE contract is provisional (R1). EDGE cannot be promoted to `http` until they
  land.
- The **pairing/claim mechanism** is referenced in BA material ("claim → heartbeat, already
  implemented" in the real `gest/frontend`) but its SaaS contract (claim code vs. provisioning token,
  reuse of the GEST station flow per ADR-014) is unspecified for `edge-service`. EDGE FE assumes a
  simple `initiate → poll/confirm → paired` claim.
- The **Screen 07 seam** (device-pairing portion vs. PatientSession portion) and the **onboarding
  wizard chrome** ownership need a SPEC decision (R2, R4).
- Whether **heartbeat** is surfaced via periodic read, a push channel, or a BFF aggregation
  (`DashboardBFF`, BA §6.12 `DeviceHeartbeatMonitor`) is undecided; EDGE FE assumes a server read-model
  pulled on navigation (ADR-005), cadence deferred to SPEC.
- No shared `@neuroassist/shared/*` Access Layer or Shell `neuroassist-niv-web` exists in code yet (same
  precondition ACS/PAT declared): EDGE cannot be promoted until they land.
- The **"Patient Mode"** topbar indicator (wireframe §3.2.B, Amendment 3) couples device state with the
  ACS `PatientSession` — an open decision (ADR-012 §3.2.B): same shell with a conditional indicator vs.
  a separate restricted shell. EDGE FE owns only the device-connectivity portion of that badge.

## 3. Assumptions to validate

- Pilot data volume is tiny (1 tenant, 1 patient, 1 device) → no pagination, no cache in v1.
- `status` stays a closed 2-value set (`online | offline`) for the MVP; "unavailable" is a FE render
  state, not a BE enum value.
- A patient has at most one active `EdgeDevice` per kind (station / phone).
- The device-pairing screens are operated on the caregiver/technical-lead's desktop/laptop browser; the
  *patient phone* being paired is Android/Chromium (PLAT-001 / ADR-014).
- The patient phone reuses the same device-identity model as the fixed station (ADR-014) — one pairing
  mechanism for both.
- English-only copy is acceptable for all EDGE users in the pilot (ADR-018).

## 4. Critical dependencies

- **BE:** `edge-service` endpoints for the device registry, the pairing/claim flow and the
  heartbeat/status projection — **not yet architected** (R1).
- **ACS:** the tenant-scoped JWT and the `caregiver` / `clinic_coordinator` roles; tenant derived from
  the `tenantId` claim (ACS api-contract §0); `edge.*` authorities absent from patient-session tokens
  (INV-3); the `PatientSession` lifecycle EDGE sits beside on Screen 07 (ADR-012/SEC-001).
- **PAT:** the `Command` catalog the edge agent pulls; EDGE references `Patient`/`Command` by id only.
- **Shared libs:** `@neuroassist/shared/{auth-session, tenant-context, access-decision,
  access-http-base, contracts, ui-components, ui-feedback, ui-tokens, observability, error-model}`.
- **Shell:** `neuroassist-niv-web` must register `@neuroassist/edge` (shared ADR-006) and host the
  `DeviceStatusBadge` in the topbar (always-visible connectivity, §3.2.B).
- **Design system:** `theme.css` oklch tokens vendored into the app (`design-system-tokens.md`); a
  reserved badge slot to avoid CLS on status change.
- **Downstream consumers:** GEST (runs on the paired device; shares the `edge.device` identity model),
  EVNT (routes alarms for events the device generates), Home/DASH (renders the device-status read-model),
  HIST (audits pair/unpair).
