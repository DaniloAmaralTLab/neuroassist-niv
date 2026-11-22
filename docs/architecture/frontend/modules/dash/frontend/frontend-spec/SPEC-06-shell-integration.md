# SPEC-06 — Shell Integration — dash (DASH) Frontend

> How DASH plugs into the `neuroassist-niv-web` shell: the home route, the active-patient push, the entry
> promotion, and bootstrap. DASH owns no `HttpClient` and no timer (doc 05 §2). Code fences are illustration.

## 1. `tool-descriptors.ts` (Shell fallback)

```ts
export const DASH_DESCRIPTOR: ToolDescriptor = {
  key: 'dash',
  title: 'Home',
  icon: 'dashboard',
  section: 'care',
  order: 0,
  routePath: '/home',
  loadChildren: () => import('@neuroassist/dash').then(m => m.DASH_ROUTES),
};
```

The shell lazy-loads `@neuroassist/dash` as the **home branch** and makes `/home` the default landing after
a successful ACS sign-in (SPEC-01 §1/§3).

## 2. `DashShellIntegrationService` (`libs/dash/integration/`)

Responsibilities:

1. **Push the active patient** to each composed module's seam — DASH owns no patient-picker (INV-6):
   `HistShellIntegrationService.setActivePatient(id)`, `DeviceFacade.loadForPatient(id)`,
   `CommandFacade` load, and `AlarmFacade.startMonitoring([id])`. The patient id comes from the shell's
   authenticated-caregiver context (ACS link).
2. **Expose the composed read-only slices** to `DashboardFacade` (which derives `OverviewVM` / `KpiVM` /
   health) — it queries no module HTTP directly.
3. **Relay a caregiver refresh** to each composed facade, then let `DashboardFacade` re-derive.

```ts
@Injectable({ providedIn: 'root' })
export class DashShellIntegrationService {
  setActivePatient(patientId: string): void { /* fan-out to HIST/EDGE/PAT/EVNT seams */ }
  refresh(): void { /* ask each composed facade to re-read */ }
}
```

## 3. `dash.bootstrap.ts`

- **init:** register `DASH_DESCRIPTOR`; on patient-context ready, call
  `DashShellIntegrationService.setActivePatient(id)`; do **not** start any DASH timer (EVNT owns the only
  poll loop).
- **destroy:** unsubscribe the composed signals; clear only DASH's UI-local state (source-health flags,
  advisory-dismissed). It mutates **no** composed-module state.

## 4. The `entry` screen promotion (owner = SHELL)

`screens/entry` is promoted by the DASH **promote** phase as a **shell route**, not a DASH route
(SPEC-01 §5, `adr/ADR-005` §5):

- It is a **static brand/login moment** (logo, tagline, one call-to-action) with **no operational data**.
- Its prototype call-to-action routes straight to `/home`; in production that call-to-action drives the
  **ACS login flow**, which lands on `/home` on success.
- Ownership (SHELL, orchestrator default, revisable) is recorded in
  `../contracts/backend-api-cross-link.md` §4. DASH never registers `entry` in `DASH_ROUTES`.

## Acceptance criteria (EARS)

- WHEN the shell resolves the authenticated caregiver's linked patient, THE SYSTEM SHALL push that patient id to each composed module's integration seam and SHALL NOT choose the patient inside DASH.
- THE SYSTEM SHALL promote the `entry` screen as a shell route owned by the shell and SHALL route its sign-in call-to-action into the ACS login flow.
