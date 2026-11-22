# SPEC-07 — Error Handling — edge (EDGE) Frontend

> BE `ProblemDetail` (RFC 7807) → `AppError` (`@neuroassist/shared/error-model`) → user-facing
> message via `@neuroassist/shared/ui-feedback`. Errors are mapped by the stable `type` **slug**,
> never by HTTP status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`),
> and the BE `detail`/`correlationId` are preserved — the FE never shows a raw HTTP body
> (`fe-error-handler:raw-http-error-detail`) and never discards the BE detail behind a fixed string
> (`fe-facade:toast-fixed-text-discards-be-detail`). Sources: BE api-contract §8,
> `frontend/05-state-and-data-flow.md` §5.

## 1. Pipeline

```
edge-service application/problem+json
  → access-http-base error-normalize interceptor (reads `type` slug + detail + correlationId)
  → AppError { code: <slug>, detail, correlationId }
  → feature maps AppError.code → inline pairing error | toast | banner/page error | modal
  → rendered via @neuroassist/shared/ui-feedback (BE detail shown, correlationId attached)
```

## 2. BE `type` slug → FE surface (canonical, api-contract §8)

| BE `type` slug | HTTP | Raised by | FE surface | FE message (English, ADR-018) |
|---|---|---|---|---|
| `unauthenticated` | 401 | any protected endpoint / blacklisted token | redirect to login | — (guard-driven) |
| `forbidden` | 403 | authority check failed; device not paired on a device endpoint | toast | "You don't have permission for this action." (no device existence revealed) |
| `not-found` | 404 | cross-tenant / missing device | toast | "That device is no longer available." |
| `validation-error` | 400 | malformed enroll body / bad enum | inline pairing error | per-field from BE detail |
| `device-not-claimable` | 409 | `POST /edge/devices/pair` on a device not in `awaiting_claim` | inline pairing error | "This device is already paired." |
| `device-revoked` | 409 | `activation` on a `revoked` device | modal / toast | "This device was revoked. Enroll and pair a new device." |
| `invalid-pairing-code` | 401 | `POST /edge/devices/pair` (station-side) | **not an FE dashboard surface** | — (the station handles it; the dashboard observes the device never reaching `paired` → timeout) |
| `catalog-unavailable` | 503 | `GET /edge/catalog` (device endpoint) | **not an FE dashboard surface** | — (device-token path; out of FE scope) |

## 2.1 Conceptual reason codes from the vision (mapped, not new)

The vision (`frontend/05` §5) named `device_pairing_failed`, `device_already_paired`,
`platform_unsupported`, `device_not_found`, `permission_denied`, `tenant_resolve_failed`,
`status_unavailable`. These map onto BE slugs — the BE contract is canonical:

- `device_pairing_failed` → **client-side timeout**: the dashboard enrolls (`201`) then polls the
  device read; IF the station never claims the code before `pairingCodeExpiresAt`, the panel enters
  `pairing = 'error'`. No BE error is involved on the dashboard path; no half-record is left (the
  device stays `awaiting_claim` until re-pair or cleanup).
- `device_already_paired` → `device-not-claimable` (409) on a claim, and a **client pre-check**: when
  a device already exists for the patient the panel shows it and offers no second pair (SPEC-03 §2).
- `platform_unsupported` → **client-side** PLAT-001 check (Android/Chromium) in phone mode; pairing is
  blocked before any request, with a clear explanation — never a silent failure (no BE slug exists).
- `device_not_found` → `not-found` (404).
- `permission_denied` → `forbidden` (403).
- `tenant_resolve_failed` → login/session concern (shared/auth-session), not an EDGE surface error.
- `status_unavailable` → **client-rendered** state when `edge-service` is unreachable (network error):
  the badge/card render "status unavailable", **never** a defaulted "online" (ADR-005, doc 03 §5).

## 3. Toast vs banner vs modal — criteria

- **Inline pairing error:** failures tied to the pairing panel (`validation-error` on enroll,
  `device-not-claimable`, client-side pairing timeout, `platform_unsupported`) — shown in the panel
  with retry guidance, not a global toast.
- **Toast:** transient, non-blocking outcome of a lifecycle action (`forbidden`, `not-found`).
- **Banner / page error / "status unavailable":** a device read failed (badge, card, status page) —
  a neutral non-alarm state with a Retry affordance; an **offline** device is amber, **not** an error.
- **Detection warning (not an error):** a `paired` + `online` device whose `detectionState` is not
  `RUNNING` (`PAUSED` / `DEGRADED` / `UNAVAILABLE` / `UNKNOWN`) renders "connected, NOT detecting" with
  its `detectionReason` as an **amber warning**, never an error surface and never the EVNT alarm
  (SPEC-03 §1.1). A failed *read* is "status unavailable"; a successful read of a *not-detecting* device
  is a warning, not a failure.
- **Modal:** the confirm-before-destructive step (unpair / deactivate / revoke) and the terminal
  `device-revoked` explanation — not for routine error display.

## 4. Retry strategy

- GET reads (status/list/poll): a single manual **Retry** affordance on the banner/panel error; no
  silent auto-retry (pilot volume is tiny). The pairing poll stops at `pairingCodeExpiresAt`.
- POST/DELETE mutations: **no automatic retry** (enroll is non-idempotent; unpair/deactivate/revoke
  are idempotent but safety-relevant and SEC-aligned — the user re-initiates).

## Criterios de aceite (EARS)

- IF the backend responds `forbidden`, THEN THE SYSTEM SHALL show a toast and SHALL NOT reveal whether the target device exists.
- IF the backend responds `not-found`, THEN THE SYSTEM SHALL show a toast and SHALL NOT remove the device optimistically.
- IF the backend responds `validation-error` on enroll, THEN THE SYSTEM SHALL show an inline pairing error mapped from the backend detail.
- IF the backend responds `device-not-claimable`, THEN THE SYSTEM SHALL show an inline already-paired error in the pairing panel.
- IF the backend responds `device-revoked` on a reactivate, THEN THE SYSTEM SHALL show a modal explaining a revoked device requires a new enroll and pair.
- IF the station never claims the pairing code before it expires, THEN THE SYSTEM SHALL set the pairing state to error with retry guidance and SHALL NOT leave a paired device record.
- IF the patient phone is not Android or Chromium, THEN THE SYSTEM SHALL block pairing with the platform-unsupported notice and SHALL NOT send a pairing request.
- IF `edge-service` is unreachable on a status read, THEN THE SYSTEM SHALL render the status-unavailable state and SHALL NOT render a defaulted online badge.
- IF the backend responds `unauthenticated`, THEN THE SYSTEM SHALL redirect to the login route.
- THE SYSTEM SHALL preserve the backend `detail` and `correlationId` in every surfaced EDGE error and SHALL NOT display a raw HTTP response body.
