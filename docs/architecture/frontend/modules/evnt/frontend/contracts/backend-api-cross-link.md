# Backend API Cross-link — evnt (EVNT) Frontend ↔ `evnt-service`

> Source of truth for all BE shapes and authorities:
> `../../../../backend/services/evnt-service/contracts/api-contract.md` and
> `../../../../backend/services/evnt-service/spec/backend/SPEC-03-alarm-delivery-safety.md`.
> The FE references the BE contract; it never redefines it. This file records the FE↔BE mapping and the
> reconciliation gaps the FE specs carry.

## 1. Endpoint ↔ FE consumer map

The FE dashboard consumes **only** the caregiver paths (api-contract §3–§5). The device path and health
endpoint are exercised by the edge agent / resource servers / ops, not the dashboard.

| BE endpoint | Verb | Authority | FE Service.method | FE surface |
|---|---|---|---|---|
| `/evnt/patients/{patientId}/active-alarm` | GET | `evnt.event.read` | `EventApiService.getActiveAlarm` | the **poll** → `/alarm` takeover + home overlay (SPEC-04 §5) |
| `/evnt/patients/{patientId}/events` | GET | `evnt.event.read` | `EventApiService.listPatientEvents` | routine-notice feed (slow poll) |
| `/evnt/events/{eventId}` | GET | `evnt.event.read` | `EventApiService.getEvent` | single-event read (notice detail) |
| `/evnt/events/{eventId}/confirmation` | POST | `evnt.event.confirm` | `EventApiService.confirmAlarm` | acknowledge action on the takeover |
| `/evnt/events/{eventId}/feedback` | POST | `evnt.event.record` | `EventApiService.recordFeedback` | "Mark not real" on a notice/event (`{verdict}`) |
| `/evnt/push-subscriptions` | POST | `evnt.subscription.create` | `PushSubscriptionApiService.create` | enable-push enrollment (Tier 0 Web Push — SAFETY-1, SPEC-04 §5.6) |
| `/evnt/push-subscriptions/{subscriptionId}` | DELETE | `evnt.subscription.delete` | `PushSubscriptionApiService.delete` | turn-push-off / resubscribe cleanup (SPEC-04 §5.6) |
| `/evnt/events/{eventId}/escalation-attempts` | GET | `evnt.escalation.read` | `EventApiService.listEscalationAttempts` | masked escalation trail on `/alarm` / event detail (SPEC-03 §4b) |
| `/evnt/patients/{patientId}/detection-lapses` | GET | `evnt.detection-lapse.read` | `DetectionLapseApiService.listDetectionLapses` | the **lapse poll** → distinct "station not detecting" alert (SAFETY-GEST-1, SPEC-04 §6) |
| `/evnt/detection-lapses/{lapseId}/confirmation` | POST | `evnt.detection-lapse.confirm` | `DetectionLapseApiService.acknowledgeDetectionLapse` | acknowledge "I see it" on the lapse alert (stops BE escalation — SPEC-04 §6.4) |
| `/evnt/detection-lapses` | POST | `evnt.detection-lapse.create` (**edge-service** service-client token) | **EDGE backend — NOT an FE call** | lapse raise; never a dashboard surface (ADR-006 §10) |
| `/evnt/detection-lapses/{lapseId}/resolution` | POST | `evnt.detection-lapse.resolve` (**edge-service** service-client token) | **EDGE backend — NOT an FE call** | lapse resolve; never a dashboard surface (ADR-006 §10) |
| `/evnt/gesture-reports` | POST | `evnt.event.ingest` (**edge.device** token) | **station/edge agent — NOT an FE call** | device path; never a dashboard surface (G-EVNT-5) |
| `/evnt/health` | GET | public | — (ops / GWY) | not an FE concern |

## 2. Reconciliation gaps (FE specs carry these; BE contract is canonical)

