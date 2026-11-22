# Design Tokens — acs (ACS) Frontend

> ACS consumes the project design system; it defines no new tokens. Canonical standard:
> `../../../../standards/design-system-tokens.md` (Tailwind v4 CSS-first + oklch, dark default).
> This file records only the ACS-specific token usage and a11y constraints.

## 1. Token source

Components style via Tailwind v4 utilities bound to the oklch tokens from
`@neuroassist/shared/ui-tokens` (`theme.css` vendored into `apps/neuroassist-niv-web`). No hardcoded
hex/rgb, no hardcoded spacing. Dark is the default theme; `[data-theme="light"]` overrides the same
token names. Icons via Material Symbols (self-hosted `@font-face`).

## 2. ACS token usage map

| ACS element | Tokens / utilities |
|---|---|
| Surfaces (lists, cards) | `bg-surface`, `bg-surface-2`, `rounded-card`, `shadow-card` |
| Text | `text-ink`, `text-ink-soft`, `text-ink-faint` |
| Primary actions (Register, Provision) | `bg-brand`, `text-brand-ink`, `hover:bg-brand-strong` |
| Destructive action (Revoke) | `--color-danger` family (`bg-danger`, `text-danger-ink`) — high-contrast, always visible (SEC-001) |
| Device-online badge | `--color-success` (online) / `--color-ink-faint` (offline) |
| Persistent-session warning | `--color-warning` family (banner/modal) |
| Status badges (active/revoked) | `success` (active) / `ink-faint` + `danger` (revoked) |
| Fields (register / wizard) | `bg-field`, `border-field-line` |

## 3. Accessibility constraints (carry-forwards)

- Every `<select>` (role) carries an accessible name (`fe-component:a11y-select-name`).
- The revoke/provision trigger returns focus after an in-flight action
  (`fe-component:modal-focus-return`); it is disabled while the request is in flight but regains
  focus on completion.
- Timestamps ("active since", `revokedAt`) render via a locale-aware date pipe, never `toFixed`
  (`fe-component:kpi-decimal-format`).
- Danger (revoke) meets WCAG AA contrast against `surface` in both themes.
