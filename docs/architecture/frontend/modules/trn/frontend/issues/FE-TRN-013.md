# FE-TRN-013 -- ConsentFacade + PublicationFacade + ContentFacade — consent gate state, capture, revoke; publication polling; erasure trigger

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
Three focused facades: `ConsentFacade` (reads consent gate + capture/revoke), `PublicationFacade` (triggers publication + drives the polling loop updating `PublicationVM` signals), and `ContentFacade` (triggers erasure + exposes retired counts signal) — each injecting their respective port and never touching `HttpClient` directly.

## Context / Problem statement
- SPEC-03 §1: `ConsentVM.status`, `PublicationVM.status` and the erasure result are all server-authoritative signals.
- `PublicationFacade` initiates polling once publication is triggered; it shows `pending-synth` while `publication.status === 'pending'`; never shows `published` before service confirms.
- `ConsentFacade.consentState()` feeds `ConsentGateBannerComponent` (FE-TRN-016).
- `ContentFacade.erase(patientId)` is called after the erase modal confirm (FE-TRN-026).
- Bloqueia: FE-TRN-016 (ConsentGateBannerComponent), FE-TRN-026 (erase modal)

## Approach (execution path)
1. `ConsentFacade`: signals `consentState = signal<ConsentVM | null>(null)`, `loadConsent(patientId)` → GET; `capture(payload)` → POST; `revoke(consentId)` → POST revocation.
2. `PublicationFacade`: `publicationStatus = signal<PublicationVM | null>(null)`; `publish(proposalId)` → POST 202 → start polling `pollUntilSettled(publicationId)` → update signal on each poll tick; stop when `settled`; never set `'published'` optimistically.
3. `ContentFacade`: `erasureResult = signal<ErasureResult | null>(null)`; `erase(patientId)` → DELETE 202 → update signal with retired counts.
4. All signals `.asReadonly()` exposed.

## Non-goals
- No consent capture UI here (FE-TRN-016).
- No publication affordance gating here (FE-TRN-005 / FE-TRN-025).

## Layer(s)
frontend / Data access (`libs/trn/src/lib/facades/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-03-view-models.md` (§2 pending-synth, ConsentVM, PublicationVM)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-04-data-access.md` (§1 Consent/Publication/Content rows)

## Architecture alignment
- Publication never optimistic (SPEC-04 §4)
- `pending-synth` is a state, not an error (SPEC-07 §4)
- Signals only; no Observables

## Implementation checklist (by layer/file)

- 🔲 `facades/consent.facade.ts` — consentState signal; loadConsent, capture, revoke
- 🔲 `facades/publication.facade.ts` — publicationStatus signal; publish (POST 202) + polling; never optimistic
- 🔲 `facades/content.facade.ts` — erasureResult signal; erase (DELETE 202)
- 🔲 Unit test: PublicationFacade — polling stops when status becomes `'published'`; never sets published before confirmation

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 2 / Data Access

## Labels
type:feature
layer:frontend
scope:trn
priority:P2

## Acceptance criteria
- `publicationStatus()` never reads as `'published'` until `PUBLICATION_PORT.pollUntilSettled` resolves to `'published'`.
- `ConsentFacade.revoke()` sends a request regardless of current consent status.
- All facade signals are `.asReadonly()`.

## Dependencies
- FE-TRN-008 (Consent adapters)
- FE-TRN-009 (Publication adapters)
- FE-TRN-010 (Content adapter)

## Data impact
- Local signal state only.

## API / Contract impact
- Delegates to respective ports (§5.1–§5.3, §6.1–§6.2, §7.1).

## Testing / Evidence required
- Unit test: publication polling sequence; never optimistic.

## Risks / Notes
- `consent-required` on publication is handled at the error pipeline (FE-TRN-025), not in the facade.
