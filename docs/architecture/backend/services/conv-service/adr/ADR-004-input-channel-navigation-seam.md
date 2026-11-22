<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Input-channel-agnostic navigation via an in-process station seam

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner.

## Contexto
The patient navigates the speech tree by **gesture** (resolved by the in-process GEST station
runtime, `libs/gest`) **or** by **direct touch/mouse**. The registry calls CONV
"input-channel-agnostic". Two constraints: navigation must work offline, and it must **not require
a network call per navigation step**. GEST already runs detection locally on the station and, per
its blueprint, resolves commands and maps them to actions **in-process** on the station (never a
per-command backend call for navigation). CONV must not reintroduce a server hop for input.

Options: **(A) a CONV `POST /conv/navigate` endpoint per step** — rejected, violates the no-network
rule and couples the patient's path to CONV availability; **(B) a client-side navigation seam on
the station** fed by pluggable input adapters (gesture, touch/mouse), operating over the cached
tree.

## Decisão
**Adopt Option B — an in-process, client-side `NavigationInput` seam on the station.** Both the
gesture adapter (driven by the GEST station runtime, analogous to GEST's own in-process station
seam) and the touch/mouse adapter emit the **same navigation intents** (move, enter, back, select,
play) against the **cached tree**. CONV's backend exposes **no per-navigation endpoint**; it only
serves the bundle (ADR-003). The seam is input-channel-agnostic: adding or swapping an input channel
is a station concern and changes no CONV contract. The Patient-Mode host shell that composes GEST
detection + the CONV tree is a project-level decision (gap R6/G1), but the seam contract is fixed
here: navigation is local, over the cache, with zero CONV calls.

## Consequências
- Positive: navigation works offline and at local-I/O latency regardless of server/network state.
- Positive: gesture and touch/mouse are symmetric; new input channels plug into one seam.
- Positive: respects GEST's established in-process station pattern; no new backend surface.
- Negative: the navigation logic lives on the station (FE/edge), so its correctness is validated
  there, not in CONV's backend tests — called out for FE specs.
- Negative: depends on the Patient-Mode host shell decision (G1) to know which app mounts the seam.
