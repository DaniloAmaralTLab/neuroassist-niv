# SPEC-06 — Shell Integration — hist (HIST) Frontend

> How `@neuroassist/hist` plugs into the `neuroassist-niv-web` shell: fallback descriptor, the
> integration service, bootstrap, and the HIST↔DASH embedding boundary. Sources:
> `frontend/04-frontend-architecture-direction.md` §2/§5, `frontend/05-state-and-data-flow.md` §6, shared
> ADR-006 (module-entry-as-library), EVNT SPEC-06 (sibling pattern). Code is **illustration**.

## 1. `tool-descriptors.ts` (Shell fallback)

The shell carries a static fallback descriptor so the History destination is discoverable before the lazy
chunk resolves (mirrors the permission map, SPEC-05 §1):

```ts
{ key: 'hist', title: 'History', icon: 'history', section: 'care', order: 40,
  route: '/history', requires: 'hist.history.read' }
```

The live `MODULE_MENU_METADATA` (SPEC-05 §1) supersedes the fallback once `@neuroassist/hist` loads.

## 2. `HistShellIntegrationService` (`frontend/libs/hist/integration/`)

- Supplies the active **patient context** (`patientId`) the `/history` read needs (SPEC-01 §3): the shell
  owns patient selection (ACS/DASH); HIST reads the patient it is given and never owns a picker.
- Exposes the read-only `HistoryFacade` slice (an `.asReadonly()` signal of the current window + summary)
  that the **DASH/Home host** injects to render an **embeddable read-only history widget** (§4).
- Owns **no** timers and **no** HttpClient — HIST does not poll (doc 05 §2); the service is a thin wiring
  seam, not a data source.

## 3. Delegated feedback wiring (HIST → EVNT, via the shell)

- `HistoryTimelineComponent` emits `markFeedback` upward (SPEC-02 §4). The shell wires that output to
  **EVNT's** public feedback port (`EVNT POST /evnt/events/{eventId}/feedback`, authority
  `evnt.event.record`, SPEC-04 §4) — HIST holds **no** EVNT dependency and **no** write path.
- On EVNT success the shell signals HIST to `HistoryFacade.refresh()`; on failure EVNT's own error path
  surfaces it (SPEC-07 §2.3) and HIST does not re-read. This keeps the write owner (EVNT) and the read
  owner (HIST) decoupled through the shell, exactly as ADR-005 requires.

## 4. HIST ↔ DASH embedding boundary (interim framing, decision 2026-11-20)

> **Decision (orchestrator default, revisable — resolves doc 06 Q1/R3 interim).** HIST **owns** the
> per-patient immutable timeline and the `/history` route. **DASH may embed** a read-only history widget by
> consuming a HIST-exported component/facade slice through `HistShellIntegrationService` — DASH never
> re-implements the timeline and never queries `hist-service` itself; it hosts HIST's read. Cross-patient
> aggregation / KPIs stay DASH-owned (DASH never pushes aggregation into HIST). Recorded in
> `../contracts/backend-api-cross-link.md` §2; to be confirmed with the DASH vision + BE at M1.5.

- HIST exports a standalone `HistoryWidgetComponent` (a slim projection of `feature-history` for a
  dashboard slot) so DASH embeds **the same read** rather than a duplicate. The widget is still gated by
  `hist.history.read` and still reads via `HistoryFacade` — embedding changes the host, not the ownership.

## 5. `hist.bootstrap.ts` — init / destroy

- **init:** register `MODULE_MENU_METADATA`, `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`; provide
  `HISTORY_PORT` via `provideHist({ adapter: 'http' })` (default http, SPEC-04 §2); connect the shell
  patient-context into `HistShellIntegrationService`. **No** timer is started (HIST does not poll).
- **destroy:** release the `HistoryFacade` window signal and the integration subscription; there is no
  poll loop or service worker to tear down (contrast EVNT SPEC-06 §5). HIST holds no origin-wide resource.

## Acceptance criteria (EARS)

- WHEN `@neuroassist/hist` finishes loading, THE SYSTEM SHALL replace the shell fallback descriptor with the live History menu metadata and SHALL NOT show a duplicate History destination.
- THE SYSTEM SHALL read the active patient context from the shell for the `/history` read and SHALL NOT own a patient picker inside HIST.
- WHEN a caregiver triggers the delegated feedback affordance, THE SYSTEM SHALL route the write to EVNT's feedback port through the shell and SHALL NOT hold an EVNT dependency or a write path inside `@neuroassist/hist`.
- WHERE DASH embeds the read-only history widget, THE SYSTEM SHALL feed it from the HIST `HistoryFacade` slice under `hist.history.read` and SHALL NOT let DASH query `hist-service` directly or re-implement the timeline.
- WHEN the HIST module initializes, THE SYSTEM SHALL provide `HISTORY_PORT` with the http adapter and SHALL NOT start any polling timer.
