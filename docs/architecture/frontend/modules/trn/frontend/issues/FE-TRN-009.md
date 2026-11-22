# FE-TRN-009 -- Publication adapters (HTTP + Mock) + wire mappers + 202 Accepted polling loop (pending → published | failed)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`PublicationHttpAdapter` and `PublicationMockAdapter` implement `PUBLICATION_PORT` with two operations (create returning 202 Accepted, poll by ID), with `PublicationWire` mirroring BE JSON and a polling helper that retries `GET /trn/publications/{id}` until `pending → published | failed`.

## Context / Problem statement
- SPEC-04 §1: `POST /trn/proposals/{id}/publication` returns `202 Accepted`; FE then polls `GET /trn/publications/{id}` for `pending → published | failed`.
- Publication is never optimistic — the node is shown `published` only after a service-confirmed `publication.status = published` (SPEC-04 §4).
- ElevenLabs delay may keep status `pending` for a long time — the FE surfaces `pending-synth` state, never fakes `published` (SPEC-03 §2, SPEC-07 §4).
- Bloqueia: FE-TRN-013 (PublicationFacade)

## Approach (execution path)
1. Create `models/wire/publication.wire.ts` with `PublicationWire` (publicationId, approvalId, status, convVersionId, lastError).
2. Create `mappers/publication.mapper.ts` with `toPublicationVM`.
3. Create `ports/publication.port.ts` defining `PublicationPort` + `PUBLICATION_PORT` token.
4. Create `adapters/publication-http.adapter.ts`: `create(proposalId)` → `POST .../publication` → returns `202` with `Location` header; `pollUntilSettled(publicationId)` → `GET /trn/publications/{id}` with exponential backoff until `status !== 'pending'`; stops on `failed`.
5. Create `adapters/publication-mock.adapter.ts` with controllable fixture (can simulate `pending → published` sequence).

## Non-goals
- No PublicationFacade here (FE-TRN-013).
- No `published` status reported before service confirmation (never optimistic).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§1, §4)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§2 pending-synth)

## Architecture alignment
- Never optimistic publication: show `published` only on service confirmation
- Polling is adapter-level; facade decides when to initiate polling

## Implementation checklist (by layer/file)

- 🔲 `models/wire/publication.wire.ts` — PublicationWire
- 🔲 `mappers/publication.mapper.ts` — toPublicationVM
- 🔲 `ports/publication.port.ts` — PublicationPort + PUBLICATION_PORT token
- 🔲 `adapters/publication-http.adapter.ts` — create (202) + pollUntilSettled (exponential backoff)
- 🔲 `adapters/publication-mock.adapter.ts` — controllable fixture

**Tests**
- 🔲 Unit test: polling stops when status becomes `published` or `failed`
- 🔲 Unit test: polling never reports `published` until service confirms it
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `create()` POSTs to `/trn/proposals/{id}/publication`; response body is 202 Accepted.
- `pollUntilSettled()` stops polling once `status !== 'pending'`.
- Neither adapter ever maps a `pending` status to `published` or `indexed` in the output.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-005 (PublicationVM type)
- FE-TRN-003 (provideTrn)

## Data impact
- None — read-only mapper; no local state.

## API / Contract impact
- `POST /trn/proposals/{id}/publication` (§6.1 202 Accepted); `GET /trn/publications/{id}` (§6.2).

## Testing / Evidence required
- Unit test: polling mock sequence `pending → published` verified.

## Risks / Notes
- `409 consent-required` on POST publication is mapped by the error handler (FE-TRN-025), not here.
- 409 `not-approved` similarly mapped at the error pipeline.
