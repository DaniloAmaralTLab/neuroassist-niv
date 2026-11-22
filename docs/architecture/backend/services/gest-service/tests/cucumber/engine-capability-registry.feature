# Covers SPEC-02 (capability registry orchestration) + SPEC-06 (authority, INV-GEST-5).
Feature: Engine and capability registry administration

Background:
  Given an engine version "1.3.0" is registered and active
  And the caregiver token carries authority "gest.capability.create"

Scenario: Admin declares a new capability
  When the admin declares support "supported" for code "BLINK" on engine "1.3.0"
  Then the response status is 201
  And the capability has supportStatus "supported"
  And an "EngineCapabilityDeclared" audit fact is recorded to HIST

Scenario: Re-declare of an existing pair updates in place
  Given code "BLINK" on engine "1.3.0" is already "experimental"
  When the admin declares support "supported" for code "BLINK" on engine "1.3.0"
  Then the response status is 200
  And the capability has supportStatus "supported"
  And exactly one capability row exists for engine "1.3.0" and code "BLINK"

Scenario: Retiring a capability sets terminal unsupported and retains the row
  Given code "BLINK" on engine "1.3.0" is "supported"
  When the admin retires that capability
  Then the response status is 200
  And the capability has supportStatus "unsupported"
  And the capability row is still present
  And an "EngineCapabilityRetired" audit fact is recorded to HIST

Scenario: A read-only token cannot mutate the registry
  Given a station presents an edge.device token without "gest.capability.create"
  When it attempts to declare support "supported" for code "BLINK" on engine "1.3.0"
  Then the response status is 403
  And the registry is unchanged

Scenario: Declaring against a deprecated engine version is rejected
  Given engine version "1.2.0" is deprecated
  When the admin declares support "supported" for code "BLINK" on engine "1.2.0"
  Then the response status is 409
  And the problem type is "engine-version-deprecated"
