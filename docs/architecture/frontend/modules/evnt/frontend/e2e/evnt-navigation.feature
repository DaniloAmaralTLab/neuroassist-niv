Feature: EVNT routing, guards and providers
  As the shell
  I want EVNT routes guarded and lazy-loaded with the correct adapter default
  So that the alarm surface is secure, fast and backed by the real backend

  Background:
    Given the shell lazy-loads "@neuroassist/evnt"

  Scenario: When a signed-in caregiver with read authority opens the alarm surface the system renders the alarm page
    Given a signed-in caregiver with authority "evnt.event.read"
    When the caregiver opens the alarm surface
    Then the system renders the full-screen "/alarm" page

  Scenario: If the session is absent on the alarm route the system redirects to login and renders no alarm surface
    Given there is no active session
    When a request reaches the "/alarm" route
    Then the system redirects to the login route
    And the system renders no EVNT alarm surface

  Scenario: If the read guard denies the alarm route the system redirects to the forbidden route and does not load the alarm feature
    Given a signed-in caregiver without authority "evnt.event.read"
    When the caregiver navigates to the "/alarm" route
    Then the system redirects to the forbidden route
    And the system does not load the alarm feature library

  Scenario: The system loads the EVNT alarm feature route lazily and does not eager-bundle it into the shell
    When the shell boots
    Then the system loads the EVNT alarm feature route lazily
    And the system does not eager-bundle the alarm feature library into the shell

  Scenario: The system defaults the EVNT data adapter to http and uses the mock adapter only under an explicit mock provider
    When the shell provides the EVNT data access adapter
    Then the system defaults the EVNT data adapter to http
    And the system uses the mock adapter only under an explicit mock provider

  Scenario: When the active tenant changes via tenant-context switchTo the system invalidates any future EVNT state
    When the active tenant changes via tenant-context switchTo
    Then the system invalidates any future EVNT state

  Scenario: The system evaluates the ingest authority as a device-token authority and does not expose it as a dashboard route guard or menu key
    When the shell registers the EVNT module descriptor
    Then the system evaluates "evnt.event.ingest" as a device-token authority only
    And the system does not expose it as an EVNT dashboard route, guard or menu key

  Scenario: The system treats the ingest authority as device-token only and does not include it in the permission map or any caregiver guard
    When the shell builds the EVNT permission map
    Then the system treats "evnt.event.ingest" as a device-token authority only
    And the system does not include it in the EVNT permission map or any caregiver guard

  Scenario: The system evaluates every EVNT action through AccessDecisionService and does not evaluate a role inline
    When a caregiver triggers any EVNT action
    Then the system evaluates the EVNT action through AccessDecisionService
    And the system does not evaluate a role inline in a component

  Scenario: The system uses the authority evnt.event.record for the feedback write and not the superseded evnt.event.feedback key
    When the module publishes its feedback authority
    Then the system uses the authority "evnt.event.record" for the feedback write
    And the system does not use the superseded "evnt.event.feedback" key
