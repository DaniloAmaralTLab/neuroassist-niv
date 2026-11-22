Feature: Home overview composition and per-panel RBAC
  As a signed-in caregiver
  I want the home overview composed from the already-promoted modules
  So that I see one honest status without a second source of truth
  Covers: SPEC-01 (routing, no /dash), SPEC-04 (compose-only, refresh), SPEC-05 (self-gating), SPEC-03 (shell patient)

  Background:
    Given a caregiver with an active session and a linked patient supplied by the shell context

  Scenario: Default route after sign-in is the home overview
    When the caregiver completes sign-in
    Then the system routes to "/home" as the default dashboard destination
    And the home overview is rendered

  Scenario: Home overview composes only the published module APIs
    When the home overview mounts
    Then every region is read through the published index exports of hist, evnt, edge and pat
    And no HTTP adapter exists in libs/dash

  Scenario: Home overview calls no /dash endpoint
    When the home overview loads and refreshes
    Then the system issues no request to any "/dash" endpoint
    And no /dash backend route is registered

  Scenario: Refresh re-reads every composed facade and re-derives status
    Given the home overview is showing a composed status
    When the caregiver refreshes the overview
    Then each composed facade is asked to re-read
    And the composite status is re-derived from the fresh reads

  Scenario: Overview scopes to the shell-provided patient with no picker
    Given the shell context supplies the active patient
    Then the overview is scoped to that patient
    And the overview presents no patient picker

  Scenario: Missing hist.history.read hides the day-KPI and recent-events panels
    Given the session lacks the authority "hist.history.read"
    When the home overview renders
    Then the day-KPI row is hidden
    And the recent-events preview panel is hidden

  Scenario: Missing edge.device.read hides the device-health panel
    Given the session lacks the authority "edge.device.read"
    When the home overview renders
    Then the device-health panel is hidden

  Scenario: Missing evnt.event.read hides the alarm-status and routine-notice panels
    Given the session lacks the authority "evnt.event.read"
    When the home overview renders
    Then the alarm-status panel is hidden
    And the routine-notice panel is hidden

  Scenario: Missing pat.command.read hides the command-catalog summary panel
    Given the session lacks the authority "pat.command.read"
    When the home overview renders
    Then the command-catalog summary panel is hidden

  Scenario: Permission map uses only composed authorities and no dash authority
    When the DASH permission map is inspected
    Then it contains only the composed modules authorities
    And it introduces no "dash" authority

  Scenario: Every DASH gate goes through the AccessDecisionService can-check
    When any DASH surface gate is evaluated
    Then the decision goes through the AccessDecisionService can-check
    And no guard returns a hardcoded true

  Scenario: Suggestion flag off hides the inline advisory card
    Given the feature flag "dash.suggestion.enabled" is off
    When the home overview renders
    Then the inline advisory card is hidden

