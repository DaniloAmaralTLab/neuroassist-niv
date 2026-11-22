# ADR-007 (CONV-local) — Input-channel-agnostic navigation via in-process `NavigationIntentPort`

- **Status:** proposed — 2026-11-20 (orchestrator default; revisable at Specs/M1.5)
- **Scope:** `libs/conv` navigation + its seam to GEST inside the shared Patient-Mode host.
  (Numbered 007 to avoid collision with the shared ADR-006; see the module ADR README.)

## Context

A locked-in patient controls different input channels at different times: a facial **gesture**
(recognized by GEST), a **touch/mouse** tap, or a **switch scan**. The product promise (wireframe
Screen 06, Principle 7) is that **no channel is privileged** — every channel reaches the *same*
selected node in ≤ 2 selections. GEST runs in the **same station host** as CONV (G1), reports
gestures to EVNT, and must be able to *drive CONV navigation* — but GEST reporting its own gestures
over HTTP to CONV would be wrong (latency, a network dependency on the hot path, and a layering
violation). The established house pattern for exactly this situation is GEST's in-process
`STATION_LIVENESS_PORT` seam to libs/edge (publisher pushes, consumer carries; no-op default; host
wires the concrete implementation).

## Decision

1. **One selected-node model, many channels.** All input resolves to the same
   `SpeechTreeFacade.select(nodeId)` / level navigation; channels never fork the state.
2. **`NAVIGATION_INTENT_PORT` in-process seam.** CONV declares an `InjectionToken`
   `NAVIGATION_INTENT_PORT` with a `NoOpNavigationIntentPort` default. The **Patient-Mode host**
   overrides it so GEST **pushes** navigation intents (e.g. `selectByFeatureRef`, `descend`, `back`)
   to CONV **in-process**. **GEST never calls CONV over HTTP** (mirror of `STATION_LIVENESS_PORT`,
   direction reversed: GEST is the publisher, CONV the consumer).
3. **Touch/mouse + switch scanning are first-class.** Switch scanning lives in `navigation/` with a
   **host/profile-configurable timing model** (dwell ms, scan interval); large targets; the active
   channel is shown by a `ChannelBadge`.
4. **Gesture→node resolution.** An intent carrying an `engineFeatureRef` resolves to the node at the
   current level with the matching `engineFeatureRef`; if none/not-authorized, the intent is ignored
   (no navigation), leaving touch/scan unaffected.
5. **No Event emission in v1.** Driving navigation does not emit a catalog Event — EVNT owns events
   (open question Q2, deferred to M1.5).

## Alternatives considered

- **GEST → CONV over HTTP.** Rejected: network on the hot path, latency, layering violation.
- **CONV subscribes to EVNT gesture-reports.** Rejected: EVNT is the alarm/event path, not an input
  bus for CONV; adds a server round-trip and couples CONV to EVNT.
- **Per-channel branching in components.** Rejected: duplicates state, risks channel privilege,
  breaks the "same node" guarantee.
- **A shared global intent store.** Rejected for v1: heavier than a port; the port keeps GEST and
  CONV decoupled and testable (no-op default).

## Consequences

- (+) Channels are swappable and testable; adding a channel is adding a producer to the port.
- (+) Offline-safe: intents are in-process, no network.
- (+) Accessibility (dwell/scan timing) is explicit and tunable per patient.
- (−) Requires the **G1 Patient-Mode host** to wire the override (hard dependency, 06 G1); without it
  the port stays no-op and only touch/scan work.
- (−) Gesture-vocabulary (`engineFeatureRef`) coupling to GEST must stay in sync (unified vocabulary).

## References

- 02 §2–§4 (seam, host wiring), 03 §3 (UI events), 06 G1 + Q2.
- Pattern source: `libs/gest/src/lib/integration/station-liveness.port.ts` +
  `no-op-station-liveness.port.ts` + `gest.providers.ts` (`STATION_LIVENESS_PORT` wiring).
- Prototype `conv-tree.component.ts` (`channel` signal, `simulateGesture`, `engineFeatureRef`).
