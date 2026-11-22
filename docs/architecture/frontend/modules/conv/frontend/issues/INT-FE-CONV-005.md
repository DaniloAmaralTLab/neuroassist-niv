# INT-FE-CONV-005 -- shared/access-decision stub — conv.tree.read / conv.audio.read / conv.usage.record authority checks deferred, Wave-0 stub, PLATFORM routeGuards ledger

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

**SPEC refs:** SPEC-05 §4 (authorities), SPEC-01 §4 (guard carry-forward), contracts/backend-api-cross-link.md §3 (open items — shared/access-decision stub)

**Owner:** PLATFORM team (implements the shared access-decision service); CONV team (plugs in the real check when PLATFORM ships it).

## Outcome
`@neuroassist/shared/access-decision` provides a `can(authority: string): boolean` function that CONV's `patientSessionGuard` and `UsageSignalService` can call. Wave-0 stub returns `true` for all CONV authorities (permissive-safe as long as the patient-session bearer is enforced by the interceptor at the network layer). When PLATFORM ships the real implementation, the stub is replaced and CONV guards tighten automatically.

**Open item from contracts/backend-api-cross-link.md §3:** This stub must be explicitly replaced before the product goes to production. It is tracked in the PLATFORM routeGuards ledger.

## Approach (execution path)
1. Create `libs/shared/access-decision/src/lib/access-decision.stub.ts` (if not already present in shared):
   - `export function can(authority: string): boolean { return true; }` — Wave-0 stub.
   - Annotate with `/** @todo PLATFORM: replace with real authority check from patient-session token (D-NNN) */`.
2. In `patientSessionGuard` (FE-CONV-018): import `can` from `@neuroassist/shared/access-decision`. Add `// TODO[platform]: fine-grained can('conv.tree.read') deferred to PLATFORM routeGuards (INT-FE-CONV-005)`.
3. In `UsageSignalService.enqueue()` (FE-CONV-010): import `can` and call `can('conv.usage.record')` as the authority gate (currently returns true for all; will tighten when PLATFORM ships).
4. The stub is explicitly NOT hardcoding the authorities from `conv.contract.ts` — it is a universal pass-through. The PLATFORM team will replace it with an implementation that reads the patient-session JWT claims.
5. Unit test: `can('conv.tree.read')` → true (stub); document that the test must be updated when stub is replaced.

## Implementation checklist (by layer/file)
- [ ] `libs/shared/access-decision/src/lib/access-decision.stub.ts` created with Wave-0 permissive stub
- [ ] Stub has `@todo PLATFORM: replace with real authority check` annotation
- [ ] `patientSessionGuard` imports `can` and has TODO[platform] comment at the fine-grained check site
- [ ] `UsageSignalService.enqueue()` gates on `can('conv.usage.record')` (stub today, real authority check when PLATFORM ships)
- [ ] PLATFORM routeGuards ledger entry created (issue in PLATFORM backlog tracking this replacement)
- [ ] `npx nx test conv-access` PASS — authority gate with stub returns true
- [ ] `npx nx lint conv-access` PASS

## Acceptance criteria
- [ ] `can('conv.tree.read')` returns `true` with the Wave-0 stub (no network call, no JWT parsing)
- [ ] `patientSessionGuard` has an explicit TODO[platform] comment at the fine-grained check site
- [ ] `UsageSignalService.enqueue()` calls `can('conv.usage.record')` before enqueuing
- [ ] `npx nx test conv-access` PASS; `npx nx lint conv-access` PASS

## Open items / risks
- **RISK:** stub is permissive by design; must be replaced before production. If PLATFORM delays, CONV's fine-grained authority enforcement is absent at the FE layer. Mitigation: the interceptor enforces the patient-session bearer at the network layer regardless; the stub only affects UX-layer checks (e.g., enqueue gate).
- **RISK G1:** Patient-Mode host undecided. If the host does not use `@neuroassist/shared/access-decision`, the guard integration must be revisited.

## Dependencies
FE-CONV-018 (patientSessionGuard — plugs in `can()` call with TODO comment).
FE-CONV-010 (UsageSignalService — plugs in `can('conv.usage.record')` gate).

## Tenant-context impact
The real authority check (when PLATFORM ships) will read claims from the patient-session JWT, which is tenant-scoped. No cross-tenant authority bleed is possible through the stub at the network layer.
