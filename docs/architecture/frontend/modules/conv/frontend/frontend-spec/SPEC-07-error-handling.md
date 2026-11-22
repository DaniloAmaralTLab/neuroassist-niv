# SPEC-07 — Error Handling — conv (CONV) Frontend

> The fail-safe core: **a missing clip, an outage, a stale cache or a revoked session must never make the
> patient silently "fail to speak"** (FE ADR-005; doc 03 §5 invariants; BE api-contract §9 error model).
> Offline / stale / cold-empty are **states** (SPEC-03 §2), not errors. CONV maps the station-path
> `ProblemDetail`s only — publish/retire/erase failures are TRN's path, not a CONV UI concern.

## 1. `ProblemDetail` → `AppError` → patient/caregiver copy

conv-service returns `application/problem+json` (BE §9). CONV maps it via
`@neuroassist/shared/error-model` (`ProblemDetail → AppError`) and surfaces copy via
`@neuroassist/shared/ui-feedback`. Because the patient surface must stay calm and non-blocking, most CONV
"errors" resolve to a **state change on the cached runtime**, not a modal.

## 2. BE station-path `type` slug → FE behaviour (the fail-safe table)

| BE `type` slug | HTTP | Where | FE behaviour |
|---|---|---|---|
| `unauthenticated` | 401 | tree sync / audio / usage | **session ended** — stop syncing, keep serving the cache if present, show "session ended — ask your caregiver"; never silently retry a revoked token |
| `forbidden` | 403 | tree sync / audio / usage | **misconfiguration** — stop; surface "setup issue — ask your caregiver"; never fabricate tree content |
| `tree-not-published` | 404 | `GET /conv/tree` (first sync) | **cold-empty** state "not yet configured / synced on this station" (SPEC-03 §2 `empty`); never a blank speaking surface |
| `not-found` | 404 | `GET /conv/audio/{assetId}` | **missing clip** → fail-safe audio cascade (§3); not an error surface |
| `audio-erased` | 410 | `GET /conv/audio/{assetId}` | **erased** — drop the cached clip, fail-safe audio cascade; never replay erased audio |
| `validation-error` | 400 | `POST /conv/usage-signals` | **discard** the offending usage signal locally; never retry it; playback unaffected |

> `dangling-audio-reference` (422) and `audit-unavailable` (502) are **publish-path** failures (TRN
> service-client, BE §5) — CONV renders no publish UI, so it maps **no** FE surface for them.

## 3. Fail-safe audio cascade (the module's safety core — ADR-005)

Playback resolves in strict order and is **never silently absent**:

```
cached clip present              → play the Blob from Cache Storage (patient's own voice)   audioSource='cached'
clip missing / 404 / 410 erased  → device TTS (SpeechSynthesis, OPS-004) of the phrase text  audioSource='tts-fallback'
neither available                → render the phrase text LARGE on screen (visual-only)      audioSource='text-only'
```

The `TtsPlayerComponent` shows an **honest cached-vs-fallback indicator**; the patient is never shown a
"spoken" state that did not produce output.

## 4. Offline / stale / cold are states, not errors

- **Offline** or a failed sync while a snapshot is cached → keep serving the last fully-cached bundle, show
  the subtle "offline — last synced vX" marker (`offline-stale`). No toast, no block.
- **Cold-empty** (never synced + offline) → the honest `empty` state (R1 hard dependency, INT-CONV-2).
- These are rendered by SPEC-03's `TreeState`, not by the error channel.

## 5. Toast vs banner vs modal, retry, telemetry

- **Banner** (inline, calm): session-ended and setup-issue messages — inline on the converse surface, large
  and low-cognitive-load; the cached tree stays visible beneath where possible.
- **Inline marker**: the offline/stale version marker (not an error).
- **Toast**: only for a **manual `syncNow`** that failed outright, so the standing surface is not disturbed.
- **Modal**: **never** — CONV never takes over the patient's viewport (the only product takeover is EVNT's
  emergency alarm, which CONV does not render).
- **Retry**: the station retries **sync** opportunistically (reconnect/periodic); it does **not** retry a
  `401`/`403` token. Usage-signal flush retries idempotently (SPEC-04 §3), except a `400` which is discarded.
- **Correlation / PII**: failures are reported through `@neuroassist/shared/observability` using the
  Access-Layer correlation id; **phrase content is never logged as PII** beyond policy; no `console.log`.

## Acceptance criteria (EARS)

- IF conv-service responds `401 unauthenticated` on a tree sync, THEN THE SYSTEM SHALL stop syncing and keep serving the cached bundle if present and show a session-ended message and SHALL NOT retry the revoked token.
- IF conv-service responds `403 forbidden` on a tree sync, THEN THE SYSTEM SHALL stop syncing and show a setup-issue message and SHALL NOT fabricate tree content.
- IF conv-service responds `404 tree-not-published` on the first sync, THEN THE SYSTEM SHALL show the cold-empty "not yet synced on this station" state and SHALL NOT render a blank speaking surface.
- IF `GET /conv/audio/{assetId}` responds `410 audio-erased`, THEN THE SYSTEM SHALL drop the cached clip and fall back to device TTS then large text and SHALL NOT replay erased audio.
- IF `GET /conv/audio/{assetId}` responds `404 not-found` or the cached clip is absent, THEN THE SYSTEM SHALL fall back to device TTS then large text and SHALL NOT present a silent spoken state.
- IF the usage-signal post responds `400 validation-error`, THEN THE SYSTEM SHALL discard the signal locally and SHALL NOT retry it and SHALL NOT affect playback.
- WHILE the station is offline or the cached snapshot is stale, THE SYSTEM SHALL treat offline and stale as states and SHALL keep serving the cached bundle without a blocking error.
- THE SYSTEM SHALL report station-path failures through the shared observability correlation id and SHALL NOT log phrase content as PII beyond policy.
