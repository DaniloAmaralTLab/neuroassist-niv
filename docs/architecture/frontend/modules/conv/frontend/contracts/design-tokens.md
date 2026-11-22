# Design Tokens — conv (CONV) Frontend

> CONV introduces **no new token**. It consumes `@neuroassist/shared/ui-tokens` (Tailwind v4 oklch, dark
> default) like every NIV module, and maps its runtime states to the **existing** semantic token families.
> This file records only that mapping, so the calm, accessible patient surface is unambiguous. Tokens are
> owned by shared ADR-005 (design tokens); CONV references them. Accessibility for ALS/MND (large targets,
> high contrast, low cognitive load) is a hard constraint (doc 02 §5, ADR-007).

## 1. Runtime state → semantic token family

| State (SPEC-03 `TreeState` / SPEC-07) | Token family | Intent | Note |
|---|---|---|---|
| `ready` (live tree) | base surface / `--color-ink` | calm default | the daily surface; no status scream |
| selected phrase | `--color-brand` / `--color-brand-subtle` | the chosen node | large, high-contrast tile |
| `offline-stale` marker | `--color-info` (subtle) | "offline — last synced vX" | an **inline marker**, not an error |
| `cold` loading | `--color-ink-faint` | bounded loading | never an infinite spinner |
| `empty` (cold-empty) | `--color-ink-soft` on base surface | "not yet synced on this station" | honest, calm; never a blank speaking surface |
| session-ended (401) / setup-issue (403) | `--color-warning` (muted) | calm inline banner | "ask your caregiver"; **never** a modal, never `--color-alarm` |
| audio `tts-fallback` / `text-only` | `--color-ink` (large text) | honest fallback | the phrase rendered LARGE; honest cached-vs-fallback indicator |
| active channel badge | `--color-info` / `--color-brand` | touch / gesture / scan | `ChannelBadge`; no channel privileged |

## 2. Rules

- **The emergency palette (`--color-alarm`) is never applied by CONV.** CONV generates no alarm and never
  takes over the patient's viewport (the only product takeover is EVNT's emergency alarm, which CONV does not
  render). Session-ended / setup-issue / offline states stay in the `--color-warning` / `--color-info`
  families — "attention", not "emergency".
- **Fail-safe audio is visible, never silent.** The `TtsPlayer` shows an honest `cached` vs `tts-fallback` vs
  `text-only` indicator; a `text-only` phrase is rendered at a large type scale so the patient still "speaks".
- **Large targets.** Node tiles meet the ALS/MND large-target minimum; switch-scan dwell/scan timing is
  host/profile-configurable (ADR-007) and the scan cursor uses `--color-brand` for a high-contrast focus ring.
- Dark-default theming and the oklch palette are inherited unchanged from `@neuroassist/shared/ui-tokens`;
  CONV adds no `:root` override.
