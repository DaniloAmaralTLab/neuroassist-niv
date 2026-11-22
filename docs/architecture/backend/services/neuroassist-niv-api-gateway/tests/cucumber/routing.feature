Feature: Path-predicate routing to lb:// downstreams

# Refs: SPEC-01 (api surface), SPEC-02 (routing and resilience), contracts/api-contract.md §2

Background:
  Given the gateway is running with the eight business routes configured
  And the ACS JWKS and the EDGE JWKS are reachable
  And a valid ACS token

Scenario Outline: A business path is forwarded to its logical downstream, full path preserved
  Given REG advertises an UP instance of "<service>"
  When a GET request is sent to "<path>"
  Then it is forwarded to "lb://<service>"
  And the forwarded path is "<path>" with no prefix stripped

  Examples:
    | path            | service      |
    | /acs/patients   | acs-service  |
    | /pat/commands   | pat-service  |
    | /hist/events    | hist-service |
    | /edge/devices   | edge-service |
    | /conv/tree      | conv-service |
    | /evnt/alarms    | evnt-service |
    | /gest/sessions  | gest-service |

Scenario: The gateway declares no route to infrastructure or backend-less modules
  When a GET request is sent to "/reg/anything"
  Then no downstream is called
  And the response status is 404

Scenario: The proposed TRN route resolves to no instance until TRN is deployed
  Given REG advertises no instance of "trn-service"
  When a GET request is sent to "/trn/sessions"
  Then the response status is 503
  And no partial or crashed response is returned
