# Design Tokens — dash (DASH) Frontend

> DASH introduces **no new token**. It consumes `@neuroassist/shared/ui-tokens` (oklch, dark default) like
> every promoted NIV module, and maps the composite-status headline to the **existing** semantic token
> families. This file records only that mapping, so the fail-safe styling is unambiguous. Tokens are owned
> by shared ADR-005 (design tokens); DASH references them.

## 1. Composite-status → semantic token family

| `CompositeStatus` | Token family | Intent | Note |
|---|---|---|---|
| `all_clear` | `--color-success` | green "X is OK" | reachable only when every source is `ok` and fresh (INV-1) |
| `notice` | `--color-info` / **amber** `--color-warning` | routine notice / "online but not detecting" | detection-lapse uses **amber**, a calm safety surface — **never** `--color-alarm` |
| `degraded` | `--color-warning` (muted) | "cannot confirm — last checked HH:MM" | honest degradation, not an error scream |
| `emergency` | *(none — DASH applies no token)* | EVNT takeover renders above DASH | DASH styles emergency with **nothing** (INV-3) |
| per-source `error` / `stale` | `--color-warning` on the panel | inline degraded banner | never a reassuring default, never blank |

## 2. Rules

- **The emergency palette (`--color-alarm`) is never applied by DASH.** Only EVNT's emergency takeover uses
  it; DASH's detection-lapse and degraded states stay in the `--color-warning` / `--color-info` families
  (amber/info), so a lapse or an outage reads as "attention", not "emergency" (INV-3, FE `adr/ADR-005` §3).
- **A failed/stale panel keeps the same layout** (no collapse), with a muted `--color-warning` banner — so a
  degraded overview is still legible and never blank.
- Dark-default theming and the oklch palette are inherited unchanged from `@neuroassist/shared/ui-tokens`;
  DASH adds no `:root` override.
