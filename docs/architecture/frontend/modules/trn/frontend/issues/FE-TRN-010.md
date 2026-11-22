# FE-TRN-010 -- Content adapter (HTTP + Mock) + ErasureAckWire mapper (erasure 202 Accepted with retired counts)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ContentHttpAdapter` and `ContentMockAdapter` implement `CONTENT_PORT` with a single erasure operation (`DELETE /trn/patients/{id}/content` → 202 Accepted with `ErasureAckWire`), and `toErasureResult` mapper surfaces the retired counts.

## Context / Problem statement
- SPEC-04 §1: single operation under `CONTENT_PORT` — DELETE erasure 202 Accepted with retired counts. Requires `trn.content.delete` authority.
- SPEC-07 §5: erasure is the only TRN flow that takes a modal (the erase confirmation dialog in FE-TRN-026 triggers this).
- 502 `audit-unavailable` on the erasure path maps to a governance-fact banner (error pipeline FE-TRN-025).
- Bloqueia: FE-TRN-013 (ContentFacade)

## Approach (execution path)
1. Create `models/wire/erasure-ack.wire.ts` with `ErasureAckWire` (erased_count, retired_count, patient_id).
2. Create `mappers/content.mapper.ts` with `toErasureResult(wire: ErasureAckWire)`.
3. Create `ports/content.port.ts` defining `ContentPort` + `CONTENT_PORT` token.
4. Create `adapters/content-http.adapter.ts`: `erase(patientId)` → `DELETE /trn/patients/{id}/content` → 202 Accepted; body carries ErasureAckWire.
5. Create `adapters/content-mock.adapter.ts` with fixture.

## Non-goals
- No erase confirmation modal here (FE-TRN-026).
- No erase affordance gating here (FE-TRN-005 / FE-TRN-025).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§1 — Content row)

## Architecture alignment
- 202 Accepted (non-blocking erasure); FE surfaces retired counts, never waits for a synchronous delete.
- Never gates on status before sending the DELETE (erasure is never blocked — INT-TRN-4).

## Implementation checklist (by layer/file)

- 🔲 `models/wire/erasure-ack.wire.ts` — ErasureAckWire
- 🔲 `mappers/content.mapper.ts` — toErasureResult
- 🔲 `ports/content.port.ts` — ContentPort + CONTENT_PORT token
- 🔲 `adapters/content-http.adapter.ts` — erase (DELETE 202)
- 🔲 `adapters/content-mock.adapter.ts` — fixture

**Tests**
- 🔲 Unit test: `toErasureResult` maps erased_count and retired_count
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- Adapter sends `DELETE /trn/patients/{id}/content` with caregiver bearer.
- 202 Accepted response body is deserialized via `ErasureAckWire` and mapped to domain.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-003 (provideTrn)

## Data impact
- None — read-only mapper; no local state.

## API / Contract impact
- `DELETE /trn/patients/{patientId}/content` (BE §7.1 — 202 Accepted).

## Testing / Evidence required
- Mapper unit test: erased/retired counts mapped correctly.

## Risks / Notes
- 502 `audit-unavailable` during erasure is treated as a failed governance fact, not as "erasure not done" (INT-TRN-4: erasure never blocked by HIST/CONV).
