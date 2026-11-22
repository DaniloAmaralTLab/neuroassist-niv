# SPEC-03 — Alarm Delivery & Safety (critical sub-feature)

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> ADR: `../../adr/ADR-003-notification-delivery-polling.md` (in-app polling) **+
> `../../adr/ADR-005-out-of-band-emergency-escalation.md` (out-of-band escalation — closes SAFETY-1)
> + `../../adr/ADR-006-detection-lapse-alerting.md` (detection-lapse alerting — SAFETY-GEST-1)**.
> Risk R1 (doc 06). The emergency escalation policy is in
> [SPEC-11](SPEC-11-emergency-escalation.md); the detection-lapse alerting is in
> [SPEC-12](SPEC-12-detection-lapse-alerting.md).

> **This is an assistive / life-safety product.** The emergency alarm is the whole reason EVNT
> exists. This SPEC makes the delivery guarantee — and its limits — **explicit and testable**, not a
> line in a risk table. Where v1 cannot meet a safe bound, it is stated as an open `TODO[architect]`,
> not hidden.

## Objective

Define, as a contract, how an `emergency` Event reaches the caregiver, the latency budget, what
happens when the caregiver client cannot receive, and the escalation path — given that delivery is
**dashboard polling with no push** (messaging disabled).

## Scope

- **In:** the polling contract (interval, server consistency), the end-to-end latency budget, the
  backgrounded/offline-client behaviour, the unacknowledged-emergency escalation path, the explicit
  v1 safety gaps.
- **Out:** the event-generation path (SPEC-02), the FE rendering choice (full-screen vs toast is a
  client decision over the `urgency` field — ADR-003).

## Decision 1 — Polling interval contract

- EVNT **pushes nothing**; the caregiver dashboard **polls** `GET /evnt/patients/{id}/active-alarm`.
- The **server advertises** the cadence in every response as `pollIntervalSeconds` (default **3 s**,
  env `EVNT_ACTIVE_ALARM_POLL_SECONDS`). The client adopts the advertised value rather than
  hard-coding it, so the budget is tunable without a client release.
- The read is a strongly-consistent single-table query (INV-EVNT-3): a committed emergency is
  visible to the **very next** poll from any device; a confirmation is seen everywhere on the next
  poll.
- The recent-events surface (`GET .../events`, routine toasts) MAY be polled on a slower cadence
  (default **10 s**); it is not the emergency path.

## Decision 2 — End-to-end latency budget (the safety bound)

End-to-end = *station recognizes* → *POST /evnt/gesture-reports* → *EVNT commit* → *next caregiver
poll* → *alarm rendered*. The EVNT-controlled portion is **ingest-commit → next-poll visibility**.

- **Server SLA:** an emergency Event is retrievable via `active-alarm` **immediately on commit**
  (no async indexing, single table). EVNT adds no delivery latency beyond request processing
  (target p95 ingest < 300 ms excluding the one PAT call).
- **Delivery budget:** with a 3 s poll, worst-case *commit → caregiver sees it* ≤ **poll interval +
  one round-trip ≈ 5 s (p95)**, **only while the caregiver client is foregrounded and online**.
- This 5 s bound is the **accepted v1 budget for a foregrounded client**, and it is **not** a
  guaranteed safety bound for a backgrounded/offline client (Decision 3).

## Decision 3 — Backgrounded / offline caregiver client

- Polling runs **only while the dashboard tab is foreground and online**. A backgrounded tab, a
  locked/sleeping device, a closed browser, or lost connectivity **stops polling** → the emergency
  is **not delivered** until the client resumes.
- EVNT keeps the emergency in the `active-alarm` query indefinitely until confirmed (INV-EVNT-3), so
  when the client **resumes**, the very next poll surfaces the still-active alarm (no event is lost;
  only delivery is delayed).
