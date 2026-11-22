Feature: Calibrate command
  As a family caregiver
  I want to recalibrate an existing command
  So that the gesture triggers reliably for the patient

  Background:
    Given a signed-in caregiver with authority "pat.command.calibrate"
    And the caregiver opens the command catalog

  Scenario: Recalibrate an active command and replace the row after the server confirms
    Given the caregiver opens the command editor in edit mode for an active command
    When the caregiver changes the sensitivity and the max gesture time and saves the calibration
    Then the system sends a PATCH with the changed fields and awaits the server response before replacing the command row

  Scenario: Show an inline banner when a calibration save hits a retired command
    Given the caregiver opens the command editor in edit mode
    When the backend responds command-retired
    Then the system shows an inline banner telling the caregiver to create a new command and does not re-tune the retired command

  Scenario: Map a validation error on calibration to the duration field without mutating the row
    Given the caregiver opens the command editor in edit mode
    When the backend responds validation-error on the calibration window
    Then the system maps the field detail to the duration field and does not mutate the command row
