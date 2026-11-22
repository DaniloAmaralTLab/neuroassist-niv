Feature: Add command
  As a family caregiver
  I want to add a command with its gesture and calibration window
  So that the detection engine can map the gesture to the patient's need

  Background:
    Given a signed-in caregiver with authority "pat.command.create"
    And the caregiver opens the command catalog
    And the gesture-type vocabulary is loaded

  Scenario: Add a command with label urgency gesture sensitivity and a min max duration window
    Given the caregiver opens the command editor in new mode
    When the caregiver enters a label, picks an urgency, selects a gesture, sets a sensitivity and a min and max gesture duration
    And the caregiver saves the command
    Then the system sends the create request with the label, urgency, sensitivity, primary primitive and the min and max gesture time and does not drop any required field
    And the new command is prepended to the catalog after the server confirms

  Scenario: Keep save disabled while the label is blank
    Given the caregiver opens the command editor in new mode
    When the label is blank
    Then the system keeps the save control disabled and does not send the request

  Scenario: Keep save disabled while the minimum gesture time is not less than the maximum
    Given the caregiver opens the command editor in new mode
    When the minimum gesture time is not less than the maximum gesture time
    Then the system keeps the save control disabled and shows a duration field error

  Scenario: Add a compound command with a second primitive and recommend a live test
    Given the caregiver opens the command editor in new mode
    When the caregiver adds a second gesture primitive distinct from the primary
    Then the system marks the command as compound and recommends a live test without forcing it
