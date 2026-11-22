# FE-HIST-005 -- Shell fallback descriptor — tool-descriptors.ts static hist entry

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-06 §1, generator-config.yml §shell_surfaces

## Outcome
The shell `tool-descriptors.ts` carries the static HIST fallback descriptor so the History destination is discoverable before the lazy chunk resolves, without duplicate entries once `@neuroassist/hist` loads.

## Approach (execution path)
1. Add an entry to `tool-descriptors.ts`: `{ key: 'hist', title: 'History', icon: 'history', section: 'care', order: 40, route: '/history', requires: 'hist.history.read' }`.
2. The live `MODULE_MENU_METADATA` (FE-HIST-001) supersedes this fallback once the lazy chunk loads — SPEC-06 §1.
3. Verify no duplicate 'hist' entry is created when both fallback and live metadata coexist.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/neuroassist-niv-web/src/app/config/tool-descriptors.ts`
- [ ] Entry `{ key: 'hist', title: 'History', icon: 'history', section: 'care', order: 40, route: '/history', requires: 'hist.history.read' }`
- [ ] No duplicate History destination after lazy load
- [ ] `npx nx build neuroassist-niv-web` PASS
- [ ] `npx nx lint neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] `npx nx build neuroassist-niv-web` PASS
- [ ] `npx nx lint neuroassist-niv-web` PASS
- [ ] Shell navigator shows exactly one History entry

## Dependencies
FE-HIST-001 (MODULE_MENU_METADATA — supersedes this fallback).

## Tenant-context impact
Nenhum.

## Prioridade
P1
