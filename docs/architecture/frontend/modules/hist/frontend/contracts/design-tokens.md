# HIST — Design Tokens (FE)

> HIST consumes the platform tokens from `@neuroassist/shared/ui-tokens` (oklch, **dark default**, doc 01
> §6). It defines **no** new global token. This file records only the **token intents** HIST relies on and
> the one safety-specific rule for the SAFETY-GEST-1 surfaces. No hardcoded colours anywhere (doc 01 §6).

## 1. Token intents used (from `@neuroassist/shared/ui-tokens`)

| Intent | Token family | HIST usage |
|---|---|---|
| Surface / card | `--color-surface`, `--color-surface-2` | history page, event cards, summary card (prototype `ds-card`) |
| Ink / text | `--color-ink`, `--color-ink-soft`, `--color-ink-faint` | titles, timestamps, secondary labels |
| Urgency — emergency | `--color-danger` (badge tone `er`) | event `urgency='emergency'` badge only (a **past** event's urgency, not a live alarm) |
| Urgency — routine | `--color-neutral` (badge tone `nf`) | event `urgency='routine'` badge |
| Feedback — real | `--color-success` (badge tone `ok`) | "Marked real" outcome badge |
| Feedback — false positive | `--color-muted` (badge tone `mu`) | "False positive" outcome badge |
| Confirmation pending | `--color-warning` | "Not yet confirmed" line (prototype `text-warning-ink`) |

## 2. Safety surfaces — informational, NEVER emergency (SAFETY-GEST-1)

- The escalation and detection-lapse rows (`kind='escalation' | 'detection-lapse'`, `isSafetySurface=true`)
  use the **`--color-info` / neutral informational** family — **never** `--color-alarm` (the emergency
  takeover colour EVNT owns). HIST is a calm historical read; a past escalation or a resolved detection
  lapse must never read as a live emergency (doc 01 §1, doc 06 R4, SPEC-02 §2). This is the one HIST-specific
  design constraint beyond the shared tokens.

## 3. Dark default + no hardcoded colour

- Dark is the default theme (doc 01 §6); every colour is a token reference, never a literal hex/oklch in a
  HIST component. Tailwind v4 utilities bind to the oklch tokens; HIST adds no palette of its own.
