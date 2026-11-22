Feature: Caregiver list states
  As a caregiver
  I want the caregiver list to reflect loading, empty and error states
  So that I always understand what the access roster is doing

  Background:
    Given a signed-in caregiver on the caregivers surface

  Scenario: While the caregiver list is loading the system renders the skeleton and not the empty state
    When the caregiver list request is loading
    Then the system renders the list skeleton
    And the system does not render the empty state

  Scenario: While the caregiver list is success and rows are empty the system renders the empty state
    When the caregiver list loads successfully with no rows
    Then the system renders the empty state

  Scenario: When the caregiver list request fails the system renders a page error with a retry affordance and does not auto-retry
    When the caregiver list request fails
    Then the system renders a page error with a retry affordance
    And the system does not auto-retry the request

  Scenario: Navigation into caregivers fetches fresh data and does not serve a stale ACS cache
    When the caregiver navigates into the caregivers surface
    Then the system fetches fresh caregiver data
    And the system does not serve a stale ACS cache

  Scenario: A tenant switch invalidates any future ACS cache
    When the active tenant changes via tenant-context switchTo
    Then the system invalidates any future ACS cache
