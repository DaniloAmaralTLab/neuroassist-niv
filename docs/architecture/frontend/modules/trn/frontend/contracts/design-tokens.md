# Design Tokens — trn (TRN) Frontend

> TRN introduces **no new token**. It consumes `@neuroassist/shared/ui-tokens` (Tailwind v4 oklch, dark
> default) like every NIV module, and maps its runtime states to the **existing** semantic token families.
> This file records only that mapping. Tokens are owned by shared ADR-005 (design tokens); TRN references
> them. The assisted patient-assent surface (Screen 09) carries the same ALS/MND accessibility constraints
> as CONV (large targets, high contrast, switch-scan focus), because the patient operates it in session.

## 1. Runtime state → semantic token family

| State (SPEC-03 / SPEC-07) | Token family | Intent | Note |
|---|---|---|---|
| training surface (active session) | base surface / `--color-ink` | calm default | the caregiver authoring workspace |
| "Training — not the patient app" badge (TECH-007) | `--color-info` | persistent orientation | distinguishes authoring from the CONV runtime |
| selected / dual-confirm ✓ node | `--color-brand` / `--color-brand-subtle` | the chosen / approved node | large, high-contrast tile |
| caregiver ✓ / patient ⏳ indicator | `--color-info` (pending) / `--color-success` (done) | dual-confirm status | honest per-half indicator |
| pending-synth | `--color-info` (subtle) | "waiting on synthesis" | a **state**, not an error |
| published (active in CONV) | `--color-success` | terminal success | shows `convVersionId` |
| llm-unavailable (503) error | `--color-warning` (muted) | calm inline error + retry | drafts preserved; never `--color-alarm` |
| session-ended (401) / missing-permission (403) | `--color-warning` (muted) | calm inline banner | "ask your admin"; never a modal |
| same-actor / not-approved / incomplete-consent | `--color-warning` | calm banner | governance refusals, not emergencies |
| erase confirmation (destructive) | `--color-danger` | the **only** TRN modal | irreversible `trn.content.delete` |
| audio `tts-fallback` / `text-only` | `--color-ink` (large text) | honest fallback | phrase rendered LARGE; honest preview-vs-fallback indicator |
| active channel badge (assent surface) | `--color-info` / `--color-brand` | touch / gesture / switch-scan | `ChannelBadge`; no channel privileged |

## 2. Rules

- **The emergency palette (`--color-alarm`) is never applied by TRN.** TRN generates no alarm and never takes
  over the patient's viewport (the only product takeover is EVNT's emergency alarm, which TRN does not render).
  Vendor-outage / pending-synth / governance-refusal states stay in the `--color-warning` / `--color-info`
  families — "attention", not "emergency". The **sole** TRN modal is the destructive erase confirmation
  (`--color-danger`).
- **Fail-safe preview is visible, never silent.** The `AudioPreviewButton` shows an honest `be-clip` vs
  `tts-fallback` vs `text-only` indicator; a `text-only` phrase is rendered at a large type scale.
- **Large targets on the assent surface.** Screen 09 node tiles meet the ALS/MND large-target minimum;
  switch-scan dwell/scan timing is host/profile-configurable (ADR-007, reused from CONV) and the scan cursor
  uses `--color-brand` for a high-contrast focus ring.
- Dark-default theming and the oklch palette are inherited unchanged from `@neuroassist/shared/ui-tokens`; TRN
  adds no `:root` override.
