# SPEC-05 — Module Contract — dash (DASH) Frontend

> Content of `libs/dash/src/lib/dash.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. DASH owns **no authority of its own** (BE ADR-001:
> no `/dash/**`, no `dash.*`); its permission map is the **union of the composed modules' authorities it
> actually uses**, each equal to the owning module's BE authority constant (D-639). Code fences are
> illustration, not EARS contracts.

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'dash';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'dash',
  title: 'Home',
  icon: 'dashboard',               // Material Symbols (self-hosted @font-face)
  section: 'care',
  order: 0,                        // the first, default destination after sign-in (SPEC-01 §1)
  entries: [
    { label: 'Home', route: '/home', requires: null },  // the home shell itself is not authority-gated;
                                                         // each embedded panel self-gates (§2)
  ],
};
```

`/home` is the default landing surface, so the entry itself is not hidden by a single authority; instead
**each embedded panel is shown or hidden by its owning module's authority** (§2/§4). This keeps a caregiver
who can read *some* sources from being locked out of the whole home screen.

## 2. `MODULE_PERMISSION_MAP` — union of composed authorities (NO `dash.*`)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'hist.history.read': { label: 'Read patient history', justification: 'Gate the day-KPI row and the recent-events preview, both read via HIST HistShellIntegrationService — CAREGIVER + CLINIC_COORDINATOR (HIST SPEC-05 / BE hist api-contract §2).' },
  'evnt.event.read':   { label: 'Read events and alarms', justification: 'Gate the alarm/monitoring status, routine-notice panel and the open-detection-lapse notice, read via EVNT AlarmFacade / RoutineNotice components (EVNT guards can-read-event).' },
  'evnt.detection-lapse.read': { label: 'Read detection lapses', justification: 'Gate the "online but not detecting" notice (EVNT LapseAlertFacade, SAFETY-GEST-1); missing => source unknown, never all clear.' },
  'edge.device.read':  { label: 'Read device status', justification: 'Gate the device-health panel, read via EDGE DeviceFacade / EdgeDeviceCardComponent (EDGE can-read-device guard).' },
  'pat.command.read':  { label: 'Read command catalog', justification: 'Gate the command-catalog summary read via PAT CommandFacade (PAT can-manage-catalog guard read key).' },
};
```

> **DASH introduces no authority.** There is deliberately **no** `dash.overview.read` or any `dash.*` key:
> BE ADR-001 establishes DASH has no backend and no authority namespace. The four keys above are **copied
> verbatim** from the owning modules (reads are `.read`, never `.view`). Were a `dash-service` ever
> confirmed (ADR-001 revisit), its authorities would equal the BE authorities once published — still never
> invented ahead of the BE.
>
> **Patient identity** (panel 9) is **not** gated by a DASH authority: the active patient is a shell/ACS
> context value (INV-6), already link- and tenant-scoped server-side; DASH does not add a `pat.patient.read`
> key it does not own.

Every gate goes through `AccessDecisionService.can(<authority>)`; guards and `@if` surface conditions
consume its output and MUST NOT hardcode `return true` (carry-forward `guard:stub-permissive`).

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'dash.suggestion.enabled': { defaultState: true,  justification: 'Inline advisory card (deterministic heuristic over HIST entries DASH already reads). Off → the advisory card never renders; the overview is unaffected (INV-5).' },
  'dash.bff.enabled':        { defaultState: false, justification: 'OFF until a dash-service is confirmed by BE (ADR-001). While off, DASH stays composition-only and binds no DASH_OVERVIEW_PORT — carry-forward scaffold:mock-adapter-default.' },
};
```

`provideDash({ suggestion })` wires the advisory flag; it wires **no data port** while `dash.bff.enabled`
is off, and instead asserts the composed modules' providers are present.

## 4. RBAC-of-UI rule (per-panel self-gating)

- Panels are hidden/disabled by **authority**, not by role inspection: the KPI row + recent-events preview
  require `hist.history.read`; the device-health panel requires `edge.device.read`; the alarm-status and
  routine-notice panels require `evnt.event.read`; the command-catalog summary requires `pat.command.read`.
- A caregiver missing one authority sees that panel hidden while the rest of the home overview still
  renders (partial authority ≠ blank screen) — and a **hidden** panel is treated as a non-`ok` source by
  the composite status (it cannot contribute to `all_clear`).
- The inline advisory is additionally gated by the `dash.suggestion.enabled` flag.

## Acceptance criteria (EARS)

- WHILE the session lacks `hist.history.read`, THE SYSTEM SHALL hide the day-KPI row and the recent-events preview panels.
- WHILE the session lacks `edge.device.read`, THE SYSTEM SHALL hide the device-health panel.
- WHILE the session lacks `evnt.event.read`, THE SYSTEM SHALL hide the alarm-status and routine-notice panels.
- WHILE the session lacks `evnt.detection-lapse.read`, THE SYSTEM SHALL show the not-detecting source as unknown and SHALL NOT report the overview as all clear.
- WHILE the session lacks `pat.command.read`, THE SYSTEM SHALL hide the command-catalog summary panel.
- THE SYSTEM SHALL build the DASH permission map from the composed modules' authorities only and SHALL NOT introduce any `dash` authority.
- THE SYSTEM SHALL evaluate every DASH surface gate through the `AccessDecisionService` can-check and SHALL NOT return a hardcoded true from a guard.
- WHILE the `dash.suggestion.enabled` flag is off, THE SYSTEM SHALL hide the inline advisory card.
