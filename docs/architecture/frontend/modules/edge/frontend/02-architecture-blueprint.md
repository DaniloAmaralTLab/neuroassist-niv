# 02 — Architecture Blueprint — edge (EDGE) Frontend

## 1. System boundary

The EDGE frontend is a **client of `edge-service`** through the API gateway, consumed exclusively via
`@neuroassist/shared/access-http-base`. It never calls a legacy system, never talks directly to another
module's service, and never processes patient video — no frame ever reaches the dashboard (the cloud
receives only structured events: heartbeat, calibration, `HELP_REQUESTED`). Authentication and the
tenant-scoped JWT are delegated to ACS via `@neuroassist/shared/auth-session`; EDGE consumes the
resulting session, it does not implement auth. **`edge-service` is planned but not yet architected** —
the FE wire shapes are provisional and every adapter sits behind a `toX` mapper (doc 06, R4).

## 2. External actors and systems

- **Authenticated browser** — caregiver / technical lead signed in via the shared auth session; the
  active tenant is the JWT `tenantId` claim (ACS api-contract §0; `X-Tenant-Id` is never trusted
  server-side).
- **`edge-service` (BE, planned)** — reached through `@neuroassist/shared/access-http-base`; the
  interceptor adds the bearer token and a correlation id and normalizes `ProblemDetail` errors. Source
  of truth for pairing state and the **server-derived** `EdgeDevice.status` / `lastSyncAt`.
- **Edge agent (device)** — a fixed station or the patient's Android/Chromium phone running GEST. It
  *reports* heartbeat and *pulls* the catalog over its own `edge.device` identity token; it is **not** a
  dashboard client and never holds a caregiver authority.
- **ACS (authz + session)** — issues the JWT and the `edge.*` authorities EDGE guards consume; owns the
  `PatientSession` lifecycle that sits *beside* EDGE's device-pairing on Screen 07.
- **PAT (catalog)** — owns the `Command` catalog the edge agent pulls; EDGE references `Patient` /
  `Command` by id only, never duplicating them.
- **HIST (audit)** — EDGE does not render history, but every pair / unpair emits an auditable action
  consumed by HIST downstream.
- **GEST / EVNT / Home (consumers of device state)** — read device liveness; EDGE publishes the
  read-model, they consume it.

No third-party widgets are embedded in EDGE.

## 3. End-to-end user flows

### Golden path A — Pair the edge device during onboarding (Screen 05, Step 3)

```
Technical lead → Onboarding wizard (shell-orchestrated)
  step 1 Care unit (ACS)  step 2 Patient (PAT)
  ┌──────────────────────────────────────────────────────────────┐
  │ step 3  Edge device                                           │
  │   [ idle ]   No device paired yet.        [ Pair device ]      │
  │   [ pairing ]  Pairing…                    (badge: Waiting)    │
  │   [ paired ]  Device paired · version N    (badge: Online)     │
  └──────────────────────────────────────────────────────────────┘
        │ EDGE owns only this step; PAT owns step 4 (first command),
        │ ACS owns steps 1 & 5 (tenant, invite caregiver)
        ▼
  If an EdgeDevice already exists for the patient → show "already paired · version N"
  + live online/offline badge (reads the real device read-model, no reset simulation)
```

### Golden path B — Pair the patient's phone as an edge device (Screen 07, device portion)

```
Caregiver → Activate patient mobile phone
  ┌──────────────────────────────────────────────────────────────┐
  │ 2. Patient mobile phone   [ Pair mobile phone ] → Pairing… → Online │   ← EDGE owns this
  │    "Reuses the device-identity model (ADR-014) · Android/Chromium only (PLAT-001)" │
  └──────────────────────────────────────────────────────────────┘
        │  (3. Persistent session + Active sessions list → ACS, ADR-012/SEC-001 — NOT EDGE)
        ▼
  POST claim → edge-service → device paired as an edge instance for the patient
```

### Golden path C — Read device connectivity (Topbar + Home, Screen 01)

```
Any dashboard screen
  Topbar:  🟢 Device online   (or 🔴 Device offline)        ← always visible, §3.2.B
  Home card "Edge device":   Status [Online]  Version N  Synced 3 min ago
        │ status/lastSyncAt are server-derived (heartbeat projection); FE never infers offline
        ▼ offline → amber badge; the screen does NOT become an alarm (alarm = EVNT only)
```

### Edge cases

- Pairing fails (claim times out / agent never reports) → pairing state `error` with retry guidance;
  no device record is left half-created (`device_pairing_failed`).
- A device already paired to the patient → the panel shows the existing device directly; "Pair" is not
  offered again unless the lead explicitly re-pairs (`device_already_paired`).