- **`SAFETY-1` — CLOSED by design (product decision 2026-11-20, ADR-005).** Polling alone cannot reach
  a backgrounded/offline/asleep client, so EVNT now adds an **out-of-band escalation channel IN v1**,
  **alongside** polling: on an unconfirmed emergency EVNT escalates **Web Push → SMS → voice call**
  (SPEC-11), reaching a caregiver whose dashboard is not foregrounded — even one with no app open at
  all (voice). This escalation lives **inside EVNT** (no new module) and does **not** reopen the
  internal message bus (messaging stays disabled); it is an **outbound integration** driven by a
  scheduled sweep over unconfirmed emergencies (ADR-005). The pilot no longer depends on the "keep the
  dashboard foreground" operating assumption.

## Decision 4 — Escalation when an emergency stays unacknowledged

- An unconfirmed emergency **never auto-clears**: it remains the `active-alarm` on every poll, so a
  foregrounded client keeps rendering the full-screen alarm until a caregiver confirms (INV-EVNT-5).
- v1 now has **automatic, time-based escalation across channels** (ADR-005 / SPEC-11): as the alarm
  ages unconfirmed, EVNT fires Web Push → SMS → voice to **every caregiver linked to the patient**, so
  ageing no longer relies only on the on-screen alarm.
- **`SAFETY-2` — PARTIALLY addressed (residual, scoped future signal).** The time-based,
  channel-escalating ladder of ADR-005 covers "notify harder as the emergency ages". What remains a
  **future signal** is routing to a **distinct secondary role** — a *different* caregiver or the clinic
  coordinator who is **not** one of the patient's linked caregivers. v1 escalates to all **linked**
  caregivers across channels but raises no signal to an unlinked secondary/coordinator. That role-based
  fan-out is deferred; it reuses the same `EmergencyNotificationPort` when added.

## Decision 5 — Station connected but not detecting (SAFETY-GEST-1, ADR-006 / SPEC-12)

