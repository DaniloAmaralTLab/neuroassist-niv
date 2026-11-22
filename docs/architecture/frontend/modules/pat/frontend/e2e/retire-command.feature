Feature: Retire command
  As a family caregiver
  I want to retire a command that is no longer used
  So that the active catalog stays clean for the detection engine

  Background:
    Given a signed-in caregiver with authority "pat.command.retire"
    And the caregiver opens the command catalog

  Scenario: Retire an active command and drop it from the active catalog list
    Given an active command in the catalog
    When the caregiver confirms the retire action
    Then the system sends a DELETE to retire the command, awaits the 204 and drops the command from the active catalog list

  Scenario: Retiring an already-retired command is an idempotent no-op
    Given a command that is already retired
    When the caregiver confirms the retire action
    Then the system treats the 204 as success and makes no further change to the catalog
