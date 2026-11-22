Feature: Command catalog
  As a family caregiver in the active tenant
  I want to see the patient's command catalog
  So that I can review and calibrate the configured commands

  Background:
    Given a signed-in caregiver with authority "pat.command.read"
    And the active tenant is resolved from the session

  Scenario: Load the active command catalog and render urgency and sensitivity
    Given the patient has active commands in the catalog
    When the caregiver opens the command catalog
    Then the system renders a command row for each active command with its urgency and sensitivity
    And the system does not render any retired command in the active catalog list

  Scenario: Show the empty state when the patient has no active command
    Given the patient has no active command
    When the caregiver opens the command catalog
    Then the system renders the empty state

  Scenario: Render a page error with a Retry affordance when the catalog load fails
    Given the catalog load fails
    When the caregiver opens the command catalog
    Then the system renders a page error with a Retry affordance

  Scenario: Hide the New command action when the session lacks create authority
    Given a signed-in caregiver without authority "pat.command.create"
    When the caregiver opens the command catalog
    Then the system hides the New command action

  Scenario: Redirect to login when the session is absent on a PAT route
    Given the session is absent
    When the caregiver navigates to the command catalog
    Then the system redirects to the login route and does not render the catalog surface

  Scenario: Deny the catalog to a patient-session token with no pat authority
    Given a patient-session token that carries only conv and gest authorities
    When the token navigates to the command catalog
    Then the system denies the route because the token carries no pat authority

  Scenario: The command catalog uses the http data adapter by default
    Given the PAT module is provided with its default configuration
    When the caregiver opens the command catalog
    Then the system uses the http data adapter by default and does not use the mock adapter

  Scenario: Every PAT action is evaluated through the AccessDecisionService and not an inline role
    Given a signed-in caregiver on the command catalog
    When the system decides whether to show each PAT action
    Then the system evaluates every PAT action through the AccessDecisionService decision and does not evaluate a role inline in a component

  Scenario: Leaving the catalog unregisters breadcrumbs clears module signals and stops the webcam stream
    Given the caregiver is on the command catalog with the editor open and a live webcam stream running
    When the caregiver leaves the PAT surface and the module is destroyed
    Then the system unregisters its breadcrumbs, clears the module-local facade signals and stops the open webcam stream
