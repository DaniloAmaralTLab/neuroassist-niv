Feature: Eviction and self-preservation

# Refs: SPEC-02 (registry core), SPEC-03 (self-preservation/HA), contracts/api-contract.md §4-5, ADR-001

Background:
  Given the neuroassist-niv-service-registry (REG) is running as a single Eureka node

Scenario: A stale instance is evicted promptly in dev
  Given an instance of "edge-service" is registered and UP
  And self-preservation is disabled
  When the instance stops renewing its lease beyond the expiration window
  And the eviction loop runs while self-preservation is not active
  Then the registry removes the instance from discovery

Scenario: Self-preservation holds membership during a renewal-rate dip
  Given self-preservation is enabled
  And several instances are registered and UP
  When the fleet-wide renewal rate drops below the self-preservation threshold
  Then the registry stops evicting instances
  And the last known membership is preserved

Scenario: Eviction resumes when the renewal rate recovers
  Given self-preservation is enabled
  And self-preservation is active after a renewal-rate dip
  When the renewal rate recovers above the threshold
  Then the registry resumes normal eviction of expired instances

Scenario: A transient blip never flushes the registry to empty under self-preservation
  Given self-preservation is enabled
  And several instances are registered and UP
  When a transient network blip causes many heartbeats to be missed at once
  Then the registry continues to advertise the last known instances
  And no discovery query returns an empty result for a still-live service
