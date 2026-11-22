# Asset-Driven UI (NeuroAssist NIV)

> Build UI as **reusable assets** instead of one-off screens.

Goal: ensure that every UI delivery produces **building blocks** that other modules
can reuse, instead of duplicating components.

---

## Definitions

- **Asset:** reusable building block (component, screen pattern, ApiService, contract)
  consumed by multiple modules.
- **Pattern:** reusable composition (wizard, smart table, approval widget, timeline).
  In NeuroAssist NIV, the 7 prototype patterns P1-P7 (`prototipo-padroes-telas`) already catalog
  the most common ones.
- **UI module:** domain-specific UI of a single module (`cad`, `com`, `fis`, ...).

---

## Decision rule: where to put it?

**Promote to `frontend/libs/shared/*` when:**
- it repeats across modules OR is likely to repeat
- it is domain-agnostic (does not talk about customer, NFe, inventory, etc.)
- it offers measurable acceleration (reduces future work)

**Keep in `frontend/libs/<modulo>/ui/` when:**
- it is domain-specific (forms, cards, lists of a specific domain)
- it depends on types / contracts of that module only

---

## UI composition model

- `frontend/apps/neuroassist-niv-web/` provides layout (topbar, sidebar, content slot, right panel)
  and global UX (loading, error, no-access).
- Modules render in the Content slot via `<router-outlet>` (lazy routes).
- Design tokens live in `theme.css` (`@theme`, oklch — Tailwind v4 CSS-first);
  see `standards/design-system-tokens.md`. Styling = Tailwind utilities + tokens.
- `@neuroassist/shared/ui-*` provides:
  - base components (CDK + Tailwind utilities: button, input, card, badge)
  - patterns (timeline, wizard, table, empty/loading/error states in `ui-feedback`)

---

## Performance expectations

- **Lazy-first:** modules do NOT bloat the critical bundle of `neuroassist-niv-web`.
- **Large lists:** virtual scroll (`@angular/cdk/scrolling`) or pagination required.
- **Avoid heavy work in templates:** push logic into services/facades.
- **Images:** lazy load + defined dimensions (avoids layout shift).

---

## Expected outputs (what "done" means)

- The module works end-to-end.
- Reusable pieces were promoted to `@neuroassist/shared/*`.
- Pattern used is documented (link to `prototipo-padroes-telas` if applicable).
- Lint, test and build are green (`nx lint <project>`, `nx test <project>`, `nx build <project>`).

---

## Standard mapping: prototype pattern → reusable asset

| Prototype pattern (P1-P7) | Equivalent asset in NeuroAssist NIV |
|---|---|
| P1 GenericCRUDScreen | `@neuroassist/shared/ui-components/generic-crud-page` (Tailwind utilities) |
| P2 Tabbed Detail | `@neuroassist/shared/ui-components/tabbed-detail-panel` |
| P3 ExpandableList | `@neuroassist/shared/ui-components/expandable-list` |
| P4 KPI + List | composition (`@neuroassist/shared/ui-components/kpi-grid` + `data-table`) |
| P5 Tree | `@angular/cdk/tree` + wrapper in `@neuroassist/shared/ui-components/tree-editor` |
| P6 Kanban | `@angular/cdk/drag-drop` + wrapper in `@neuroassist/shared/ui-components/kanban-board` |
| P7 PipelineEditor | CRM module-specific (`@neuroassist-niv/crm/feature-pipeline-editor`) |
