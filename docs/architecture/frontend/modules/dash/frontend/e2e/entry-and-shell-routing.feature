Feature: Entry ownership and shell routing
  As the app shell
  I want the static entry screen owned by the shell and the home guards enforced
  So that authentication lives at the shell/ACS boundary, not inside DASH
  Covers: SPEC-01 (entry not a DASH route, guards), SPEC-06 (entry promotion, active-patient push)

  Scenario: entry is a shell route, not a DASH route
    When the DASH route table is inspected
    Then "entry" is a shell route owned by the shell
    And "entry" is not registered in DASH_ROUTES

  Scenario: entry is promoted as a shell route into the ACS login flow
    Given the promote phase runs for DASH
    Then the entry screen is promoted as a shell route
    And its sign-in call-to-action routes into the ACS login flow

  Scenario: authGuard redirects an unauthenticated caregiver from home to the login flow
    Given a caregiver with no active session
    When the caregiver requests "/home"
    Then authGuard redirects the caregiver to the ACS login flow
    And the overview is not rendered

  Scenario: dashGuard denies home and redirects to a safe fallback
    Given the dashGuard denies access to "/home"
    When the caregiver requests "/home"
    Then the system redirects to a safe fallback route
    And the overview is not rendered

  Scenario: Shell pushes the active patient to the composed modules
    Given the shell resolves the authenticated caregiver linked patient
    When the home overview initialises
    Then the shell pushes that patient id to each composed module integration seam
    And DASH chooses no patient of its own
