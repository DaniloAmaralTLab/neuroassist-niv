Feature: Device revocation, reactivation and token isolation

# Covers SPEC-06 and SPEC-02; invariants INV-EDGE-6, INV-EDGE-2, INV-EDGE-1.
# Revoke is terminal and immediate; the two token fabrics never cross; tenant isolation holds.

Background:
  Given a tenant "T1" with a patient "P1"
  And a paired device "D1" with a live edge.device token

Scenario: Revoking a credential is immediate and terminal
  Given a caregiver token holding "edge.device.revoke"
  When it revokes the credential of device "D1"
  Then the response status is 204
  And the device lifecycleState is "revoked"
  And the next request bearing the old edge.device token is rejected 401
  And a "DeviceRevoked" audit is recorded to HIST

Scenario: A revoked credential fails introspection
  Given device "D1" has been revoked
  And a service-client token
  When it introspects the old edge.device token at POST /edge/device-tokens/introspect
  Then the response status is 200
  And the introspection result active is false

Scenario: A revoked device is never reactivated
  Given device "D1" has been revoked
  And a coordinator token holding "edge.device.activate"
  When it reactivates device "D1"
  Then the response status is 409
  And the problem type is "device-revoked"

Scenario: Deactivate is reversible and reactivation re-issues a fresh credential
  Given a coordinator token holding "edge.device.deactivate"
  When it deactivates device "D1"
  Then the response status is 204
  And the device lifecycleState is "deactivated"
  When a coordinator reactivates device "D1" with authority "edge.device.activate"
  Then the response status is 200
  And the device lifecycleState is "paired"
  And a new credentialId is issued
  And the device connectivity is "offline"

Scenario: Unpair breaks the binding, kills the credential and drops the cache
  Given a coordinator token holding "edge.device.unpair"
  When it unpairs device "D1"
  Then the response status is 204
  And the cached catalog for device "D1" is dropped
  And the old edge.device token is rejected 401
  And a "DeviceUnpaired" audit is recorded to HIST

Scenario: A patient-session token is rejected on every EDGE endpoint
  Given a request bearing a patient-session token with authorities "conv.read, gest.read" only
  When it reads GET /edge/devices
  Then the response status is 403

Scenario: A human token is rejected on a device endpoint
  Given a caregiver token holding "edge.device.read"
  When it posts a heartbeat to POST /edge/heartbeat
  Then the response status is 403

Scenario: Cross-tenant device access is not found
  Given a coordinator token for tenant "T2"
  When it reads device "D1" of tenant "T1"
  Then the response status is 404

Scenario: An X-Tenant-Id header is ignored
  Given a coordinator token for tenant "T1"
  When it lists devices with header "X-Tenant-Id" set to "T2"
  Then the response status is 200
  And only devices of tenant "T1" are returned
