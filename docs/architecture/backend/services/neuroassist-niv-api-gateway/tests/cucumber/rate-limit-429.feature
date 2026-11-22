Feature: Rate limiting for login and pairing

# Refs: SPEC-06 (security), ADR-005 (in-memory per-instance rate limit)

Background:
  Given the gateway is running with the eight business routes configured
  And the login rate-limit bucket allows 5 requests per minute per client
  And the pairing rate-limit bucket allows 10 requests per minute per client

Scenario: Login requests past the threshold are throttled
  Given no Authorization header
  When a POST request to "/acs/auth/login" is repeated 6 times within one minute from the same client
  Then the first 5 requests are forwarded to "lb://acs-service"
  And the 6th request returns status 429
  And the 6th request does not reach any downstream

Scenario: Pairing requests past the threshold are throttled
  Given no Authorization header
  When a POST request to "/edge/devices/pair" is repeated 11 times within one minute from the same client
  Then the 11th request returns status 429
  And the 11th request does not reach any downstream

Scenario: Other routes are not rate-limited at the edge
  Given a valid ACS token
  When a GET request to "/pat/commands" is repeated 50 times within one minute
  Then no request is throttled by the gateway
