Feature: Device enrollment and code-based pairing

# Covers SPEC-02 (enroll -> claim) and SPEC-06; invariants INV-EDGE-1, INV-EDGE-2, INV-EDGE-3.
# The station claims a single-use code and receives its edge.device token; the same flow serves the mobile station (ADR-014).

Background:
  Given a tenant "T1" with a patient "P1"

Scenario: Coordinator enrolls a device and receives a one-time pairing code
  Given a coordinator token with authority "edge.device.enroll"
  When it enrolls a device for patient "P1"
  Then the response status is 201
  And the device lifecycleState is "awaiting_claim"
  And the response carries a one-time pairingCode and its expiry
  And a "DeviceEnrolled" audit is recorded to HIST

Scenario: Station claims the code and becomes a paired, credentialed device
  Given an enrolled device "D1" in "awaiting_claim" with a valid pairing code
  When the station claims the code via header "X-Pairing-Code"
  Then the response status is 200
  And the response carries an edge.device token with actorType "edge-device"
  And the token authorities are exactly "edge.heartbeat.record, edge.catalog.read"
  And the device lifecycleState is "paired"
  And a "DevicePaired" audit is recorded to HIST

Scenario: The edge.device token never carries management or cross-domain authority
  Given a paired device "D1" with a live edge.device token
  Then the token has no authority matching "edge.device.*"
  And the token has no authority matching "acs.*"
  And the token has no authority matching "pat.*"

Scenario: A consumed pairing code cannot be reused
  Given an enrolled device "D1" whose pairing code was already claimed
  When the station claims the same code again via header "X-Pairing-Code"
  Then the response status is 401
  And the problem type is "invalid-pairing-code"
  And no new credential is minted

Scenario: An expired pairing code is rejected
  Given an enrolled device "D1" whose pairing code has expired
  When the station claims the code via header "X-Pairing-Code"
  Then the response status is 401
  And the problem type is "invalid-pairing-code"

Scenario: Pairing a device that is not awaiting claim conflicts
  Given a paired device "D1"
  When a station presents a code that resolves to device "D1"
  Then the response status is 409
  And the problem type is "device-not-claimable"

Scenario: The mobile station reuses the identical pairing flow
  Given an enrolled device "D2" in "awaiting_claim" with a valid pairing code
  When an Android Chromium station claims the code via header "X-Pairing-Code"
  Then the response status is 200
  And the device lifecycleState is "paired"

Scenario Outline: Only the coordinator may enroll
  Given a "<role>" token
  When it enrolls a device for patient "P1"
  Then the response status is <status>

  Examples:
    | role                | status |
    | CLINIC_COORDINATOR  | 201    |
    | CAREGIVER           | 403    |
