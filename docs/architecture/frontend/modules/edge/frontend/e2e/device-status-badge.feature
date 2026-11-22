Feature: Edge device connectivity status badge
  As any dashboard user
  I want the patient's edge device connectivity to always be visible
  So that device status is never hidden (Principle 2.6)

  Background:
    Given a signed-in caregiver with authority "edge.device.read"
    And a patient of the active tenant with a paired edge device

  Scenario: Keep the topbar device-status badge visible on every dashboard screen
    When the caregiver navigates across dashboard screens
    Then the system keeps the topbar device-status badge visible on every screen
    And the system does not hide the badge behind a submenu

  Scenario: While a paired device is online the system renders the online badge
    Given the paired device connectivity is online
    When the caregiver views the device-status badge
    Then the system renders the online badge

  Scenario: While a paired device is offline the system renders the amber offline badge and does not escalate it to an alarm
    Given the paired device connectivity is offline
    When the caregiver views the device-status badge
    Then the system renders the offline badge in the amber warning state
    And the system does not escalate the offline device to an alarm

  Scenario: While the device read is unavailable the system renders the status-unavailable state and not a defaulted online badge
    Given the edge-service device read is unavailable
    When the caregiver views the device-status badge
    Then the system renders the status-unavailable state
    And the system does not render a defaulted online badge

  Scenario: Read connectivity from the backend projection and do not infer online or offline from a client timer
    When the caregiver views the device-status badge
    Then the system reads connectivity from the backend device projection
    And the system does not infer online or offline from a client-side timer

  Scenario: While a device has no version field from the backend the system omits the version line and renders no placeholder
    Given the backend device record has no version field
    When the caregiver views the edge-device card
    Then the system omits the version line
    And the system does not render a placeholder version value

  Scenario: While the device status is loading the system renders the badge skeleton and not a connectivity value
    Given the device status is loading
    When the caregiver views the device-status badge
    Then the system renders the badge skeleton
    And the system does not render a connectivity value

  Scenario: The system defaults the EDGE data adapter to http and uses the mock adapter only under an explicit mock provider
    When the shell provides the EDGE data access adapter
    Then the system defaults the EDGE data adapter to http
    And the system uses the mock adapter only under an explicit mock provider

  Scenario: When the active tenant changes via tenant-context switchTo the system invalidates any future EDGE state
    When the active tenant changes via tenant-context switchTo
    Then the system invalidates any future EDGE state

  Scenario: While a paired device is online and its detection state is RUNNING the system renders the detecting state
    Given the paired device connectivity is online
    And the paired device detection state is "RUNNING"
    When the caregiver views the device-status badge
    Then the system renders the detecting state on the device surface

  Scenario Outline: While a paired online device is not detecting the system renders the connected-but-not-detecting warning with its reason
    Given the paired device connectivity is online
    And the paired device detection state is "<detectionState>"
    And the paired device detection reason is "<reason>"
    When the caregiver views the device-status badge
    Then the system renders the connected-but-not-detecting warning with its detection reason
    And the system does not render it as detecting

    Examples:
      | detectionState | reason       |
      | PAUSED         | HIDDEN       |
      | DEGRADED       | LOW_FPS      |
      | UNAVAILABLE    | CAMERA_DENIED |
      | UNKNOWN        | MODEL_FAILED |

  Scenario: While a device is offline the system renders the offline state and not a detecting state
    Given the paired device connectivity is offline
    And the paired device detection state is "RUNNING"
    When the caregiver views the device-status badge
    Then the system renders the offline state
    And the system does not render a detecting state regardless of the last reported detection state

  Scenario: While a device read omits the detection state the system treats it as unknown and not detecting
    Given the backend device read omits the detection state
    When the caregiver views the device-status badge
    Then the system treats the detection state as unknown
    And the system does not render it as detecting

  Scenario: The system renders detection state distinct from connectivity and does not compute it from a client timer
    When the caregiver views the device-status badge
    Then the system renders detection state as a signal distinct from connectivity
    And the system does not compute detection state from a client-side timer
