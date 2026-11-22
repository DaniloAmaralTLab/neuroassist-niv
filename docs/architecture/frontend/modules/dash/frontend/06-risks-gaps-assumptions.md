# 06 — Risks, Gaps, Assumptions — dash (DASH)

> Scope: what could go wrong, what is unresolved, and what we are assuming. No Angular code at this stage.

## 1. Risks

- **R1 — False reassurance (SAFETY, highest).** A caregiver reads "X is OK" when the system cannot actually tell.
  The prototype already carries this bug (`events.every(confirmed)` is `true` for an empty array). *Mitigation:*
  INV-1 fail-safe derivation (doc 03 §5, ADR-005); unit tests prove every non-`ok` source path yields
  degraded/unknown; headline `all_clear` has exactly one reachable branch.
- **R2 — Emergency miscommunication (SAFETY).** DASH styling a non-emergency surface as emergency (false alarm), or
  suppressing/outranking EVNT's takeover (missed alarm). *Mitigation:* INV-3; DASH applies emergency styling to
  nothing and never renders the takeover; e2e asserts EVNT takeover is unobstructed.
- **R3 — Composition drift / coupling to four modules.** DASH depends on HIST/EVNT/EDGE/PAT public APIs; a change
  to any `index.ts` can break DASH. *Mitigation:* consume only published seams (Nx boundary tag, doc 04 §3);
  integration tests against each composed facade's public contract; version the embedding points in specs.
- **R4 — Unknown `dash-service` shape (contract instability).** If BE later adds a `dash-service` aggregation, a
  late-arriving contract could churn DASH. *Mitigation:* invent no endpoint now; isolate any future read behind a
  `DASH_*_PORT`; keep DASH composition-only until M1.5 confirms (doc 05 §2).
- **R5 — Bundle size / TTI on the pilot machine.** DASH is home and pulls widgets from four modules; eager imports
  could bloat the home chunk. *Mitigation:* lazy entry; import composed **components** at the feature level;
  measure TTI < 2.5 s and CLS < 0.1.
- **R6 — Reactive over-recompute.** Many upstream signals feeding one composite `computed` could thrash change
  detection. *Mitigation:* OnPush + narrow `computed` inputs; derive source-health once per source.

## 2. Known gaps

- **G1 — Cross-tenant analytics / trends / exports** are out of the caregiver MVP; the registry name "Dashboard and
  Notifications" could later imply them. Deferred; not promised here.
- **G2 — Push/notification settings surface.** The registry title says "Notifications"; the notification *channels*
  (Web Push → SMS → voice) and their settings are EVNT's (`PushChannelFacade`). Whether DASH hosts a settings entry
  point or EVNT owns a dedicated screen is unresolved (Q2).
- **G3 — Multi-patient overview for `clinic_coordinator`.** The prototype assumes a single patient
  (`patientsFacade.items()[0]`). A coordinator with several patients needs a selection/aggregate model — not
  designed in the caregiver MVP (assumption A1).
- **G4 — Advisory heuristic catalogue.** Only one prototype heuristic exists ("Water triggered repeatedly →
  review sensitivity"). The full advisory set, and where the Confirm/Ignore decision is persisted, is undefined.

## 3. Assumptions to validate

- **A1 — One active patient at a time**, supplied by the shell/ACS context; DASH renders a single-patient overview
  (prototype parity). Validate for the clinic-coordinator persona (G3).
- **A2 — The composed modules expose everything DASH needs for the headline** via their current public APIs
  (HIST summary + recent entries, EVNT alarm/notice/detection-lapse, EDGE connectivity, PAT catalog). Validate each
  seam during specs; if a gap appears, it is a request to the owning module, not a new DASH query.
- **A3 — "Last check" time** is derivable from HIST's summary and/or EVNT's monitoring state without a dedicated
  DASH read. Validate at specs.
- **A4 — Overview data volumes are small** (one patient, a handful of commands, the day's events) — no
  virtualization needed for the home surface.
- **A5 — Target device** is the pilot caregiver's desktop/laptop browser (webcam-class machine); dark theme default.

## 4. Critical dependencies

- **BE (`dash-service`) existence & contract — PENDING, M1.5.** The single most load-bearing open item: is DASH a
  pure FE composition host, or does it read a `dash-service` BFF? Until confirmed, DASH composes module facades and
  invents no endpoint. All prospective `dash.*` authorities/endpoints are placeholders.
- **Composed module public APIs** — HIST (`HistShellIntegrationService`, `HistoryWidgetComponent`), EVNT
  (`AlarmFacade`, `RoutineNoticeIndicatorComponent`/`RoutineNoticeListComponent`, `PushChannelFacade`), EDGE
  (`DeviceFacade`, `DeviceStatusBadgeComponent`/`EdgeDeviceCardComponent`), PAT (`PatientFacade`, `CommandFacade`).
- **Shared libs** — `access-http-base`, `access-decision`, `error-model`, `ui-feedback`, `ui-tokens`,
  `observability`.
- **Prototype source** — `screens/home` + `.build-plans/home.plan.md` (promoted, re-wired to composed seams).

## 5. Open questions (for specs / M1.5)

- **Q1 — Who owns the `entry` screen?** `screens/entry` (`/entry`) is a static, pre-shell brand/login moment with
  **no operational data** and a single CTA into `/home`. **Recommendation: the app shell / ACS** (authentication &
  app boundary), **not DASH** — DASH is a shell-hosted operational surface, while `entry` is the unauthenticated
  threshold. DASH does not promote it; confirm the shell/ACS owner at specs. (Recorded in ADR-005 references.)
- **Q2 — Notification settings home.** Does DASH host an entry point to EVNT's push-channel settings, or does EVNT
  own a standalone settings screen? (G2.)
- **Q3 — `dash-service` or not?** Resolve with the BE vision at M1.5 (R4 / §4).
- **Q4 — Clinic-coordinator multi-patient overview** — in scope later? Shapes A1/G3.
- **Q5 — Advisory persistence & catalogue** — where are Confirm/Ignore decisions logged, and what heuristics ship
  in v1? (G4.)
