# INT-FE-CONV-003 -- shared/error-model CONV type slugs — register ProblemDetail.type slugs for CONV, AppError factory, copy map

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

**SPEC refs:** SPEC-07 §2, generator-config.yml §error_handling

**Owner:** CONV team (adds CONV slugs to the shared error model); coordination with shared/error-model maintainer.

## Outcome
The four CONV ProblemDetail.type slugs from SPEC-07 §2 are registered in `@neuroassist/shared/error-model`: `urn:neuroassist:conv:tree-not-found`, `urn:neuroassist:conv:audio-not-found`, `urn:neuroassist:conv:usage-invalid`, `urn:neuroassist:conv:session-revoked`. An `AppError` factory maps each slug to a surface copy string. `SpeechTreeFacade` and `AudioPlaybackService` use the factory to produce typed errors; `SpeechTreeNavigatorComponent` reads `AppError.copyKey` to pick the UI string.

## Approach (execution path)
1. In `@neuroassist/shared/error-model` (or CONV's own `libs/conv/data-access/src/lib/conv-error.map.ts` if the shared model is not extensible):
   - Define `ConvErrorSlug` as a union of the four slugs.
   - `convErrorCopyMap: Record<ConvErrorSlug, string>` — UI copy per slug.
   - `fromProblemDetail(type: string): ConvErrorSlug | 'unknown'` — slug matcher.
2. In `TreeSnapshotHttpAdapter` (FE-CONV-006): on 404 → `fromProblemDetail('urn:neuroassist:conv:tree-not-found')` → `AppError.treeNotFound`.
3. In `AudioAssetHttpAdapter` (FE-CONV-008): on 404 → `AppError.audioNotFound`.
4. In `UsageSignalHttpAdapter` (FE-CONV-010): on 400 `validation-error` → `AppError.usageInvalid` (discard, no surface).
5. In `SpeechTreeNavigatorComponent` (FE-CONV-020): `errorState.copyKey` lookup in `convErrorCopyMap` → show the banner copy.
6. Unit test: `fromProblemDetail('urn:neuroassist:conv:session-revoked')` → returns `'session-revoked'`; unknown slug → `'unknown'` (never throws).

## Implementation checklist (by layer/file)
- [ ] `libs/conv/data-access/src/lib/conv-error.map.ts` (or shared/error-model extension) — 4 CONV slugs
- [ ] `ConvErrorSlug` union type with all 4 URNs
- [ ] `convErrorCopyMap` with UI copy for each slug
- [ ] `fromProblemDetail()` returns `ConvErrorSlug | 'unknown'` (never throws for unknown slugs)
- [ ] HTTP adapters (FE-CONV-006, FE-CONV-008, FE-CONV-010) use `fromProblemDetail()` on error responses
- [ ] `SpeechTreeNavigatorComponent` (FE-CONV-020) reads `convErrorCopyMap[errorState.copyKey]` for banner text
- [ ] `npx nx test conv-data-access` PASS — all 4 slugs round-trip; unknown slug returns 'unknown'
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] All 4 CONV ProblemDetail.type slugs from SPEC-07 §2 are registered
- [ ] `fromProblemDetail()` never throws for unknown slugs (returns 'unknown')
- [ ] Error copy is driven by slug, never by HTTP status code
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-006 (TreeSnapshotHttpAdapter — uses error mapping).
FE-CONV-008 (AudioAssetHttpAdapter — uses error mapping).
FE-CONV-010 (UsageSignalHttpAdapter — 400 discard mapped via slug).
FE-CONV-020 (SpeechTreeNavigatorComponent — reads copy from map for error surfaces).

## Tenant-context impact
None — error slugs and copy are product-global, not tenant-specific.
