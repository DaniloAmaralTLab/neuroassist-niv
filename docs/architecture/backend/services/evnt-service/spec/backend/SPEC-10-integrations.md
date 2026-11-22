# SPEC-10 — Integrations

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical: [`contracts/integration-contracts.md`](../../contracts/integration-contracts.md).

## Objective

Pin EVNT's outbound sync-REST integrations and the inbound downstream exposure.

## Scope

- **In:** EDGE (device-token trust), PAT (command snapshot), ACS (caregiver trust + links + **phone
  for escalation**), HIST (audit), MIG (migrations); **the `EmergencyNotificationPort` out-of-band
  providers (Web Push / AWS End User Messaging)** (ADR-005); downstream consumers (DASH, GEST, HIST).
- **Out:** TechLab AI hub (none — `ai.hasAi = false`, hub-integration.md).

## Technical decisions

| Target | Operation | Identity | Degrade |
|---|---|---|---|
| EDGE | JWKS + `POST /edge/device-tokens/introspect` | public / service-client | cached keys; introspect best-effort |
| PAT | `GET /pat/commands/{id}` | service-client `pat.command.read` | **fail-closed** `503`/`404` (ADR-004) |
| ACS | JWKS + introspect + `GET /acs/caregivers/{id}/links` | public / service-client / caregiver | cached keys/links; deny on hard authz failure |
| HIST | `POST /audit` | service-client | prod `502` / dev log-only |
| MIG | authors Flyway `V0040`–`V0044` | build-time | — |
| Web Push | VAPID push protocol (HTTPS) | VAPID key pair | retry/advance; `410 Gone` retires subscription (§8) |
| AWS End User Messaging (SMS + Voice) | SDK, selected Region | AWS IAM | retry/advance per tier; failure audited, never silent (§8) |

**Downstream exposure:** DASH polls the read surface (primary, v1); GEST/edge station produces the
gesture report (v1); HIST receives audit writes (v1). Out-of-band escalation is now **inside EVNT**
(`EmergencyNotificationPort`, ADR-005 / SPEC-11) — **CONV is no longer on the SAFETY-1 path**. See
integration-contracts §7–§8.

## Open TODO[architect]

- ACS service-client minting path for EVNT's PAT/EDGE-introspect/HIST calls (integration-contracts §2).
- HIST failure policy hard-`502`-vs-enqueue (event-contracts §1).
- **AWS End User Messaging (SMS/Voice): confirm selected Region, +55 origination/sender requirements,
  and account-plan support before enabling Tiers 1–2** (integration-contracts §8; CLAUDE.md no-cross-Region).
- **INT-EVNT-ACS-001**: ACS must expose the caregiver phone/consent for SMS/voice (integration-contracts §3.1) — cross-module issue to open at backlog.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL call PAT for the command snapshot with an ACS service-client token carrying `pat.command.read` and never with the inbound `edge.device` token.
- IF PAT is unreachable at ingest, THEN THE SYSTEM SHALL fail-closed `503` and create no event (ADR-004).
- THE SYSTEM SHALL resolve caregiver↔patient links from ACS and deny unlinked access `404` (INV-EVNT-7).
- THE SYSTEM SHALL expose event state only through its REST surface and open no socket to a consumer (ADR-003); out-of-band escalation is EVNT's own **outbound** call through `EmergencyNotificationPort`, not an inbound push (ADR-005).
- THE SYSTEM SHALL route every escalation channel through `EmergencyNotificationPort` and create all AWS End User Messaging resources in the project's selected Region (no cross-Region — §8).
