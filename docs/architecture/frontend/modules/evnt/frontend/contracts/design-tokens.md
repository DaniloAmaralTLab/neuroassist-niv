# Design Tokens — evnt (EVNT) Frontend

> EVNT consumes the project design system; it defines no new tokens. Canonical standard:
> `../../../../standards/design-system-tokens.md` (Tailwind v4 CSS-first + oklch, dark default).
> This file records only the EVNT-specific token usage and a11y constraints. EVNT owns the product's
> **highest-stakes** surface (the full-bleed emergency takeover) — its token use is about being
> **unmissable and accessible**, never a hardcoded red.

## 1. Token source

Components style via Tailwind v4 utilities bound to the oklch tokens from
`@neuroassist/shared/ui-tokens` (`theme.css` vendored into `apps/neuroassist-niv-web`). No hardcoded
hex/rgb, no hardcoded spacing. Dark is the default theme; `[data-theme="light"]` overrides the same
token names. Icons via Material Symbols (self-hosted `@font-face`).

## 2. EVNT token usage map

| EVNT element | Tokens / utilities |
|---|---|
| **Emergency takeover** (full-bleed `/alarm`) | `bg-[--color-alarm]` full-bleed, `text-[--color-alarm-ink]` — the single, dedicated alarm token, **never** a hardcoded red and never reused for routine/warning |
| Takeover subject text ("{patient} needs help", command label, "detected at 14:32") | `text-alarm-ink`, large type scale; high contrast on `--color-alarm` (WCAG AA both themes) |
| Acknowledge button (the single act) | `bg-alarm-ink` / `text-alarm` inversion for maximum contrast; large hit target; focus ring visible on the alarm bg |
| Acknowledged confirmation (transient) | `--color-success` family (`bg-success-soft`, `text-success-ink`) |
| No-active-emergency empty state | `bg-surface`, `text-ink-soft` — calm neutral; **never** styled as an alarm |
| **Monitoring-limitation banner** (SAFETY: offline/paused/stale) | `--color-warning` / amber family — a **warning**, distinct from the `--color-alarm` emergency and from the success all-clear; always visible, never silent |
| Routine notice card / topbar indicator | `bg-surface-2`, `text-ink`, `--color-brand` accent — discreet, noticed-not-alarming (§3.2.E) |
| "Mark not real" (feedback) action | `--color-ink-soft` secondary action; never a destructive-danger styling (it is a verdict, not a deletion) |

> `--color-alarm` is **reserved** for the emergency takeover. The EDGE offline badge uses `--color-warning`
> (amber) and **never** `--color-alarm` — an offline device is not an alarm (EDGE design-tokens §2, doc
> 02 §2). EVNT is the only module that raises `--color-alarm`.

## 3. Accessibility constraints (carry-forwards)

- The emergency takeover is an ARIA `alertdialog` with an accessible name reflecting the patient + the
  request, announced on appearance (`fe-component:a11y-live-region`); the acknowledge button receives
  focus on takeover and focus returns to the prior context after a successful confirm
  (`fe-component:modal-focus-return`).
- The alarm is signalled by **text + icon + motion**, not colour alone — it stays unmissable for a
  caregiver with colour-vision deficiency, and meets WCAG AA contrast against `--color-alarm` in both
  themes.
- The **monitoring-limitation banner** is a persistent, programmatically-associated status region
  (`role="status"`/`aria-live="polite"`) so the SAFETY limitation is announced, never silent
  (SPEC-04 §5, mandate).
- "detected at 14:32" / "confirmed at 14:33" render via a time-format pipe, never `toFixed`
  (`fe-component:kpi-decimal-format`).
- Any audio cue (SPEC-04 §5.5) respects reduced-motion/aria preferences and is paired with the visual
  alarm (never audio-only), and degrades silently where autoplay is blocked.
