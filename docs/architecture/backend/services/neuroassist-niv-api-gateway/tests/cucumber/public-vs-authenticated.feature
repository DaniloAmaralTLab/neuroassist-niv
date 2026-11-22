Feature: Public allow-list versus deny-by-default edge check

# Refs: SPEC-03 (two-issuer edge check), SPEC-06 (security), api-contract.md §3
# Invariants: INV-G2 (deny by default), INV-G5 (advisory not terminal), INV-G6 (two issuers)

Background:
  Given the gateway is running with the eight business routes configured
  And the ACS JWKS and the EDGE JWKS are reachable

Scenario Outline: Anonymous allow-list paths bypass the edge check
  Given no Authorization header
  When a <method> request is sent to "<path>"
  Then the edge check is not applied
  And the request is admitted to its downstream

  Examples:
    | method | path                           |
    | POST   | /acs/auth/login                |
    | GET    | /acs/.well-known/jwks.json     |
    | GET    | /edge/.well-known/jwks.json    |
    | POST   | /edge/devices/pair             |
    | GET    | /actuator/health               |

Scenario: A protected route without a token is rejected at the edge
  Given no Authorization header
  When a GET request is sent to "/pat/commands"
  Then the response status is 401
  And no downstream is called

Scenario: A protected route with a valid ACS token is admitted
  Given a valid ACS token
  When a GET request is sent to "/pat/commands"
  Then the request is admitted to "lb://pat-service"

Scenario: An EDGE-signed device token is admitted (two issuers trusted)
  # INV-G6 / Risk R1 — must not require an ACS signature
  Given a valid EDGE token
  When a GET request is sent to "/edge/commands"
  Then the request is admitted to "lb://edge-service"

Scenario: A non-expiring patient-session token is admitted
  # Risk R2 — a token with no exp claim must not be rejected
  Given a valid patient-session token with no exp claim
  When a GET request is sent to "/conv/tree"
  Then the request is admitted to "lb://conv-service"

Scenario: A forged or wrong-issuer token is rejected at the edge
  Given a forged token signed by neither the ACS nor the EDGE JWKS
  When a GET request is sent to "/pat/commands"
  Then the response status is 401
  And no downstream is called

Scenario: A valid but under-privileged token is admitted at the edge and judged downstream
  # INV-G5 — the edge check is advisory, not terminal
  Given a valid ACS token lacking the required role for the target
  When a GET request is sent to "/hist/events"
  Then the request is admitted to "lb://hist-service"
  And the 403 decision, if any, is returned by the resource server, not the gateway
