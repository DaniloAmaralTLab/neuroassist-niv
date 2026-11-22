# FE-PAT-028 -- A11y audit + performance budget (WCAG AA, urgency/sensitivity a11y, focus return, Tailwind/oklch tokens)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
PAT FE templates pass WCAG AA: all interactive controls have accessible names, focus returns to the triggering row after editor close, duration values use locale-aware formatting, and no hardcoded colour/spacing escapes the Tailwind/oklch token system.

## Approach (execution path)
1. Audit `command-catalog-page.component.html`, `command-editor-panel.component.html`, and `patient-registration-form.component.html` against SPEC-02 §3 carry-forwards.
2. `a11y-select-name`: verify urgency and sensitivity `<select>` elements carry `<label for>` or `aria-label`.
3. `modal-focus-return`: verify editor panel close / retire modal cancel / confirm returns focus to the triggering `CommandRowComponent`.
4. `kpi-decimal-format`: replace any `toFixed(N)` with `Intl.NumberFormat` for duration display.
5. Run `axe-playwright` or `@axe-core/playwright` on the catalog page and editor — zero violations at AA level.
6. Performance: confirm lazy-load split is in place (no PAT components in the shell main bundle) using `nx build --stats-json` and inspecting the bundle.

## Implementation checklist (by layer/file)
- [ ] Audit e corrigir `libs/pat/feature-command-catalog/src/lib/command-catalog-page/command-catalog-page.component.html`
- [ ] Audit e corrigir `libs/pat/feature-command-catalog/src/lib/command-editor/command-editor-panel.component.html`
- [ ] Audit e corrigir `libs/pat/feature-patient-registry/src/lib/patient-registration-form/patient-registration-form.component.html`
- [ ] Verificar bundle split (pat feature not in shell main bundle)
- [ ] `npx nx build neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] Zero WCAG AA axe violations on catalog page and editor panel.
- [ ] All `<select>` controls in PAT carry an accessible name (`fe-component:a11y-select-name`).
- [ ] No `toFixed` in PAT templates; duration values use `Intl.NumberFormat`.
- [ ] PAT feature components are not in the shell initial bundle (lazy-load verified).

## Dependencies
FE-PAT-012 to FE-PAT-017 (all feature components must exist before audit).

## Tenant-context impact
Nenhum (a11y and performance budget are independent of tenant context).

## Prioridade
P9
