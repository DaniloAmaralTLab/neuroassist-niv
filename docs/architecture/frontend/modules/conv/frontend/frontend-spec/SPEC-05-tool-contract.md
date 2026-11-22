# SPEC-05 — Module Contract — conv (CONV) Frontend

> Content of `libs/conv/src/lib/conv.contract.ts`: `MODULE_KEY`, `MODULE_MENU_METADATA`,
> `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`. The permission map holds **only the patient-session
> authorities** CONV runs under — `conv.tree.read`, `conv.audio.read`, `conv.usage.record` — each equal to
> the BE authority constant (BE api-contract §10; permission-catalogue `conv` module, D-639). Publish /
> retire / erase are **TRN service-client only** and get **no CONV UI affordance**. Code fences are
> illustration, not EARS contracts.

## 1. `MODULE_KEY` and menu metadata

```ts
export const MODULE_KEY = 'conv';

export const MODULE_MENU_METADATA: ModuleMenuMetadata = {
  key: 'conv',
  title: 'Talk',
  icon: 'chat_bubble',             // Material Symbols (self-hosted @font-face)
  section: 'patient',              // the Patient-Mode surface (not the caregiver 'care' section)
  order: 0,                        // the patient's primary (near-single-screen) destination
  identity: 'patient.session',     // runs under the ACS patient-session token, not a caregiver JWT
  entries: [
    { label: 'Talk', route: '/patient/converse', requires: 'conv.tree.read' },
  ],
};
```

## 2. `MODULE_PERMISSION_MAP` — patient-session authorities only (verbatim from BE)

```ts
export const MODULE_PERMISSION_MAP: ModulePermissionMap = {
  'conv.tree.read':    { label: 'Read the speech tree', justification: 'Gate the whole /patient/converse surface and the background tree sync (GET /conv/tree). In the patient-session token (ACS INV-3). BE api-contract §2.' },
  'conv.audio.read':   { label: 'Read cached audio',    justification: 'Gate the audio prefetch and cached-clip fetch (GET /conv/audio/{assetId}). Without it, playback falls back to device TTS then large text. BE api-contract §3.' },
  'conv.usage.record': { label: 'Record opt-in usage',  justification: 'Gate the opt-in minimal usage signal (POST /conv/usage-signals, phraseId + timestamp, no free text). Off-path, never blocks playback. BE api-contract §4.' },
};
```

> **CONV introduces no publish/retire/erase UI authority.** `conv.tree.publish`,
> `conv.tree-version.retire` and `conv.audio.delete` exist in the permission catalogue but are **TRN
> service-client** authorities (BE api-contract §5–§7; ACS INV-3): a patient-session token is rejected `403`
> on those paths, and CONV renders **no** surface for them. The three keys above are the **entire** CONV UI
> permission map. Patient identity (`pat.patient.read`) is a **service-client** read CONV makes server-side;
> it is **not** a patient-session UI authority and is not in this map.

Every authority-gated affordance goes through the `patientSessionGuard` / an `access-decision` can-check
(a Wave-0 stub today — SPEC-01 §4); it **never** hardcodes `return true` (carry-forward
`guard:stub-permissive`).

## 3. `MODULE_FEATURE_FLAGS`

```ts
export const MODULE_FEATURE_FLAGS: ModuleFeatureFlags = {
  'conv.usage-signal.enabled':  { defaultState: false, justification: 'Opt-in per BE INV-CONV-6 — OFF by default; the caregiver opts a patient in at provisioning. While off, no usage signal is enqueued or posted. Playback is unaffected either way.' },
  'conv.switch-scan.enabled':   { defaultState: true,  justification: 'Switch-scanning input channel (dwell + timed scan) for patients who drive the station by a single switch. Off → only touch and gesture channels are offered. Timing is host/profile-configurable (ADR-007).' },
};
```

`provideConv({ adapter, flags })` wires the Http/Mock adapters (**default `'http'`** — conv-service is
published, SPEC-04 §2) and the `NAVIGATION_INTENT_PORT` default `NoOpNavigationIntentPort`; the Patient-Mode
host overrides the port with the GEST-fed implementation (SPEC-06 §2).

## 4. RBAC-of-UI rule (patient-session self-gating)

- The whole `/patient/converse` surface requires `conv.tree.read` (menu entry `requires` + guard).
- Audio playback requires `conv.audio.read`: lacking it, the audio prefetch/fetch is **not attempted** and
  the player degrades straight to device TTS then large text (the fail-safe cascade, SPEC-07) — the patient
  still "speaks", honestly, from fallback.
- The opt-in usage signal requires `conv.usage.record` **and** the `conv.usage-signal.enabled` flag; lacking
  either, no signal is enqueued and playback is unaffected.
- CONV exposes **no** publish/retire/erase control at any authority: those are TRN's, server-side.

## Acceptance criteria (EARS)

- WHILE the patient-session lacks `conv.tree.read`, THE SYSTEM SHALL hide the speech-tree navigator surface.
- WHILE the patient-session lacks `conv.audio.read`, THE SYSTEM SHALL skip the cached-audio fetch and fall back to device TTS then large text.
- WHILE the patient-session lacks `conv.usage.record`, THE SYSTEM SHALL enqueue no usage signal and SHALL keep playback unaffected.
- THE SYSTEM SHALL build the CONV permission map only from the patient-session authorities `conv.tree.read`, `conv.audio.read` and `conv.usage.record` and SHALL NOT introduce any publish, retire or erase UI authority.
- THE SYSTEM SHALL expose no publish, retire or erase affordance in the CONV UI because those operations are TRN service-client only.
- THE SYSTEM SHALL evaluate every CONV surface gate through the patient-session guard and SHALL NOT return a hardcoded true from a guard.
