Feature: Honest station detection liveness and safety
  As the patient station runtime
  I want the detector to stay awake and report its health honestly
  So that silence means "no gesture", never "dead detector"

  Background:
    Given a patient station with a valid "edge.device" identity
    And a loaded landmark model with a stub classifier

  Scenario: Acquire the Screen Wake Lock when detection starts
    Given the camera is granted and the model is ready
    When the detection runtime starts
    Then the system acquires the Screen Wake Lock
    And the system keeps the screen awake while detecting

  Scenario: Re-acquire the Wake Lock when the tab becomes visible
    Given the tab was hidden and the Wake Lock was released
    When the tab becomes visible again
    Then the system re-acquires the Screen Wake Lock and resumes the loop

  Scenario: Show an honest paused state while the tab is hidden
    When the station tab is hidden or backgrounded
    Then the system renders the always-visible detection-paused state
    And the system never renders a running or watching state

  Scenario: Show a degraded state when fps falls below the budget
    When sustained landmark fps is below the budget
    Then the system renders the detection-degraded state
    And the system does not report detection as running

  Scenario: Propagate liveness to caregivers through the EDGE heartbeat
    When the station reports liveness
    Then the system propagates station liveness through the EDGE heartbeat
    And the system invents no GEST liveness endpoint

  Scenario: Require a foregrounded kiosk tab
    When the operator views the status surface
    Then the system surfaces the keep-this-tab-in-the-foreground requirement

  Scenario: State that SAFETY-GEST-1 is closed by design and never claim EDGE connectivity alone proves detection is running
    When the operator views the status surface
    Then the system states that SAFETY-GEST-1 is closed by design
    And the system never claims that EDGE connectivity alone proves detection is actively running

  Scenario: Render detection unavailable when the camera is denied
    When the camera permission is denied
    Then the system renders detection unavailable as an honest station state
    And the system does not imply an active alarm

  # --- SAFETY-GEST-1: detectionState on the EDGE heartbeat (ADR-005 / EVNT ADR-006) ---

  Scenario Outline: Map the station runtime to the EDGE detectionState enum
    Given the station runtime state is "<runtime>"
    When the station builds its heartbeat detection state
    Then the reported detectionState is "<detectionState>" with reason "<reason>"

    Examples:
      | runtime        | detectionState | reason        |
      | loop-running   | RUNNING        |               |
      | tab-hidden     | PAUSED         | HIDDEN        |
      | camera-denied  | UNAVAILABLE    | CAMERA_DENIED |
      | model-failed   | UNAVAILABLE    | MODEL_FAILED  |
      | low-fps        | DEGRADED       | LOW_FPS       |
      | initializing   | UNAVAILABLE    |               |

  Scenario: Report RUNNING on the heartbeat only while the detection loop produces frames at an acceptable fps
    Given the camera is granted and the model is ready and the tab is visible
    When the detection loop produces frames at or above the fps budget
    Then the system reports detectionState RUNNING with a null reason

  Scenario: Never report RUNNING unless the detection loop is actually producing frames
    When the detection loop is not producing frames at an acceptable fps
    Then the system does not report detectionState RUNNING

  Scenario: Map a hidden tab to detectionState PAUSED with reason HIDDEN
    When the station tab becomes hidden
    Then the system maps the runtime to detectionState PAUSED with reason HIDDEN

  Scenario: Map a denied camera to detectionState UNAVAILABLE with reason CAMERA_DENIED
    When the camera permission is denied or no camera device is present
    Then the system reports detectionState UNAVAILABLE with reason CAMERA_DENIED

  Scenario: Map a failed model to detectionState UNAVAILABLE with reason MODEL_FAILED
    When the landmark model failed to load
    Then the system reports detectionState UNAVAILABLE with reason MODEL_FAILED

  Scenario: Map a sustained low fps to detectionState DEGRADED with reason LOW_FPS
    When sustained landmark fps is below the budget or a thermal throttle is detected
    Then the system reports detectionState DEGRADED with reason LOW_FPS

  Scenario: Map a still-initializing runtime to UNAVAILABLE and never RUNNING
    When the runtime has not yet started the loop because the camera is requesting or the model is loading
    Then the system reports detectionState UNAVAILABLE and does not report RUNNING

  Scenario: Send the station heartbeat from the single EDGE liveness sender, never a second GEST sender
    When the station reports its detection state
    Then the system routes the station heartbeat through the single EDGE station-liveness sender
    And the system does not open a second heartbeat sender from GEST

  Scenario: Publish the mapped detectionState to the EDGE station-liveness port without adding a GEST network call
    When the station runtime state changes
    Then the system publishes the mapped detectionState to the EDGE station-liveness port
    And the system does not add a fourth network call from GEST

  Scenario: Send the periodic heartbeat on a cadence below the EDGE detection-lapse window
    When the station sends its periodic heartbeat
    Then the system sends the periodic heartbeat on a cadence below the EDGE detection-lapse window
    And a single dropped beat is not treated as a lapse

  Scenario: Send an immediate heartbeat on every detectionState transition
    When the reported detectionState transitions to a new value
    Then the system sends an immediate heartbeat carrying the new detectionState
    And the system keeps the periodic cadence as well

  Scenario: Use a keepalive fetch so the hidden-transition heartbeat survives backgrounding
    When the station transitions to hidden
    Then the system sends the final heartbeat with a keepalive fetch
    And the heartbeat survives the tab being backgrounded

  Scenario: Carry the station detectionState on the EDGE heartbeat to tell not-detecting from offline
    When the station sends its heartbeat
    Then the system carries the station detectionState on the EDGE heartbeat
    And EDGE distinguishes a connected-but-not-detecting station from an offline one

  Scenario: Alert caregivers after the detection-lapse threshold via EDGE raising a lapse to EVNT
    When the station stops reporting RUNNING beyond the EDGE detection-lapse threshold
    Then the system relies on EDGE raising a lapse to EVNT
    And caregivers are alerted and escalated

  Scenario: A powered-off station cannot send PAUSED but its stopped heartbeat still trips the EDGE lapse
    Given the station device is powered off or its page process is suspended
    When no PAUSED beat can be sent
    Then the system relies on the stopped heartbeat tripping the EDGE lapse
    And caregivers are still alerted