| # | Gap | FE handling |
|---|---|---|
| G-EVNT-1 | Vision authority `evnt.event.feedback` differs from BE `evnt.event.record` (api-contract §1, op `recordFeedback` → `record`). | FE uses **`evnt.event.record`** for the feedback write everywhere (SPEC-05 §2, INV-EVNT-7). The vision key `evnt.event.feedback` is superseded and absent from the permission map. |
| G-EVNT-2 | Vision acknowledge endpoint `POST .../events/{id}/acknowledgement` (doc 05 §2) differs from BE `POST .../events/{eventId}/confirmation`. | FE calls **`POST /evnt/events/{id}/confirmation`** (authority `evnt.event.confirm`), empty body; `confirmedBy` is server-trusted from the JWT `sub`, never FE-sent (SPEC-04 §3). |
| G-EVNT-3 | Vision implied a `mock` adapter default while `evnt-service` was unarchitected (parallel). | Resolved: the evnt-service api-contract now exists, so `evnt.providers.ts` defaults to **`http`** (SPEC-04 §2); a providers spec proves the default (`scaffold:mock-adapter-default`). |
| G-EVNT-4 | BE active-alarm is **patient-scoped** (`/patients/{patientId}/active-alarm`); the FE takeover is global `/alarm`. | The `AlarmFacade` resolves the caregiver's linked patients (session/ACS) and polls `active-alarm` **per linked patient**; `/alarm` renders the most-recent unconfirmed emergency across them; the Confirm call is event-scoped and needs no `patientId` (SPEC-01 §1.1, SPEC-04 §1/§6). Pilot family tenant = one patient. |
| G-EVNT-5 | `evnt.event.ingest` is a **device-token** authority (edge.device token on `POST /evnt/gesture-reports`), not a caregiver authority. | FE never calls the ingest path and never lists `evnt.event.ingest` in the permission map or any guard (SPEC-05 §2, SPEC-07 §2, INV-EVNT-6). A caregiver token never carries it; the device token never carries a caregiver `evnt.*` authority. |
| G-EVNT-6 | The BE event payload carries `commandLabel` but **no** `patientName` / caregiver display name (api-contract §3.1/§4.1). | FE resolves `patientName`/`confirmedByName` from the session / ACS link and renders them only WHERE known; it **never** fabricates them from the event wire (SPEC-03 §1/§5, carry-forward `fe-facade:fabricated-null-fields`). Raise a BE follow-up only if a name must come from EVNT. |
| G-EVNT-7 | SAFETY-1 closure added three BE authorities for the out-of-band client: `evnt.subscription.create`, `evnt.subscription.delete`, `evnt.escalation.read` (api-contract §1, §3.4, §6). | FE uses them **exactly** as the BE constants (INV-EVNT-7) in `MODULE_PERMISSION_MAP` (SPEC-05 §2) and gates the push-enrollment / channel-status / escalation-trail surfaces with them. The VAPID **public** key is read from app config, not an EVNT endpoint (api-contract §6). The service worker is a **shell-app** concern; the EVNT lib owns only the subscription logic + UI (SPEC-06 §5). |
| G-EVNT-8 | SAFETY-GEST-1 (ADR-006 / SPEC-12) added the detection-lapse alert: caregiver authorities `evnt.detection-lapse.read` (§11) + `evnt.detection-lapse.confirm` (§12), plus **service-client** `evnt.detection-lapse.create`/`.resolve` (§10). | FE uses the two **caregiver** keys exactly as the BE constants (INV-EVNT-7) in `MODULE_PERMISSION_MAP` (SPEC-05 §2) and gates the distinct "station not detecting" alert + its acknowledge with them. The service-client raise/resolve keys are the EDGE backend's — **absent** from the FE map and never a dashboard call (same posture as `evnt.event.ingest`). The lapse is a **separate** surface from `active-alarm` (LAPSE-3) and an emergency always outranks it (LAPSE-6). No per-lapse escalation-attempts endpoint exists yet, so the FE exposes **no** lapse attempts trail (SPEC-03 §4c, SPEC-04 §6.5). |

## 3. SAFETY — inherited open items (BE SPEC-03) the FE must keep visible

