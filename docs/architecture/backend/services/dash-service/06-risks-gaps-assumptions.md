<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposicoes a Validar
- Dependencias Criticas
-->

# 06 — Risks, Gaps and Assumptions

> Module **DASH** · NeuroAssist NIV · no backend (ADR-001). Risks here are about composition,
> safety and upstream consistency, not about a service DASH runs.

## Riscos

- **R1 — False "all clear" (SAFETY-DASH-1, highest).** A naive home overview could render green while
  a source (EVNT alarm, EDGE detection state, HIST) silently failed or returned stale data — telling
  a caregiver the patient is fine when the system simply could not check. *Mitigation:* INV-DASH-2 /
  ADR-002 — the "okay status" is OKAY only when every source was read and fresh; any failure/staleness
  forces a visible "cannot confirm". This is a frontend-composition invariant and must be enforced by
  the FE specs and tested there.
- **R2 — Client fan-out latency/partial failure.** Four parallel reads per render means the slowest
  (or a single 5xx) shapes the experience. *Mitigation:* independent per-tile loading/error states;
  the headline degrades to UNKNOWN rather than blocking the whole screen. If clinic-scale fan-out
  later hurts, revisit option B (server aggregation) — recorded as revisable in ADR-001.
- **R3 — Upstream contract drift.** DASH binds to PAT/EDGE/EVNT/HIST response shapes; a breaking
  change upstream breaks the home screen with no backend to absorb it. *Mitigation:* typed clients
  generated from the published contracts; contract tests in the FE layer; DASH adds no field not in a
  published contract.
- **R4 — Polling cadence coupling.** If DASH hard-codes a poll interval instead of honoring EVNT's
  `pollIntervalSeconds`, it can over-poll (load) or under-poll (stale alarm). *Mitigation:* adopt the
  server-advertised cadence (EVNT ADR-003); treat `serverTime` for skew detection.

## Gaps Conhecidos

- **G1 — PAT contract lists "service client (DASH)".** `pat-service/contracts/api-contract.md` §5
  names a "service client (DASH/CONV)" actor on `GET /pat/patients`. Under ADR-001 DASH is **not** a
  service-client: the caregiver dashboard reads PAT with the caregiver JWT (which holds
  `pat.patient.read`). This upstream wording should be reconciled (caregiver-dashboard-via-JWT, not a
  DASH backend principal). Flagged as an upstream doc amendment, not changed by this phase.
- **G2 — Home "okay status" is a derived concept with no single owner.** Its inputs span EVNT
  (active-alarm, lapses), EDGE (detecting/offline). The exact rule (which inputs, which freshness
  window) must be pinned in the FE vision/specs; this backend vision states the fail-safe principle
  only (ADR-002).
- **G3 — Registry still says `backendService: dash-service`.** The project-context registry entry for
  DASH carries `backendService: "dash-service"`. ADR-001's consequence is to set it to `null`; until
  that edit lands, downstream tools (scaffold, GWY route gen, REG) may assume a service exists.
- **G4 — Freshness window undefined.** "Stale" in INV-DASH-2 needs a concrete threshold per source
  (e.g. last successful poll age). To be fixed in FE specs.

## Suposicoes a Validar

- **A1 — The caregiver role already holds every read authority DASH needs** (`pat.patient.read`,
  `edge.device.read`, `evnt.event.read`, `evnt.detection-lapse.read`, `hist.history.read`). The four
  authority matrices list CAREGIVER for each; confirm against SPEC-06 `RoleAuthorityPolicy`.
- **A2 — GWY routes `/pat`, `/edge`, `/evnt`, `/hist` to the caregiver and needs no `/dash` route.**
  Confirm GWY route config adds nothing for DASH.
- **A3 — No caregiver-level preference data is required for MVP.** Confirmed against `home.plan.md`
  (writes: none) and `entry.plan.md` (static); re-validate if BA adds quiet-hours/layout later — and
  if so, prefer ACS (caregiver-scoped) over a new DASH service.
- **A4 — `messaging.enabled = false` holds for the whole project**, so DASH's reads are all synchronous
  and no event subscription is expected of it.

## Dependencias Criticas

- **EVNT** — the only source of the active-alarm and detection-lapse signals; its availability and its
  `pollIntervalSeconds` contract are load-bearing for the safety headline.
- **EDGE** — the `detectionState`/`connectivity`/`lastDetectingAt` read model that lets the home show
  "not detecting" distinctly from "offline".
- **HIST** — the day summary + timeline link.
- **PAT** — patient identity/label.
- **ACS / GWY** — the caregiver JWT and the single ingress every read passes through.

A failure in any of EVNT/EDGE/HIST/PAT must degrade *only its own* region of the home screen and must
force the overall status to UNKNOWN — never OKAY (R1, ADR-002).
