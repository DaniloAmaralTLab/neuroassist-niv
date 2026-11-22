# Design Tokens — pat (PAT) Frontend

> PAT consumes the project design system; it defines no new tokens. Canonical standard:
> `../../../../standards/design-system-tokens.md` (Tailwind v4 CSS-first + oklch, dark default).
> This file records only the PAT-specific token usage and a11y constraints.

## 1. Token source

Components style via Tailwind v4 utilities bound to the oklch tokens from
`@neuroassist/shared/ui-tokens` (`theme.css` vendored into `apps/neuroassist-niv-web`). No hardcoded
hex/rgb, no hardcoded spacing. Dark is the default theme; `[data-theme="light"]` overrides the same
token names. Icons via Material Symbols (self-hosted `@font-face`); the module icon is `tune`.

## 2. PAT token usage map

| PAT element | Tokens / utilities |
|---|---|
| Surfaces (catalog list, editor panel) | `bg-surface`, `bg-surface-2`, `rounded-card`, `shadow-card` |
| Text | `text-ink`, `text-ink-soft`, `text-ink-faint` |
| Primary actions (New command, Save) | `bg-brand`, `text-brand-ink`, `hover:bg-brand-strong` |
| Urgency badge — emergency | `--color-danger` family (`bg-danger`, `text-danger-ink`) — high contrast |
| Urgency badge — routine | `--color-info` family (`bg-info-soft`, `text-info-ink`) |
| Sensitivity chip (low/medium/high) | `bg-surface-2` + `text-ink-soft`; no colour-only encoding (label present) |
| Retire (destructive) action | `--color-danger` family; confirm modal before retire |
| Live-test states (idle/testing/success/error) | `ink-faint` / `info` / `success` / `danger` — copy stays honest ("camera active", not "recognized") |
| Duration window controls | `bg-field`, `border-field-line`; invalid (min ≥ max) → `border-danger` |
| Fields (label / registration) | `bg-field`, `border-field-line`; field error → `text-danger` + `border-danger` |

## 3. Accessibility constraints (carry-forwards)

- Every `<select>` (urgency, sensitivity, gesture type) carries an accessible name
  (`fe-component:a11y-select-name`).
- The editor save/retire trigger returns focus to the triggering row after an in-flight action
  (`fe-component:modal-focus-return`); it is disabled while the request is in flight.
- Duration values render via a locale-aware number pipe, never `toFixed`
  (`fe-component:kpi-decimal-format`).
- Urgency is never encoded by colour alone — each badge carries its text label (`emergency` /
  `routine`) for colour-blind and screen-reader users.
- Danger (emergency badge, retire) meets WCAG AA contrast against `surface` in both themes.
