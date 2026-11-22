# SPEC-08 — E2E Scenarios — conv (CONV) Frontend

> The Gherkin scenario inventory. Each `.feature` lives in `../e2e/` and is the executable mirror of the
> EARS acceptance criteria in SPEC-01/03/04/05/06/07 (the `fe-ears-coverage` gate matches each criterion
> clause to a scenario here by keyword overlap). This file lists scenarios only — it declares no new rule
> (no EARS section). Gherkin keywords are **English** (D-566).

## 1. Feature files

| Feature file | Covers (SPEC → clauses) | Theme |
|---|---|---|
| `navigate-and-speak-offline.feature` | SPEC-01 (navigate renders navigator), SPEC-03 (dual-authorization render), SPEC-04 (cache-served nav/playback, zero network) | golden path A — speak offline |
| `audio-fail-safe-cascade.feature` | SPEC-07 (410 erased, 404/absent → fallback, never silent), SPEC-05 (no `conv.audio.read` → fallback) | the fail-safe audio cascade |
| `background-sync-and-staleness.feature` | SPEC-04 (304, atomic swap, HTTP adapter default), SPEC-03 (cold-start loading, cold-empty, offline marker), SPEC-07 (404 tree-not-published, offline/stale states) | golden path B — out-of-loop sync + staleness |
| `input-channel-agnostic-navigation.feature` | SPEC-03 (same selected node), SPEC-06 (no-op default, host-wired port, ignored intent) | ADR-007 input-channel seam |
| `pending-confirmation-and-trn-boundary.feature` | SPEC-03 (confirmation banner), SPEC-01 (no confirm-training route, one route), SPEC-05 (no publish/retire/erase affordance, permission map) | golden path C — TRN boundary |
| `session-guard-and-rbac.feature` | SPEC-01 (guard), SPEC-05 (RBAC, guard), SPEC-06 (egress bearer), SPEC-07 (401/403, correlation id), SPEC-04 (opt-in usage, flush) | session guard, RBAC + station-path errors |

## 2. Scenario inventory (titles mirror the EARS criterion nouns)

**navigate-and-speak-offline.feature**
- Navigating to the converse route renders the speech-tree navigator
- Navigation and playback are served entirely from the local cache with zero network
- Only dual-authorized phrases render while categories always render

**audio-fail-safe-cascade.feature**
- Erased audio drops the cached clip and falls back without replaying erased audio
- A missing audio clip falls back to device TTS then large text, never silent
- Lacking conv.audio.read skips the cached-audio fetch and falls back

**background-sync-and-staleness.feature**
- A conditional sync with a matching ETag keeps serving the cached bundle
- A newer version is downloaded and audio prefetched before an atomic swap
- Published conv-service binds the HTTP adapter as the default and maps via wire mappers
- Cold start holds a bounded loading state, never empty-as-configured
- A never-synced offline station shows the cold-empty state, not an infinite spinner
- A cold first sync answered 404 tree-not-published shows cold-empty, not a blank surface
- Serving a cached snapshot offline shows the last-synced marker and stays usable
- Offline and stale are states that keep serving the cache without a blocking error

**input-channel-agnostic-navigation.feature**
- Every channel resolves to the same selected node without bypassing the dual-authorization filter
- The no-op navigation-intent port default lets touch and switch-scan work without a host
- The host-wired GEST-fed port routes a gesture intent onto the same selected-node model
- A gesture intent targeting an absent or unauthorized node is ignored

**pending-confirmation-and-trn-boundary.feature**
- Caregiver-confirmed phrases awaiting patient confirmation show the link-out banner
- The confirm-training surface is a link-out, not a CONV route
- CONV registers exactly one route and no publish, retire or erase route
- The CONV UI exposes no publish, retire or erase affordance
- The permission map holds only the three patient-session authorities

**session-guard-and-rbac.feature**
- The guard redirects to the session-ended surface when there is no active session
- The guard decides from the real patient-session, never a hardcoded true
- Every CONV surface gate goes through the patient-session guard
- Lacking conv.tree.read hides the speech-tree navigator surface
- Lacking conv.usage.record enqueues no usage signal and keeps playback unaffected
- CONV egress attaches the patient-session bearer, not the edge.device token
- A 401 unauthenticated sync stops syncing and keeps the cache, never retrying the revoked token
- A 403 forbidden sync stops and surfaces a setup issue, never fabricating content
- An opted-in spoken phrase enqueues a minimal usage signal without blocking playback
- A failed usage-signal flush retains the queued signal without an error to the patient
- A 400 validation-error usage post is discarded without retry and without affecting playback
- Station-path failures report through the shared correlation id with no phrase PII

## 3. Notes

- No `Scenario Outline` is required for CONV; each criterion maps to one concrete scenario.
- The gesture-intent scenarios assume the **host-wired** `NAVIGATION_INTENT_PORT`; the no-op-default
  scenario proves touch + switch-scan without a host (G1 is still open — SPEC-06 §4).
