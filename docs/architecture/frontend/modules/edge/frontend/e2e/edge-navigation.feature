Feature: EDGE routing and guards
  As the shell
  I want EDGE routes guarded and lazily loaded
  So that only authorized caregivers reach device surfaces and the shell stays lean

  Background:
    Given the shell has registered the EDGE module descriptor

  Scenario: When a caregiver navigates to the device route the system renders the edge-device status page for that patient
    Given a signed-in caregiver with authority "edge.device.read"
    When the caregiver navigates to the patient device route
    Then the system renders the edge-device status page for that patient

  Scenario: If the session is absent on an EDGE route the system redirects to login and renders no EDGE device surface
    Given the session is absent
    When the browser navigates to an EDGE device route
    Then the system redirects to the login route
    And the system does not render any EDGE device surface

  Scenario: If the read guard denies the device route the system redirects to the forbidden route and does not load the status feature
    Given a signed-in caregiver without authority "edge.device.read"
    When the caregiver navigates to the patient device route
    Then the system redirects to the forbidden route
    And the system does not load the device-status feature library

  Scenario: If the pair guard denies the pair route the system redirects to the forbidden route and does not load the pairing feature
    Given a signed-in caregiver without authority "edge.device.pair"
    When the caregiver navigates to the patient device pair route
    Then the system redirects to the forbidden route
    And the system does not load the device-pairing feature library

  Scenario: Load every EDGE feature route lazily and do not eager-bundle a feature library into the shell
    When the shell boots
    Then the system loads every EDGE feature route lazily via loadComponent
    And the system does not eager-bundle a feature library into the shell

  Scenario: The shell reserves the topbar device-status badge slot without eager-loading the EDGE feature libraries
    When the shell boots
    Then the system reserves the topbar device-status badge slot
    And the system does not eager-load the EDGE feature libraries to show it
