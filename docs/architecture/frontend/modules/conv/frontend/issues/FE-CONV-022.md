# FE-CONV-022 -- Telemetry via shared/observability — CONV telemetry events (tree-sync, audio-play, usage-signal, navigation), correlation id, no PII/text in payload

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-04 §3, SPEC-07 §4, generator-config.yml §observability_events

## Outcome
Key CONV runtime events are emitted via `@neuroassist/shared/observability` for telemetry: `conv.tree.sync.completed`, `conv.audio.play.started`, `conv.audio.play.completed`, `conv.usage-signal.enqueued`, `conv.navigation.select`, `conv.navigation.descend`. **No phrase text, no patient-id, no PII** is included in any payload (only structural attributes: nodeId, audioSource, treeVersion, durationMs). Correlation IDs from the interceptor are propagated to allow distributed traces.

## Approach (execution path)
1. In `TreeSyncService` (FE-CONV-007), after a successful atomic swap: emit `conv.tree.sync.completed` with `{ treeVersion: string; nodeCount: number; durationMs: number }`.
2. In `AudioPlaybackService.play()` (FE-CONV-009): emit `conv.audio.play.started` with `{ audioSource: 'cached' | 'tts-fallback' | 'text-only'; nodeId: string }` (no phrase text). Emit `conv.audio.play.completed` after the clip finishes (or immediately for TTS/text-only).
3. In `UsageSignalService.enqueue()` (FE-CONV-010): emit `conv.usage-signal.enqueued` with `{ nodeId: string }` (no phrase text, no idempotencyKey).
4. In `SpeechTreeFacade.select()` / `descend()` (FE-CONV-012): emit `conv.navigation.select` / `conv.navigation.descend` with `{ nodeId: string; channel: 'touch' | 'gesture' | 'scan' }`.
5. All events are emitted via `@neuroassist/shared/observability` `TelemetryService.emit(eventName, attributes)`. The `X-Correlation-Id` header value from `conv-auth.interceptor.ts` (INT-FE-CONV-004) is included as the correlation id when available.
6. Payload contract: **no phrase text, no patient PII, no full tree content**. Only structural attributes.
7. Unit test: `select()` → `TelemetryService.emit('conv.navigation.select', ...)` called with correct nodeId and channel; payload has no text field.

## Implementation checklist (by layer/file)
- [ ] `TreeSyncService` emits `conv.tree.sync.completed` with structural attributes (no PII)
- [ ] `AudioPlaybackService.play()` emits `conv.audio.play.started` and `conv.audio.play.completed` (nodeId, audioSource only — no text)
- [ ] `UsageSignalService.enqueue()` emits `conv.usage-signal.enqueued` with nodeId only (no phrase text)
- [ ] `SpeechTreeFacade.select()` emits `conv.navigation.select` with channel
- [ ] `SpeechTreeFacade.descend()` emits `conv.navigation.descend` with channel
- [ ] No phrase text, no patient-id, no PII in any payload
- [ ] `@neuroassist/shared/observability` TelemetryService injected at call sites
- [ ] `npx nx test conv-data-access` PASS — telemetry emit calls + zero-PII contract
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] `conv.audio.play.started` payload has no `text` or `phraseText` field
- [ ] `conv.navigation.select` payload has `nodeId` and `channel` only
- [ ] All 6 events are emitted via `@neuroassist/shared/observability`
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-007 (TreeSyncService — sync completed event).
FE-CONV-009 (AudioPlaybackService — audio play events).
FE-CONV-010 (UsageSignalService — usage-signal enqueued event).
FE-CONV-012 (SpeechTreeFacade — navigation events).
INT-FE-CONV-004 (shared/observability correlation id propagation).

## Tenant-context impact
No tenant-identifying attribute in telemetry payloads. The session is identified by correlation id only.
