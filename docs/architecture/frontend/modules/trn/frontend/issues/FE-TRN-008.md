# FE-TRN-008 -- Consent adapters (HTTP + Mock) + wire mappers (ConsentWire, toDomain)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ConsentHttpAdapter` and `ConsentMockAdapter` implement `CONSENT_PORT` with three operations (create, getByPatient, revoke), with `ConsentWire` mirroring BE JSON and `toConsentVM` mapper producing `ConsentVM`.

## Context / Problem statement
- SPEC-04 §1: `POST /trn/consents` (trn.consent.create), `GET /trn/patients/{id}/consent` (trn.consent.read), `POST /trn/consents/{id}/revocation` (trn.consent.revoke).
- `ConsentVM` has `status: 'granted' | 'revoked' | 'none'`, `grantedByPatient`, `grantedByRepresentative`, `representativeRef`.
- 422 `incomplete-consent` and 409 `consent-required` errors are handled at the error-handler level, not in the adapter.
- Bloqueia: FE-TRN-013 (ConsentFacade)

## Approach (execution path)
1. Create `models/wire/consent.wire.ts` with `ConsentWire` (status, granted_by_patient, granted_by_representative, representative_ref).
2. Create `mappers/consent.mapper.ts` with `toConsentVM` deriving `grantedByPatient`, `grantedByRepresentative`.
3. Create `ports/consent.port.ts` defining `ConsentPort` + `CONSENT_PORT` token.
4. Create `adapters/consent-http.adapter.ts` with the three operations.
5. Create `adapters/consent-mock.adapter.ts` with fixture + same mapper.

## Non-goals
- No consent-capture UI here (FE-TRN-016 / FE-TRN-025).
- 422/409 consent errors handled at error pipeline (FE-TRN-025).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§1 — Consent rows)

## Architecture alignment
- Base `${ACCESS_HTTP_BASE}/trn`; caregiver bearer only; no X-Tenant-Id

## Implementation checklist (by layer/file)

- 🔲 `models/wire/consent.wire.ts` — ConsentWire
- 🔲 `mappers/consent.mapper.ts` — toConsentVM
- 🔲 `ports/consent.port.ts` — ConsentPort + CONSENT_PORT token
- 🔲 `adapters/consent-http.adapter.ts` — 3 operations
- 🔲 `adapters/consent-mock.adapter.ts` — fixture + mapper

**Tests**
- 🔲 Mapper unit test: status 'granted' maps correctly
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- Adapter POSTs to `/trn/consents` with caregiver bearer (no patient-session token).
- `toConsentVM` maps `status`, `grantedByPatient`, `grantedByRepresentative` correctly.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-005 (ConsentVM type)
- FE-TRN-003 (provideTrn)

## Data impact
- None — read-only mapper.

## API / Contract impact
- Consumes `POST /trn/consents`, `GET /trn/patients/{id}/consent`, `POST /trn/consents/{id}/revocation` (BE §5.1–§5.3).

## Testing / Evidence required
- Mapper unit test output.

## Risks / Notes
- Revoking consent is never blocked (INT-TRN-4 BE invariant); the adapter must not gate on status before POSTing revocation.
