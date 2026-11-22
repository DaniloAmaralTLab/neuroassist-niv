# SPEC-05 — Module Contract — gest (GEST) Frontend

> Content of `libs/gest/src/lib/gest.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`, plus the station-token authority set. GEST is the
> station runtime, **not** a caregiver dashboard: it contributes **no** caregiver authority-gated
> menu entry and **no** sidebar destination. Sources: `frontend/04-frontend-architecture-direction.md` §7,
> GEST api-contract §1, EVNT api-contract §2.1, EDGE api-contract §5. Authority reconciliation: SPEC-01 §2.

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'gest';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'gest',
  title: 'Station Detection',
  icon: 'sensors',                 // Material Symbols (self-hosted @font-face)
  section: 'station',              // Patient-Mode station context — NOT the caregiver 'care' sidebar
  order: 10,
  // GEST contributes NO caregiver top-level destination. The runtime route is near-headless (the
  // patient never navigates) and the status route is the on-station operator surface. Both are
  // reached inside the Patient-Mode host and gated by the station identity, not a caregiver menu.
  entries: [
    { label: 'Detection status', route: '/station/status', requires: '__station_identity__', contextual: true },
  ],
};
```

## 2. `MODULE_PERMISSION_MAP` — reconciliation (no caregiver `gest.*` authority in v1)

```ts
// GEST declares NO caregiver authority. The vision's gest.runtime.read / gest.runtime.control /
// gest.diagnostics.read do NOT exist in the backend and are DROPPED (SPEC-01 §2, backend-api-cross-link §2).
// The runtime and on-station status surfaces are gated by the STATION IDENTITY (edge.device token),
// evaluated by stationIdentityGuard — never AccessDecisionService.can('gest.*').
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  // intentionally empty — GEST contributes no caregiver authority-gated UI affordance in v1.
};
```

> **Reconciliation (mandatory).** `gest.runtime.read`, `gest.runtime.control`, `gest.diagnostics.read`
> → **DROPPED** (no such backend authority; the station runtime is FE-local, handoff M1/M2). WHERE a
> future caregiver-facing GEST screen is introduced, it MUST gate on the real BE authorities
> `gest.capability.read` / `gest.engine.read` **exactly** (D-639, never `.view`) via
> `AccessDecisionService.can(...)`. Today, the **remote** caregiver's "is the detector alive" signal
> is **EDGE's** (`edge.device.read` on EDGE's `DeviceStatusBadge`), not a GEST surface (SPEC-09 /
> reconciliation #4).

## 3. Station-token authority set (the `edge.device` token the station carries — not a caregiver map)

The station authenticates **all** GEST egress with its `edge.device` token (minted by EDGE, EDGE
api-contract §5; machine identity). That token MUST carry:

```ts
export const STATION_TOKEN_AUTHORITIES = [
  'evnt.event.ingest',    // POST /evnt/gesture-reports — the one write (EVNT §2.1; EDGE token right, G5)
  'gest.capability.read', // POST /gest/capabilities/support-check — the detectable gate (INT-GEST-ACS-1)
  'gest.engine.read',     // GET /gest/engines — resolve/display the running engineVersion (INT-GEST-ACS-1)
  'edge.catalog.read',    // GET /edge/catalog — the offline command catalog (EDGE §4.1)
  'edge.heartbeat.record',// POST /edge/heartbeat — liveness (EDGE §3.1; reused for caregiver propagation, SPEC-09)
] as const;
```

> **INT-GEST-ACS-1 (OPEN, handed to ACS/EDGE — do not resolve here).** The `edge.device` token today
> is minted with `["edge.heartbeat.record", "edge.catalog.read"]` (+ the EVNT gesture-report right,
> EDGE §5/G5). It must **also** carry `gest.capability.read` and `gest.engine.read` so the station can
> run the detectable gate at boot without a patient-session JWT. GEST owns no token minting; it only
> validates and consumes. A patient-session ACS JWT is accepted as a fallback (GEST api-contract §1.2).

## 4. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'gest.compound-gestures': { defaultState: true, justification: 'Recognise a compound command (primary+secondary primitive) within the per-command duration window (INV-GEST-2).' },
  'gest.operator-preview':  { defaultState: true, justification: 'Optional live camera preview for the operator at the station; bound to the SAME capture stream the worker reads (never a second capture).' },
  'gest.offline-queue':     { defaultState: true, justification: 'Durable report queue + retry so a recognition survives a network gap and a reload (INV-GEST-1/5, SPEC-04 §4.2).' },
  'gest.wake-lock':         { defaultState: true, justification: 'Screen Wake Lock acquire/re-acquire to keep the station awake while detecting (SPEC-09, SAFETY).' },
};
```

## 5. RBAC-of-UI rule (station identity, not caregiver authority)

- The runtime and on-station status surfaces are gated by `stationIdentityGuard` (a valid, unrevoked
  `edge.device` token), **not** by `AccessDecisionService.can('gest.*')`. There is no caregiver role
  affordance to hide/show in v1.
- A patient-session / `edge.device` token never carries a caregiver management authority (ACS ADR-012 /
  GEST api-contract §1.1), so the station can never reach a GEST/EVNT **write-management** endpoint
  (it holds only `.ingest` / `.read` rights). Defense-in-depth only — the BE enforces every authority
  regardless (GEST api-contract §1.1 INV-GEST-5; EVNT §2.1).

## Criterios de aceite (EARS)

- THE SYSTEM SHALL gate the runtime and status surfaces by the `edge.device` station identity and SHALL NOT evaluate a caregiver `gest.runtime.*` or `gest.diagnostics.*` authority (no such backend authority exists).
- THE SYSTEM SHALL authenticate every GEST egress with the `edge.device` station token and SHALL NOT attach the caregiver session bearer.
- WHILE the `edge.device` token lacks `gest.capability.read`, THE SYSTEM SHALL surface the detectable gate as unavailable and SHALL NOT silently treat every command as detectable (INT-GEST-ACS-1).
- THE SYSTEM SHALL contribute no caregiver sidebar destination and no caregiver authority-gated affordance for GEST in v1.
- WHERE a future caregiver-facing GEST screen is added, THE SYSTEM SHALL gate it on `gest.capability.read` / `gest.engine.read` exactly and SHALL NOT introduce a `gest.runtime.*` or `gest.diagnostics.*` key.
