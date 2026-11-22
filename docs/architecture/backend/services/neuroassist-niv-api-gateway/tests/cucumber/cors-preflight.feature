Feature: CORS preflight and origin allow-list

# Refs: SPEC-06 (security), ADR-004, Risk R6

Background:
  Given the gateway is running with the eight business routes configured
  And the caregiver-shell origin "https://shell.neuroassist.niv" is on the CORS allow-list

Scenario: A preflight from an allowed origin is answered at the edge
  When an OPTIONS preflight is sent to "/pat/commands" from origin "https://shell.neuroassist.niv"
  Then the gateway answers the preflight without calling any downstream
  And the response allows origin "https://shell.neuroassist.niv"
  And the response allows methods "GET, POST, DELETE, OPTIONS"
  And the response exposes header "X-Correlation-Id"

Scenario: A preflight from a non-allow-listed origin is blocked
  When an OPTIONS preflight is sent to "/pat/commands" from origin "https://evil.example.com"
  Then the response does not allow origin "https://evil.example.com"

Scenario: Credentials are never paired with a wildcard origin
  When the CORS policy is inspected
  Then no allowed origin is "*" while allow-credentials is true
