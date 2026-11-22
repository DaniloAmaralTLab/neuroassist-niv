# Covers SPEC-06 + api-contract §3. INV-EVNT-1/7 (tenant + ACS link scoping, anti-enumeration).
Feature: Event read scoping

Scenario: A caregiver reads events of a linked patient
  Given a caregiver token for "care-1" in tenant "t-1" linked to patient "pat-1"
  And patient "pat-1" has 2 events
  When the caregiver lists events for patient "pat-1"
  Then the response status is 200
  And 2 events are returned

Scenario: A caregiver cannot read events of an unlinked patient
  Given a caregiver token for "care-1" in tenant "t-1" linked to patient "pat-1"
  And patient "pat-2" exists in tenant "t-1" but is not linked to "care-1"
  When the caregiver lists events for patient "pat-2"
  Then the response status is 404

Scenario: Cross-tenant event read is hidden
  Given a caregiver token for "care-1" in tenant "t-1"
  And event "e-x" belongs to tenant "t-2"
  When the caregiver reads event "e-x"
  Then the response status is 404

Scenario: An X-Tenant-Id header is ignored
  Given a caregiver token for "care-1" in tenant "t-1" linked to patient "pat-1"
  When the caregiver lists events for patient "pat-1" with header "X-Tenant-Id: t-2"
  Then the response status is 200
  And only tenant "t-1" events are returned
