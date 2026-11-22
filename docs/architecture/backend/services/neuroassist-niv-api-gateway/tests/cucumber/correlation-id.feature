Feature: Correlation id propagation

# Refs: SPEC-07 (observability), ADR-007, INV-G4

Background:
  Given the gateway is running with the eight business routes configured
  And a valid ACS token
  And REG advertises an UP instance of "pat-service"

Scenario: A missing correlation id is generated, forwarded and echoed
  Given the request has no X-Correlation-Id header
  When a GET request is sent to "/pat/commands"
  Then the forwarded request carries a generated X-Correlation-Id
  And the response carries the same X-Correlation-Id

Scenario: An inbound correlation id is preserved, not overwritten
  Given the request carries X-Correlation-Id "abc-123"
  When a GET request is sent to "/pat/commands"
  Then the forwarded request carries X-Correlation-Id "abc-123"
  And the response carries X-Correlation-Id "abc-123"

Scenario: Two concurrent requests without a correlation id get distinct ids
  Given two concurrent requests with no X-Correlation-Id header
  When both are sent to "/pat/commands"
  Then each forwarded request carries a distinct X-Correlation-Id
