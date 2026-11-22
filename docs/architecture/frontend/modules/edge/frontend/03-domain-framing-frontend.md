# 03 — Domain Framing (Frontend) — edge (EDGE)

> Mirrors the backend ubiquitous language. This document does **not** redefine domain terms — it
> references the shared glossary, `_brief.md` and the project data model, and frames the UI-side view
> models, events and state transitions.

## 1. Ubiquitous language (mirror — do not redefine)

Canonical definitions live in `techlab-ba/projects/neuroassist-niv/business/glossary.md` and the
project data model. EDGE-relevant terms:

| Term | Source of truth | EDGE FE note |
|---|---|---|
| EdgeDevice | data model | Local agent that runs gesture detection; `{ id, patientId, status, lastSyncAt, version }`. One per patient (station or phone). EDGE-owned. |
| status | data model enum | `online` \| `offline` — **server-derived** from the heartbeat; the FE renders it, never computes it. |
| lastSyncAt | EdgeDevice field | Timestamp of the last heartbeat/sync; rendered as a relative "synced N ago". |
| version | EdgeDevice field | Agent version string; shown on Home and after pairing. |
| pairing | flow (claim → heartbeat) | The act of binding an agent to a patient; a short-lived claim flow surfaced read-only in the dashboard (ADR-005). |
| edge.device (token) | ADR-014 · gest/frontend ADR-008 D1 | The agent's **device-identity** token (used by GEST). A device identity, **not** a caregiver authority. |
| Patient | data model · PAT | The device's subject; EDGE references by id, never a PAT operator and never editing the catalog. |
| PatientSession | data model · ACS | The persistent patient-phone session — **ACS-owned**; EDGE never provisions/revokes it (doc 02 §3). |
| heartbeat | BA technical-framing §6.12 | The periodic liveness signal `edge-service` aggregates into `status` + the uptime metric. Sent by the single `libs/edge` station-liveness sender (SAFETY-GEST-1); carries detection state. |
| detectionState | data model · BE ADR-005 | Second liveness axis `RUNNING \| PAUSED \| DEGRADED \| UNAVAILABLE \| UNKNOWN` — **server-derived**; "is it actually detecting?" as opposed to connectivity's "is it reachable?". Absent ⇒ `UNKNOWN`, never `RUNNING` (INV-EDGE-9). The FE renders it distinct from connectivity (SPEC-03 §1.1). |

## 2. View models (draft, per screen)

### `DeviceStatusVM` (Topbar badge + Home card)
```
device: {
  id: string
  patientId: string
  status: 'online' | 'offline'        // server-derived; never inferred client-side
  lastSyncAt: string                   // ISO; rendered relative ("3 min ago")
  version: string
} | null                               // null → "status unavailable" (never a false "online")
loading: boolean
canView: boolean                       // AccessDecisionService.can('edge.device.view')
```

### `DevicePairingVM` (onboarding step 3 + phone-activation device portion)
```
mode: 'station' | 'phone'              // 'phone' carries the PLAT-001 (Android/Chromium) note
existingDevice: DeviceStatusVM['device'] | null   // if present → show "already paired", no reset sim
pairing: 'idle' | 'pairing' | 'paired' | 'error'
canPair: boolean                       // AccessDecisionService.can('edge.device.pair')
error: string | null                   // e.g. device_pairing_failed | platform_unsupported
```

### `DeviceLifecycleVM` (re-pair / unpair)
```
device: DeviceStatusVM['device']
canUnpair: boolean                     // AccessDecisionService.can('edge.device.unpair')
confirming: boolean                    // destructive action behind a confirm
submitting: boolean
```

## 3. UI events (user-triggered, change state)

| Event | Trigger | Effect |
|---|---|---|
| `pairingStarted` | "Pair device" / "Pair mobile phone" click | POST claim → `edge-service`; set `pairing = 'pairing'`. |
| `devicePaired` | Claim confirmed (agent reports) | Device record created/updated; `pairing = 'paired'`; show version + online badge (anchor event `DevicePaired`). |
| `pairingFailed` | Claim timeout / platform unsupported | `pairing = 'error'`; surface `device_pairing_failed` / `platform_unsupported`; no half-record. |
| `deviceStatusRefreshed` | Status read cycle (navigation / topbar mount) | GET device read-model; update badge/card (supporting event `DeviceHeartbeatReceived`, server-driven). |
| `deviceUnpaired` | Unpair confirm | DELETE/POST unpair → `edge-service`; device removed from the patient; patient/catalog/session untouched. |

## 4. State transitions (UI level)

```
Device status:    idle → loading → online | offline | unavailable
Device pairing:   idle → pairing → paired | error(retry)
Pre-existing:     (device found) → shown-as-paired directly (no simulated pairing)
Device lifecycle: viewing → confirming(unpair) → submitting → removed | error
```

## 5. Invariants (client-side)

- `status` is a closed 2-value set (`online | offline`); a missing/unknown device renders
  **"status unavailable"**, never a defaulted "online".
- Online/offline is **always server-derived** — no component infers "offline" from a client-side timer
  or stale `lastSyncAt` (ADR-005).
- **Detection state is a second server-derived axis, distinct from connectivity** (SAFETY-GEST-1): a
  `paired` + `online` station that is not `RUNNING` is rendered "connected, NOT detecting" (amber
  warning + reason), never as a false "detecting" and never as "offline". An absent `detectionState`
  renders as unknown/not-detecting, never as detecting (INV-EDGE-9). The not-detecting warning never
  escalates client-side to the EVNT alarm — escalation of a prolonged lapse is server-owned (EDGE→EVNT).
- **One heartbeat sender** (SAFETY-GEST-1): `libs/edge` holds the `edge.device` token and is the single
  sender of `POST /edge/heartbeat`; GEST publishes its detection state in-process via `StationLivenessPort`
  and never opens a second sender (INV-GEST-8).
- A patient has **at most one** active `EdgeDevice` of each kind (station / phone); the pairing panel
  shows an existing device instead of offering a duplicate pair.
- An **offline** device is an amber/warning state only — it never escalates to the EVNT full-screen
  alarm (reserved for `HELP_REQUESTED`).
- The `edge.device` identity token is **never** treated as a caregiver authority; dashboard guards read
  only `edge.*` authorities via `AccessDecisionService` (ADR-014).
- Pairing a patient phone requires Android/Chromium (PLAT-001); the constraint is surfaced to the user,
  not silently enforced.
- Device connectivity is **always visible** — the topbar badge is never hidden behind a submenu
  (Principle 2.6, §3.2.B).
- No permission is evaluated inline; `AccessDecisionService.can(...)` gates every action, and no guard
  returns a hardcoded `true`.
- All copy is English (ADR-018); no locale toggle.
