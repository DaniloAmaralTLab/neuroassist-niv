# FE-ACS-012 -- CaregiverTableComponent + CaregiverRowComponent + PatientLinksCellComponent (presentational)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

## Outcome
Three presentational components are promoted from the design-reference prototype: `CaregiverTableComponent` (renders the roster; inputs `rows` and `canRegister`; outputs `roleEdit` and `deactivate`), `CaregiverRowComponent` (single row; re-emits outputs), and `PatientLinksCellComponent` (input `links: PatientLinkVM[]`); all are standalone, OnPush, and hold no `HttpClient` (SPEC-02 §1).

## Approach (execution path)
1. Promote the prototype's caregiver table HTML into `CaregiverTableComponent` with `input()` and `output()` signals.
2. `rows: input<CaregiverRowVM[]>()`, `canRegister: input<boolean>()`.
3. Outputs: `roleEdit = output<{ caregiverId: string; role: CaregiverRole }>()`, `deactivate = output<string>()`.
4. `CaregiverRowComponent`: receives a single `row: input<CaregiverRowVM>()` and re-emits `roleEdit` / `deactivate`.
5. `PatientLinksCellComponent`: receives `links: input<PatientLinkVM[]>()` — renders badge count or link list.
6. Accessible names on all interactive controls: role select carries `aria-label` or `<label for>` (carry-forward `fe-component:a11y-select-name`).
7. Styling via Tailwind v4 utilities + oklch tokens from `@neuroassist/shared/ui-tokens`; no hardcoded colour/spacing.
8. No inline role evaluation (`accessDecision.can` is passed as a boolean input from the smart component, never called inside presentational components).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/caregiver-table.component.ts`
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/caregiver-row.component.ts`
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/patient-links-cell.component.ts`
- [ ] All three: `standalone: true`, `changeDetection: OnPush`
- [ ] No `HttpClient` or `Facade` injected in any of these components
- [ ] Role select (if any) has an accessible name (`aria-label` or `<label for>`)
- [ ] No hardcoded colour/spacing — only Tailwind utilities + token vars
- [ ] `npx nx test acs-feature-caregivers` PASS
- [ ] `npx nx lint acs-feature-caregivers` PASS

## Acceptance criteria
- [ ] `CaregiverTableComponent` accepts `rows` and `canRegister` inputs; emits `roleEdit` and `deactivate` outputs
- [ ] `PatientLinksCellComponent` renders a list from `links: PatientLinkVM[]` input
- [ ] All `<select>` / `<input>` elements have accessible names (axe check passes)
- [ ] `npx nx build acs-feature-caregivers` PASS

## Dependencies
FE-ACS-011 (CaregiverListPageComponent consumes these components).

## Tenant-context impact
None — presentational; all data passed via inputs.

## Prioridade
P3
