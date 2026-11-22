# SPEC-07 — Error Handling — pat (PAT) Frontend

> BE `ProblemDetail` (RFC 7807) → `AppError` (`@neuroassist/shared/error-model`) → user-facing message
> via `@neuroassist/shared/ui-feedback`. Errors are mapped by the stable `type` **slug**, never by HTTP
> status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`), and the BE
> `detail` / `correlationId` are preserved — the FE never shows a raw HTTP body
> (`fe-error-handler:raw-http-error-detail`) and never discards the BE detail behind a fixed string
> (`fe-facade:toast-fixed-text-discards-be-detail`). Sources: BE api-contract §4,
> `frontend/05-state-and-data-flow.md` §5.

## 1. Pipeline

```
pat-service application/problem+json
  → access-http-base error-normalize interceptor (reads `type` slug + detail + correlationId)
  → AppError { code: <slug>, detail, correlationId }
  → feature maps AppError.code → field error | toast | banner/page error | modal
  → rendered via @neuroassist/shared/ui-feedback (BE detail shown, correlationId attached)
```

## 2. BE `type` slug → FE surface (canonical, api-contract §4)

| BE `type` slug | HTTP | Raised by | FE surface | FE message (English, ADR-018) |
|---|---|---|---|---|
| `unauthenticated` | 401 | any endpoint / blacklisted token | redirect to login | — (guard-driven) |
| `forbidden` | 403 | authority check / patient-session token on `/pat` | toast | "You don't have permission for this action." (no resource existence revealed) |
| `not-found` | 404 | cross-tenant / missing patient or command | toast or page error | "That record is no longer available." |
| `validation-error` | 400 | malformed body / bad enum / bad calibration window (INV-PAT-3) | field error(s) | per-field from BE detail (label / duration) |
| `unknown-gesture-type` | 400 | `primaryPrimitive` / `secondaryPrimitive` not in catalog (INV-PAT-4) | **field error** on gesture | "Select a gesture type from the catalog." |
| `command-retired` | 409 | PATCH on a retired command (INV-PAT-5) | banner / toast | "This command was retired — create a new one to re-tune it." |
| `gesture-type-code-taken` | 409 | duplicate `code` on `POST /pat/gesture-types` | **field error** on the new-type code | "A gesture type with this code already exists." |

### 2.1 Conceptual reason codes from the vision (mapped, not new)

The vision (`frontend/05` §5) named `command_label_required`, `gesture_duration_invalid`,
`gesture_type_name_taken`, `patient_not_found`, `permission_denied`, `tenant_resolve_failed`,
`webcam_unavailable`. These map onto BE slugs (the BE contract is canonical) or stay client-side:

- `command_label_required` → **client-side** field error; save is disabled, the request never reaches
  the server (SPEC-03 invariant).
- `gesture_duration_invalid` → **client-side** `duration` field error (min ≥ max); a server
  `validation-error` is the defensive fallback.
- `gesture_type_name_taken` → `gesture-type-code-taken` (409) → field error on the new-type code.
- `patient_not_found` → `not-found` (404) → page error on the catalog (missing patient) / toast.
- `permission_denied` → `forbidden` (403) → toast.
- `tenant_resolve_failed` → login / session concern (`@neuroassist/shared/auth-session`), not a PAT
  surface error.
- `webcam_unavailable` → **client-only** live-test error state (never a BE `ProblemDetail`); it sets
  `test = 'error'` and never blocks a save (R3 / R5).

## 3. Toast vs banner vs modal — criteria

- **Field error:** validation tied to a specific input (`validation-error`, `unknown-gesture-type`,
  `gesture-type-code-taken`, client-side label/duration) — on the command editor or registration form.
- **Toast:** transient, non-blocking outcome of an action (`forbidden`, `not-found` on a mutation).
- **Banner / page error:** a list/page failed to load (catalog load, patient resolution) — blocks the
  content region with a Retry affordance; `command-retired` on an edit surfaces an inline banner on
  the editor.
- **Modal:** only a confirm-before-destructive step (retire confirmation); never for error display.

## 4. Retry strategy

- GET reads (catalog, gesture types, patient): a single manual **Retry** affordance on the
  page/banner error; no silent auto-retry (pilot volume is tiny, `frontend/06` §3).
- POST / PATCH / DELETE mutations: **no automatic retry** (create, calibrate, register are
  non-idempotent; retire is idempotent but a destructive action the user confirms). The user
  re-initiates.

## Criterios de aceite (EARS)

- IF the backend responds `unauthenticated`, THEN THE SYSTEM SHALL redirect to the login route.
- IF the backend responds `forbidden`, THEN THE SYSTEM SHALL show a toast and SHALL NOT reveal whether the target resource exists.
- IF the backend responds `not-found` on the catalog load, THEN THE SYSTEM SHALL render a page error with a Retry affordance.
- IF the backend responds `validation-error`, THEN THE SYSTEM SHALL map each field detail to its editor field and SHALL NOT mutate the command row.
- IF the backend responds `unknown-gesture-type`, THEN THE SYSTEM SHALL show a gesture field error prompting the caregiver to pick a catalog type.
- IF the backend responds `command-retired` on a calibration save, THEN THE SYSTEM SHALL show an inline banner telling the caregiver to create a new command and SHALL NOT re-tune the retired command.
- IF the backend responds `gesture-type-code-taken`, THEN THE SYSTEM SHALL show a field error on the new gesture-type code and SHALL NOT create a duplicate.
- IF the webcam is unavailable, THEN THE SYSTEM SHALL set the live-test error state and SHALL keep the save control enabled.
- THE SYSTEM SHALL preserve the backend `detail` and `correlationId` in every surfaced PAT error and SHALL NOT display a raw HTTP response body.