- Device goes offline → badge flips to amber/offline from the server read; Home stays a status screen,
  never an alarm (wireframe Screen 01 "offline" state).
- Unpair a device that has open/pending events → allowed; events keep their denormalized data in HIST;
  unpairing affects only future detection, never the patient or their session.
- The patient-phone is not Android/Chromium → pairing blocked with the PLAT-001 explanation
  (`platform_unsupported`); this is a client-surfaced constraint, not a silent failure.
- `edge-service` unreachable → device status renders a neutral "status unavailable" (never a false
  "online"), and pairing is disabled with a clear message.

## 4. Internal boundaries (Nx libraries — module-as-library, ADR-006)

```
apps/edge/                                  # thin host (type:app, scope:edge)
└── src/app/app.routes.ts                   # loadChildren → @neuroassist/edge

libs/edge/   (scope:edge)                   # module-as-library; importPath @neuroassist/edge (ADR-006)
└── src/lib/
    ├── edge.module.ts                       # the only NgModule (lazy entry)
    ├── edge.contract.ts                     # MODULE_KEY + ModuleMenuMetadata + permissions + flags
    ├── edge.bootstrap.ts                    # init/destroy lifecycle
    ├── edge.routes.ts                       # EDGE_ROUTES[]
    ├── edge.permission-map.ts               # ModulePermissionMap
    ├── edge.feature-flags.ts                # ModuleFeatureFlags (defaultState)
    ├── edge.nav.config.ts                   # navigation / breadcrumb
    ├── edge.descriptor.ts                   # EDGE_MODULE_DESCRIPTOR (consumed by the Shell)
    ├── edge.providers.ts                    # provideEdge({ adapter }) — default 'mock' (edge-service pending)
    ├── access/           (type:domain)      # canPairDeviceGuard / canViewDeviceGuard (AccessDecisionService)
    ├── data-access/      (type:data-access) # EDGE_DEVICE_PORT + Http/Mock adapters + DeviceFacade + <X>Wire mappers
    ├── feature-device-pairing/ (type:feature)  # pairing panel (onboarding step 3 + phone-activation device portion)
    ├── feature-device-status/  (type:feature)  # Home edge-device card + device lifecycle (re-pair/unpair)
    ├── ui/               (type:ui)          # DeviceStatusBadge (topbar + reused) — presentational
    ├── integration/      (type:domain)      # EdgeShellIntegrationService (+ topbar badge contribution)
    └── navigation/       (type:domain)      # breadcrumbs state
```

Tags: `scope:edge` + `type:{feature|data-access|domain|ui|app}`. A `scope:edge` lib may import only
`scope:edge` and `scope:shared` (`nx-boundaries.md`). The Shell (`scope:web`) imports
`@neuroassist/edge` in `config/module-descriptors.ts` via `EDGE_MODULE_DESCRIPTOR`, and the topbar
consumes EDGE's `DeviceStatusBadge` + device facade (the always-visible connectivity requirement,
§3.2.B).

## 5. Cross-cutting concerns

| Concern | How EDGE handles it |
|---|---|
| AuthN / session | `@neuroassist/shared/auth-session` — EDGE consumes claims, never implements login. |
| Active tenant | JWT `tenantId` claim (ACS §0); `@neuroassist/shared/tenant-context` mirrors it for display. EDGE reads, never writes. |
| AuthZ / RBAC | `@neuroassist/shared/access-decision` — `AccessDecisionService.can('edge.device.view' \| 'edge.device.pair' \| 'edge.device.unpair' \| 'edge.heartbeat.view')`; guards consume its output, never a hardcoded `true`. |
| Device identity | The `edge.device` token the agent carries (for GEST) is a device identity, **not** a caregiver authority — never evaluated by a dashboard guard (ADR-014). |
| HTTP | `@neuroassist/shared/access-http-base` — correlation + bearer-token + error-normalize interceptors; base `${ACCESS_HTTP_BASE}/edge`. |
| Liveness | Server-derived from the `edge-service` heartbeat projection; the FE never computes online/offline from client timers (ADR-005). |
| Errors | BE `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → user message via `@neuroassist/shared/ui-feedback`. |
| Observability | `@neuroassist/shared/observability` — pairing + pair/unpair timings and status transitions; never `console.log`. |
| Design tokens | Tailwind v4 oklch tokens via `@neuroassist/shared/ui-tokens`; dark default; CDK primitives (no Material). Reserved badge slot to avoid CLS on status change. |
| i18n | None — English-only (ADR-018). Strings kept in one place for a future additive locale layer. |
