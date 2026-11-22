# SPEC-01 — Route Map — conv (CONV) Frontend

> The route surface `@neuroassist/conv` exposes. CONV is the patient's communication **runtime** in
> Patient Mode: a single operational route (`/patient/converse`) lazy-loaded by the Patient-Mode host.
> Sources: `frontend/04-frontend-architecture-direction.md` §5, `frontend/05-state-and-data-flow.md` §6,
> `adr/ADR-005-offline-first-cached-speech-tree.md`, `adr/ADR-007-input-channel-agnostic-navigation-seam.md`,
> BE `contracts/api-contract.md` §2 (`GET /conv/tree`) and §10 (authority matrix). Code fences are
> illustration — no Angular code is generated at this stage.

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/patient/converse` | `SpeechTreeNavigatorComponent` | `libs/conv/feature-converse` | `patientSessionGuard` | "Talk" | `[Talk]` (root of the patient surface) |

- `/patient/converse` is the **only** route CONV registers. It is the patient's near-single-screen daily
  surface (wireframe Screen 06); the daily loop (navigate → select → speak) runs **entirely client-side over
  the cached bundle** with **zero network calls** (BE INV-CONV-5; FE doc 03 §5).
- The Patient-Mode host mounts CONV at the `patient` base via
  `loadChildren: () => import('@neuroassist/conv').then(r => r.CONV_ROUTES)` and applies
  `canActivate: [patientSessionGuard]`.

## 2. Outbound links (other modules' surfaces — not CONV routes)

| Trigger | Destination | Owner | Authority on the destination |
|---|---|---|---|
| "N phrase(s) to confirm" banner (shown when `pendingConfirmation() > 0`) | `/patient/confirm-training` | **TRN** | TRN patient-confirmation authority (TRN-owned) |

CONV **renders the banner and the count only**; it owns no `/patient/confirm-training` route and never
authors or mutates tree content (doc 02 golden path C; doc 03 §5). The destination surface is TRN's.

## 3. `CONV_ROUTES` shape (illustration)

```ts
export const CONV_ROUTES: Routes = [
  {
    path: 'converse',
    canActivate: [patientSessionGuard],       // real patient-session; never a hardcoded true
    loadComponent: () =>
      import('./feature-converse/speech-tree-navigator.component')
        .then(m => m.SpeechTreeNavigatorComponent),
    title: 'Talk',
    data: { breadcrumb: 'Talk' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'converse' },
];
```

Host wiring: the Patient-Mode shell lazy-loads `CONV_ROUTES` under the `patient` branch
(`{ path: 'patient', loadChildren: () => import('@neuroassist/conv').then(m => m.CONV_ROUTES) }`) and
co-mounts it beside GEST + libs/edge in **one host** (the G1 gap, §5).

## 4. Guards

- **`patientSessionGuard`** (`libs/conv/access`) — authorises `/patient/converse` by the **patient-session
  identity** (the ACS-minted, non-expiring, revocable session carrying `conv.*`/`gest.*`, ACS INV-3), read
  from `@neuroassist/shared/auth-session`. It is the CONV mirror of GEST's `stationIdentityGuard`
  (`libs/gest/access/station-identity.guard.ts`): it consults the **real session**, and on an absent /
  revoked (401-blacklisted) session routes to the station "session ended" surface and **never** renders the
  speaking runtime.
  - **Carry-forward `guard:stub-permissive` (Learning D-611, 6 occurrences):** the guard **never** hardcodes
    `return true`. Its fine-grained `conv.*` authority refinement rides on
    `@neuroassist/shared/access-decision`, which today is a **Wave-0 stub** (interface only —
    `can(permission): boolean`). Until the **PLATFORM / frontend `routeGuards`** ledger item fleshes it out,
    `patientSessionGuard` decides from session **presence/validity** only and the per-authority gate is
    deferred to that platform work. CONV does **not** invent a working `access-decision` here.

## 5. The Patient-Mode host is undecided (gap G1, shared with GEST)

The host app that mounts CONV at `/patient` is **not yet decided or scaffolded** (doc 06 G1, shared with
GEST `INT-FE-GEST-003`). CONV ships as a **library facade** (`CONV_MODULE_DESCRIPTOR` + `CONV_ROUTES` +
`provideConv()`, SPEC-05/SPEC-06) with a **no-op `NAVIGATION_INTENT_PORT` default** so touch and switch-scan
work without a host; the host — once chosen — overrides the port with the GEST-fed implementation and wires
the patient-session interceptor on CONV egress. The host choice is an **open item** (§ SPEC-06 §4, cross-link
§4); this route map assumes only the `patient` base and invents no host route.

## Acceptance criteria (EARS)

- WHEN a station presenting a valid patient-session with `conv.tree.read` navigates to `/patient/converse`, THE SYSTEM SHALL render the speech-tree navigator.
- IF the `patientSessionGuard` finds no active patient-session on `/patient/converse`, THEN THE SYSTEM SHALL redirect to the session-ended surface and SHALL NOT render the speech-tree navigator.
- THE SYSTEM SHALL evaluate the `patientSessionGuard` from the real patient-session and SHALL NOT return a hardcoded true from the guard.
- THE SYSTEM SHALL register no `/patient/confirm-training` route and SHALL render only a link-out banner to the TRN patient-confirmation surface.
- THE SYSTEM SHALL register exactly one CONV route (`/patient/converse`) and SHALL NOT expose any publish, retire or erase route.
