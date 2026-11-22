# Design Tokens — edge (EDGE) Frontend

> EDGE consumes the project design system; it defines no new tokens. Canonical standard:
> `../../../../standards/design-system-tokens.md` (Tailwind v4 CSS-first + oklch, dark default).
> This file records only the EDGE-specific token usage and a11y constraints.

## 1. Token source

Components style via Tailwind v4 utilities bound to the oklch tokens from
`@neuroassist/shared/ui-tokens` (`theme.css` vendored into `apps/neuroassist-niv-web`). No hardcoded
hex/rgb, no hardcoded spacing. Dark is the default theme; `[data-theme="light"]` overrides the same
token names. Icons via Material Symbols (self-hosted `@font-face`).

## 2. EDGE token usage map

| EDGE element | Tokens / utilities |
|---|---|
| Surfaces (Home card, status page, panel) | `bg-surface`, `bg-surface-2`, `rounded-card`, `shadow-card` |
| Text | `text-ink`, `text-ink-soft`, `text-ink-faint` |
| Device **online** badge | `--color-success` family (`bg-success-soft`, `text-success-ink`) |
| Device **offline** badge | `--color-warning` / amber family — a warning state only, **never** `--color-danger` (an offline device never escalates to an alarm; EVNT owns alarms) |
| **Status unavailable** badge | `--color-ink-faint` neutral — never a defaulted "online" |
| Pairing progress (idle/pairing/paired) | `--color-brand` for the active step; `success` on `paired` |
| Pairing code display | `bg-field`, `border-field-line`, monospace; high contrast for read-aloud |
| Primary action ("Pair device") | `bg-brand`, `text-brand-ink`, `hover:bg-brand-strong` |
| Destructive actions (Unpair, Revoke) | `--color-danger` family — high-contrast, behind an explicit confirm |
| Platform-unsupported notice (PLAT-001) | `--color-warning` family (banner) |

## 3. Accessibility constraints (carry-forwards)

- The device-status badge reserves its layout slot to avoid CLS on a status change
  (`fe-component:reserved-badge-slot`) and exposes an accessible name reflecting online/offline/
  unavailable (not colour alone).
- The pairing-code region is an ARIA live region announced on state change
  (`fe-component:a11y-live-region`); destructive triggers (unpair/revoke) return focus after an
  in-flight action (`fe-component:modal-focus-return`).
- "Synced N ago" renders via a relative-time pipe, never `toFixed` (`fe-component:kpi-decimal-format`).
- Danger (unpair/revoke) and warning (offline) meet WCAG AA contrast against `surface` in both themes;
  offline is distinguishable from online by shape/label, not colour alone.
