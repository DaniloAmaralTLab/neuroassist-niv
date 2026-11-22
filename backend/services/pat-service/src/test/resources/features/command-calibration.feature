Feature: Command calibration and gesture composition

# Covers SPEC-02; invariants INV-PAT-3, INV-PAT-4, INV-PAT-5.
# CommandCalibrated is the anchor action, emitted on both create and re-calibrate.

Background:
  Given a caregiver authenticated with a tenant-scoped ACS JWT for tenant "T1"
  And the caregiver holds authorities "pat.command.create, pat.command.read, pat.command.calibrate, pat.command.retire"
  And a patient "P1" with status "active" in tenant "T1"
  And the global gesture-type catalog contains "BLINK" and "EYEBROW_RAISE"

Scenario: Create a simple command
  When the caregiver creates a command on patient "P1" with label "suction", urgency "emergency", sensitivity "medium", primaryPrimitive "BLINK", minGestureTimeMs 300 and maxGestureTimeMs 1200
  Then the response status is 201
  And the command has status "active"
  And a "CommandCalibrated" action is audited to HIST with changeKind "created"

Scenario: Create a compound command with a distinct secondary primitive
  When the caregiver creates a command on patient "P1" with primaryPrimitive "BLINK" and secondaryPrimitive "EYEBROW_RAISE"
  Then the response status is 201

Scenario: Reject a command whose secondary primitive equals the primary
  When the caregiver creates a command on patient "P1" with primaryPrimitive "BLINK" and secondaryPrimitive "BLINK"
  Then the response status is 400
  And the problem type is "validation-error"

Scenario: Reject a command referencing an unknown primitive
  When the caregiver creates a command on patient "P1" with primaryPrimitive "UNKNOWN_CODE"
  Then the response status is 400
  And the problem type is "unknown-gesture-type"

Scenario Outline: Reject an invalid calibration window
  When the caregiver creates a command on patient "P1" with minGestureTimeMs <min> and maxGestureTimeMs <max>
  Then the response status is 400
  And the problem type is "validation-error"

  Examples:
    | min | max |
    | 0   | 500 |
    | -1  | 500 |
    | 800 | 300 |

Scenario: Re-calibrate an active command
  Given an active command "C1" on patient "P1" with sensitivity "medium" and maxGestureTimeMs 1200
  When the caregiver calibrates command "C1" setting sensitivity "high" and maxGestureTimeMs 1500
  Then the response status is 200
  And command "C1" has sensitivity "high" and maxGestureTimeMs 1500
  And a "CommandCalibrated" action is audited to HIST with changeKind "recalibrated"

Scenario: Retire a command and exclude it from the active catalog
  Given an active command "C1" on patient "P1"
  When the caregiver retires command "C1"
  Then the response status is 204
  And command "C1" has status "retired"
  And a "CommandRetired" action is audited to HIST
  And reading the active catalog of patient "P1" does not include command "C1"

Scenario: A retired command cannot be re-calibrated
  Given a retired command "C1" on patient "P1"
  When the caregiver calibrates command "C1"
  Then the response status is 409
  And the problem type is "command-retired"

Scenario: Re-retiring a retired command is idempotent
  Given a retired command "C1" on patient "P1"
  When the caregiver retires command "C1"
  Then the response status is 204
  And no second "CommandRetired" action is audited
