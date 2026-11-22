Feature: Heartbeat and liveness watchdog

# Covers SPEC-02 (heartbeat + watchdog) and SPEC-07; invariant INV-EDGE-4.
# Connectivity online<->offline is driven by heartbeats vs the missed-heartbeat threshold.

Background:
  Given a tenant "T1" with a patient "P1"
  And a paired device "D1" with a live edge.device token holding "edge.heartbeat.record"

Scenario: A heartbeat marks the device online
  When the device posts a heartbeat
  Then the response status is 200
  And the device connectivity is "online"

Scenario: The watchdog flips a silent device offline once
  Given the device has been silent beyond the offline threshold
  When the watchdog scans
  Then the device connectivity is "offline"
  And a "DeviceWentOffline" audit is recorded to HIST

Scenario: A repeated watchdog scan does not re-emit offline
  Given the device connectivity is already "offline"
  When the watchdog scans again
  Then no second "DeviceWentOffline" audit is recorded

Scenario: A resumed heartbeat brings the device back online
  Given the device connectivity is "offline"
  When the device posts a heartbeat
  Then the device connectivity is "online"
  And a "DeviceCameOnline" audit is recorded to HIST

Scenario: Heartbeat within the refresh window returns a refreshed short-TTL token
  Given the device token is within its refresh window
  When the device posts a heartbeat
  Then the response status is 200
  And the response carries a refreshedToken

Scenario: A non-paired device cannot record a heartbeat
  Given device "D1" has been deactivated
  When the device posts a heartbeat
  Then the response status is 403

Scenario: A revoked credential is rejected on heartbeat
  Given the device credential has been revoked
  When the device posts a heartbeat with the revoked token
  Then the response status is 401