A connected station can silently **stop detecting** (tab backgrounded, screen locked, camera denied,
model failed, low FPS) — EDGE's "worst failure mode" (EDGE Risk R1): the patient may try to call for
help while nothing is watching, and **no `event` is ever produced**, so neither polling (Decision 1)
nor emergency escalation (ADR-005) can cover it. EDGE now detects this (its heartbeat carries a
`detectionState`, and an EDGE sweep opens a **detection-lapse** episode after `N` s, default 120 s) and
**raises it to EVNT**. **EVNT owns the alerting** (ADR-006 / SPEC-12): it surfaces a **distinct "station
not detecting" alert** to the linked caregivers (a separate list — `GET /evnt/patients/{id}/detection-
lapses`, never the emergency active-alarm) **and reuses the ADR-005 ladder** (Web Push → SMS → voice)
while the lapse stays open, stopping on **resolution** (station back to `RUNNING`) or caregiver
**acknowledgement**. A real emergency always **outranks** a lapse (SPEC-12 LAPSE-6).

## Guaranteed vs not (post-ADR-005 / ADR-006)

| Property | v1 guarantee |
|---|---|
| In-app, foregrounded+online caregiver sees an emergency | **≤ 5 s p95** (Decision 2, polling) |
| An emergency is **attempted** out-of-band while unconfirmed | **Yes** — Web Push → SMS → voice (SPEC-11), independent of the dashboard state |
| A voice call reaches a phone **with no app installed / dashboard closed** | **Yes, attempted** (Tier 2) |
| Escalation **stops** the instant a caregiver confirms | **Yes** (ESC-1, INV-EVNT-5) |
| No duplicate notification for the same tier | **Yes** (ESC-4 idempotency) |
| A provider/channel failure is never silent | **Yes** — advances to the next tier + audited (ESC-5/ESC-7) |
| A station **connected but not detecting** for `N` s raises a caregiver alert | **Yes** — EDGE raises a detection lapse, EVNT alerts + escalates (ADR-006 / SPEC-12, SAFETY-GEST-1) |
| A detection-lapse alert is **attempted** out-of-band while open | **Yes** — same ladder as an emergency, stopping on resolve **or** acknowledgement (LAPSE-4/LAPSE-5) |
| A detection-lapse alert is shown **as** an emergency | **No, by design** — a lapse is a distinct alert; an emergency outranks it (LAPSE-3/LAPSE-6) |
| A detection stop **shorter than `N`**, or before the first pairing/heartbeat, is alerted | **No** — nothing has lapsed yet (EDGE Risk R6); `N` trades latency against false alarms |

**Residual risks (explicit, not hidden):**

- **No delivery guarantee without connectivity.** A voice call still requires **cellular coverage / a
  reachable, powered phone**; Web Push requires a **live subscription and a reachable push service**.
  EVNT guarantees the **attempt and the audit**, not physical receipt.
- **Telephony provisioning / Region / cost.** SMS and voice via **AWS End User Messaging** require an
  origination identity for Brazilian (+55) numbers and depend on the AWS project's selected Region and
  account plan — see the `TODO[architect]` in integration-contracts §8. Until provisioned, those tiers
  are configured disabled and record a `channel-disabled` failed attempt (never silent — ESC-5).
- **Caregiver phone source.** SMS/voice need the caregiver phone number, which **ACS does not expose
  today** — a cross-module `INT` dependency (integration-contracts §3.1). Until ACS provides it, Tier
  1/2 record `no-contact`; Tier 0 Web Push is unaffected.
- **Secondary-role routing (SAFETY-2 residual)** — see above.

## Edge cases

- Two caregivers polling the same patient both see the alarm; the first `confirm` clears it for both
  on their next poll (one source of truth — ADR-010).
- Clock skew: the client uses `serverTime` from the response to detect a stalled poll loop and resync.
- A `routine` event never takes over the screen and is never confirmable (toast + History only).

## Acceptance criteria (EARS)

- WHEN an `emergency` Event is committed, THE SYSTEM SHALL make it retrievable via `GET /evnt/patients/{id}/active-alarm` on the next poll with no additional indexing delay (INV-EVNT-3).
- THE SYSTEM SHALL advertise `pollIntervalSeconds` (default 3) and `serverTime` on every `active-alarm` response so the client adopts the server cadence and detects skew.
- WHILE an `emergency` Event is unconfirmed, THE SYSTEM SHALL return it as the `activeAlarm` on every poll (no auto-clear — Decision 4).
- WHEN a caregiver confirms an emergency, THE SYSTEM SHALL remove it from the `active-alarm` query so every polling client clears it on the next poll (INV-EVNT-5).
- WHILE the caregiver client is foregrounded and online, THE SYSTEM SHALL support a commit-to-visibility budget of ≤ 5 s p95 for an emergency (Decision 2).
- IF the caregiver client is backgrounded, asleep or offline, THEN THE SYSTEM SHALL retain the active alarm until the client resumes AND SHALL escalate out-of-band (Web Push → SMS → voice) while the emergency stays unconfirmed (SAFETY-1 closed by ADR-005 / SPEC-11), guaranteeing the attempt and its audit but not physical receipt without connectivity.
- WHERE an emergency stays unacknowledged, THE SYSTEM SHALL keep rendering it on every poll AND SHALL run the time-based channel-escalation ladder of SPEC-11 to every linked caregiver; routing to an unlinked secondary/coordinator role remains the deferred `SAFETY-2` residual.
- WHEN EDGE raises a detection lapse for a patient's station (connected but not detecting, or heartbeat stopped, for `N` s), THE SYSTEM SHALL surface a distinct caregiver alert and escalate it out-of-band while it stays open, stopping on resolution or acknowledgement (SAFETY-GEST-1 — ADR-006 / SPEC-12), guaranteeing the attempt and its audit but not physical receipt without connectivity.
- WHILE a patient has an unconfirmed emergency, THE SYSTEM SHALL start no new detection-lapse escalation tier for that patient and SHALL NOT surface the lapse as an emergency (SPEC-12 LAPSE-6).
