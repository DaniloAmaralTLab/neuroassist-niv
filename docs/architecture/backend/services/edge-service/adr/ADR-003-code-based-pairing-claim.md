<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Code-based pairing and claim flow

## Status
aceita

## Contexto
A device must be bound to the right patient once, by a coordinator, without the station ever
holding a human (caregiver) credential and without anyone typing long secrets by hand.
ADR-014 describes the existing flow as code-based (`awaiting-claim` → heartbeat) and decides
(Option 1) that the patient's mobile phone is "one more station" reusing that exact flow
with none of its own. The claim happens on a device that has no tenant context yet — it
presents only the code — so the code itself must resolve to the right tenant and device.

## Decisão
Enrollment and claim are two steps. A coordinator (`edge.device.enroll`) creates the
`EdgeDevice` in `awaiting_claim` and EDGE mints a **short-lived, single-use pairing code**.
The station then calls the pairing endpoint (`edge.device.pair`) presenting only that code —
a **bearer secret, not a caregiver token**; EDGE looks the code up in a **global** table
(`device_pairing_code` → `tenantId`, `deviceId`), validates it is unexpired and unconsumed,
consumes it, mints the `edge.device` credential (ADR-002), and transitions the device to
`paired` (anchor **DevicePaired**). The identical flow serves the Android/Chromium mobile
station — no separate pairing path (ADR-014). The pairing code is hashed at rest and used
over TLS.

## Consequências
- Positive: the station never handles a human credential; a coordinator authorizes once and
  the device lives on its own `edge.device` token thereafter (ADR-014).
- Positive: one pairing flow for fixed and mobile stations — no divergence to maintain.
- Positive: a global code lookup lets a tenantless device resolve its tenant at claim time
  without trusting any client-supplied tenant header.
- Negative / trade-off: the pairing code is a bearer secret with real leak risk (Risk R2);
  mitigated by short TTL, single use, hashing and TLS. A global table holds a cross-tenant
  routing tuple — kept free of patient data and swept after expiry/consumption.
