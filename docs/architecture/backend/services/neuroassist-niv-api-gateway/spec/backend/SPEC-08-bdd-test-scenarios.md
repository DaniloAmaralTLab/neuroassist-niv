# SPEC-08 — BDD Test Scenarios

## Objective
Describe the BDD coverage for GWY in prose, name the reusable steps, and map each
`.feature` file to the SPECs and invariants it proves. The executable Gherkin lives
in `tests/cucumber/*.feature` (pure `.feature`, consumed by `be-bdd-generator.py`);
this file is the narrative and the shared-step vocabulary, not Gherkin.

## Feature files and what they prove

| Feature | Proves | SPEC / invariant |
|---|---|---|
| `routing.feature` | path predicate → correct `lb://` downstream; full-path forward; no route to REG/MIG/DASH; `/trn/**` proposed | SPEC-01, SPEC-02 |
| `public-vs-authenticated.feature` | anonymous allow-list bypasses the edge check; everything else is 401 without a token; EDGE-signed and non-expiring tokens are admitted | SPEC-03, SPEC-06, INV-G2/G5/G6 |
| `rate-limit-429.feature` | login and pairing throttle to 429 past the threshold; other routes are not throttled | SPEC-06, ADR-005 |
| `correlation-id.feature` | generate-if-absent, preserve-if-present, echo on response | SPEC-07, INV-G4 |
| `tenant-header-stripping.feature` | inbound `X-Tenant-Id` is stripped and never forwarded | SPEC-06, INV-G3 |
| `cors-preflight.feature` | preflight answered at the edge for allowed origins; blocked for others; no wildcard-with-credentials | SPEC-06, ADR-004 |

## Reusable steps (shared glue — document here, not in the feature files)

> Emit these as `tests/.../steps/*Steps.java` stubs in the **scaffold** format
> (one step method per line of glue), **not** as a monolithic `GwyStepDefs.java`,
> to avoid the duplicate-step-glue defect (BDD glue duplicated between phases).

- `Given the gateway is running with the eight business routes configured`
- `Given REG advertises an UP instance of "<service>"`
- `Given the ACS JWKS and the EDGE JWKS are reachable`
- `Given a valid <ACS|EDGE|patient-session> token` (patient-session = no `exp`)
- `Given no Authorization header`
- `When a <METHOD> request is sent to "<path>"`
- `When the same request is repeated <n> times within one minute`
- `Then it is forwarded to "lb://<service>"`
- `Then the response status is <code>`
- `Then the response carries header "X-Correlation-Id"`
- `Then the forwarded request has no "X-Tenant-Id" header`
- `Then no downstream is called`

## Test data (prose — not Gherkin tables here)

- Services: `acs-service:8081`, `pat-service:8082`, `hist-service:8083`,
  `edge-service:8084`, `conv-service:8085`, `evnt-service:8086`, `gest-service:8088`,
  `trn-service:8089 (proposed)`.
- Public paths: `POST /acs/auth/login`, `GET /acs/.well-known/jwks.json`,
  `GET /edge/.well-known/jwks.json`, `POST /edge/devices/pair` (proposed),
  `GET /edge/actuator/health`, `GET /actuator/health`.
- Tokens: ACS caregiver (has `exp`), patient-session (no `exp`), EDGE `edge.device`,
  forged/unsigned, expired.

## Acceptance criteria (EARS)
`THE SYSTEM SHALL have an executable scenario proving a protected route returns 401 without a valid token and is admitted with one.` (D-642)
`THE SYSTEM SHALL have an executable scenario proving an EDGE-signed token and a non-expiring patient-session token are both admitted.` (INV-G6, Risk R1/R2)
`THE SYSTEM SHALL have an executable scenario proving login/pairing return 429 past the threshold.`
`THE SYSTEM SHALL have an executable scenario proving X-Correlation-Id is generated-if-absent, preserved-if-present, and echoed.`
`THE SYSTEM SHALL have an executable scenario proving an inbound X-Tenant-Id is stripped before forwarding.`
`THE SYSTEM SHALL have an executable scenario proving CORS preflight is answered for allowed origins and blocked otherwise.`