| Item | Status | FE handling (what is / is not guaranteed) |
|---|---|---|
| **SAFETY-1** — delivery to a backgrounded/asleep/offline/closed client | **CLOSED by design (ADR-005, product decision 2026-11-20)** | The out-of-band ladder now runs inside EVNT **alongside** polling: **Web Push (Tier 0, T+0) → SMS (Tier 1, T+30s) → voice (Tier 2, T+90s)**, stopping on confirmation (ESC-1/ESC-2, BE SPEC-11). **FE client side (its half):** registers the browser as Tier 0 via `POST /evnt/push-subscriptions` on an explicit gesture, keeps it live (refresh / `410 Gone`/`pushsubscriptionchange` → resubscribe), routes a push click to `/alarm` + immediate poll, and shows an **honest** `PushChannelVM` channel status (SPEC-04 §5.6/§5.7). **FE still does NOT guarantee physical receipt:** push needs a live subscription + reachable push service; SMS/voice need cellular coverage + a powered phone; and the phone number depends on `INT-EVNT-ACS-001` (below). In-app polling limits of §5.3–§5.5 are **unchanged**. |
| **INT-EVNT-ACS-001** (cross-module dependency) | **OPEN** | ACS does not yet expose the caregiver **phone** → Tiers 1/2 record `no-contact` BE-side. FE shows SMS/Voice as **contact-missing**, never "covered" (SPEC-04 §5.7, SPEC-03 §4a). When ACS lands the contact, the phone channels flip to available with no FE release beyond the capability signal. |
| **SAFETY-2** — automatic time-based escalation to a *secondary/coordinator* role | **PARTIALLY addressed (residual)** | The ladder now escalates to **every caregiver linked to the patient** (ESC-3); routing to an **unlinked** secondary/coordinator role stays deferred (BE SPEC-03 SAFETY-2 residual). FE's on-screen alarm still never auto-clears until confirmed. |
| 5 s p95 budget | holds **foreground + online only** | FE claims the budget only while `MonitoringVM.polling='live'`; it never advertises it in a degraded state (SPEC-04 §5.2, BE SPEC-03 Decision 2). |
| **SAFETY-GEST-1** — station connected but not *detecting* | **CLOSED by design (ADR-006, product decision 2026-11-20)** | EDGE raises a detection lapse (service-client §10); EVNT owns the alerting + reuses the SPEC-11 ladder (SPEC-12). **FE client side (its half):** reads the distinct "station not detecting" list (`evnt.detection-lapse.read`, §11), polls it reusing the **same** AlarmFacade monitoring model (server-advertised cadence, visibility/online, read-failure = degraded — **never** a false "no lapses"), acknowledges it (`evnt.detection-lapse.confirm`, §12 — stops escalation), auto-clears on server resolve, and keeps an unconfirmed emergency **above** it (LAPSE-6). **FE still does NOT guarantee physical receipt** (identical residual limits to SAFETY-1: push/SMS/voice reachability + `INT-EVNT-ACS-001`). The service-client raise/resolve path and lapse detection itself are **out of FE scope** (EDGE owns liveness truth). |

## 4. Error contract

BE `ProblemDetail` `type` slugs are mapped 1:1 in `SPEC-07-error-handling.md` §2. The FE maps by `type`
slug (not HTTP status), preserves `detail` + `correlationId`, and never shows a raw body. The
device-path slugs (`occurred-at-out-of-bounds`, `command-not-found`, `catalog-unavailable`) are not FE
dashboard surfaces. The overriding EVNT rule: a read failure is a **monitoring** condition, never a
rendered "all clear" (SPEC-07 §2.1).

## 5. Invariants referenced (declared once in BE; cited here, not redefined)

INV-EVNT-1 (tenant from JWT claim; `X-Tenant-Id` never trusted), INV-EVNT-3 (active alarm = unconfirmed
emergency, read-time query, strongly consistent next poll), INV-EVNT-4 (ingest idempotent on
`(deviceId, reportId)` — device path), INV-EVNT-5 (confirm idempotent; only emergencies confirmable),
INV-EVNT-6 (device/caregiver token separation; claims from token, never body), INV-EVNT-7 (controller
`@PreAuthorize` strings equal the authority constants; FE decision keys equal them too). SAFETY-1
closure (BE SPEC-11): ESC-1 (confirmation stops escalation — same signal as INV-EVNT-5), ESC-2 (tier
ladder Web Push → SMS → voice), ESC-3 (every linked caregiver), ESC-5 (a failed tier advances, never
silently dropped). The FE cites these; it never re-runs the ladder client-side (the BE owns escalation —
the FE only enrolls Tier 0 and reads the masked trail). SAFETY-GEST-1 (BE SPEC-12): LAPSE-3 (distinct
alert, never the emergency), LAPSE-5 (acknowledge/resolve stops escalation), LAPSE-6 (an unconfirmed
emergency outranks a lapse). The FE cites these; it never detects or resolves a lapse itself (EDGE owns
device-liveness truth).
