# FE-CONV-003 -- provideConv() — HTTP/Mock adapter selector, TREE_SNAPSHOT_PORT, AUDIO_ASSET_PORT, USAGE_SIGNAL_PORT InjectionTokens

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-04 §1–2, SPEC-05 §3, generator-config.yml §adapter_default §ports

## Outcome
`provideConv({ adapter, flags })` is defined: default `adapter: 'http'` (conv-service is published at M1.5; carry-forward `scaffold:mock-adapter-default` pitfall). It wires `TREE_SNAPSHOT_PORT → TreeSnapshotHttpAdapter`, `AUDIO_ASSET_PORT → AudioAssetHttpAdapter`, `USAGE_SIGNAL_PORT → UsageSignalHttpAdapter` (or their Mock counterparts). The `NAVIGATION_INTENT_PORT` defaults to `NoOpNavigationIntentPort` (host overrides at boot). A providers spec proves the default resolves to HTTP adapters.

## Approach (execution path)
1. Create `frontend/libs/conv/src/lib/conv.providers.ts`.
2. Define `CONV_ADAPTER_OPTIONS` type: `{ adapter?: 'http' | 'mock'; flags?: Record<string, boolean> }`.
3. Implement `provideConv(opts: CONV_ADAPTER_OPTIONS = {}): EnvironmentProviders` — defaults `adapter` to `'http'`.
4. Wire three port tokens using `useClass` depending on adapter choice:
   - `TREE_SNAPSHOT_PORT → TreeSnapshotHttpAdapter` (or `TreeSnapshotMockAdapter`)
   - `AUDIO_ASSET_PORT → AudioAssetHttpAdapter` (or `AudioAssetMockAdapter`)
   - `USAGE_SIGNAL_PORT → UsageSignalHttpAdapter` (or `UsageSignalMockAdapter`)
5. Wire `NAVIGATION_INTENT_PORT → NoOpNavigationIntentPort` as the default; the Patient-Mode host overrides this token with the GEST-fed implementation at boot (INT-FE-CONV-1).
6. Provide `MODULE_FEATURE_FLAGS` merged with `opts.flags` overrides.
7. Add a providers spec: `provideConv()` → all three ports resolve to Http adapters; `provideConv({ adapter: 'mock' })` → all three resolve to Mock adapters.

**Pitfall (scaffold:mock-adapter-default, 7 occurrences):** `adapter` default is `'http'`, not `'mock'`. Mock adapters serve the same `<Wire>` shape via the same mappers (so switching default never bypasses a mapper test).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/src/lib/conv.providers.ts` created
- [ ] `provideConv({ adapter: 'http' })` — default adapter is `'http'` (not mock)
- [ ] `TREE_SNAPSHOT_PORT`, `AUDIO_ASSET_PORT`, `USAGE_SIGNAL_PORT` InjectionTokens defined and wired
- [ ] `NAVIGATION_INTENT_PORT` defaults to `NoOpNavigationIntentPort` (not null)
- [ ] Mock adapters serve same `<Wire>` shape via same mappers as HTTP adapters
- [ ] Providers spec asserts `provideConv()` → Http adapters (not Mock)
- [ ] `npx nx test conv` PASS
- [ ] `npx nx lint conv` PASS

## Acceptance criteria
- [ ] `provideConv()` default wires HTTP adapters — a spec test proves `inject(TREE_SNAPSHOT_PORT)` returns `TreeSnapshotHttpAdapter`
- [ ] `provideConv({ adapter: 'mock' })` wires Mock adapters for all three ports
- [ ] `NAVIGATION_INTENT_PORT` defaults to `NoOpNavigationIntentPort` (touch + switch-scan work without a host override)
- [ ] `npx nx test conv` PASS; `npx nx lint conv` PASS

## Dependencies
FE-CONV-004 (NAVIGATION_INTENT_PORT token + NoOpNavigationIntentPort).
FE-CONV-006 (TreeSnapshotHttpAdapter), FE-CONV-008 (AudioAssetHttpAdapter), FE-CONV-010 (UsageSignalHttpAdapter).

## Tenant-context impact
None — provideConv() is an app-level provider; tenant isolation is handled by the shared auth-session interceptor on egress.
