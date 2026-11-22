# Design Tokens — gest (GEST) Frontend

> GEST consumes the project design system; it defines no new tokens. Canonical standard:
> `../../../../standards/design-system-tokens.md` (Tailwind v4 CSS-first + oklch, dark default).
> GEST's UI footprint is thin — a near-headless runtime plus an on-station status surface — so this
> file records only GEST-specific token usage and a11y constraints. English-only (ADR-018).

## 1. Token source

Components style via Tailwind v4 utilities bound to the oklch tokens from
`@neuroassist/shared/ui-tokens` (`theme.css` vendored into the Patient-Mode host app). No hardcoded
hex/rgb, no hardcoded spacing. Dark is the default theme; `[data-theme="light"]` overrides the same
token names. Icons via Material Symbols (self-hosted `@font-face`).

## 2. GEST token usage map

| GEST element | Tokens / utilities |
|---|---|
| Station surfaces (runtime host, status page) | `bg-surface`, `bg-surface-2`, `rounded-card`, `shadow-card` |
| Text | `text-ink`, `text-ink-soft`, `text-ink-faint` |
| Detection **running** chip | `--color-success` family (`bg-success-soft`, `text-success-ink`) |
| Detection **degraded** chip | `--color-warning` / amber family — a warning state only |
| Detection **paused** overlay | `--color-warning` high-contrast banner; always visible, large type (operator glance) |
| Detection **unavailable** (camera denied / model failed) | `--color-ink-faint` neutral + explicit message — never a defaulted "watching" |
| Camera / model state chips | `success` on granted/ready; `warning` on requesting/loading; `ink-faint` on denied/no-device/failed |
| "Not yet detectable" command badge | `--color-warning` family — visibly marks a non-detectable command (INV-GEST-7), never hidden |
| Report queue — pending / sending | `--color-brand` for in-flight; `success` on sent |
| Report queue — **expired** item | `--color-danger` family — a dropped help request is high-salience (INV-GEST-5) |
| Station-unpaired blocking banner | `--color-danger` family — the station cannot report; re-pair in EDGE |
| Operator preview frame | `bg-field`, `border-field-line`; the `<video>` fills its slot, labelled "operator preview" |

## 3. Accessibility constraints (carry-forwards)

- The **detection-paused / degraded overlay** is an ARIA live region announced on state change
  (`fe-component:a11y-live-region`) and reserves its layout slot to avoid CLS
  (`fe-component:reserved-badge-slot`); detection state is distinguishable by shape/label, not colour
  alone.
- The **"not yet detectable"** badge carries an accessible name reflecting the unverified/unsupported
  reason, not colour alone.
- "Next retry in N" / "expires in N" render via a relative-time pipe, never `toFixed`
  (`fe-component:kpi-decimal-format`).
- Warning (degraded/paused) and danger (expired/unpaired) meet WCAG AA contrast against `surface` in
  both themes.
- The runtime overlay uses large, high-contrast type suitable for an at-a-glance station read by an
  operator who is not actively using the UI.
