Feature: Station detection-liveness heartbeat sender (SAFETY-GEST-1)
  As the Patient-Mode station runtime
  I want libs/edge to be the single station heartbeat sender carrying detection state
  So that a connected-but-not-detecting station is surfaced and escalated, with no second sender

  Background:
    Given a paired patient station holding a valid edge.device token
    And GEST injects the libs/edge StationLivenessPort for detection-state publication

  Scenario: The system provides a single station-liveness sender and does not open a second heartbeat sender
    When the station runtime starts the detection loop
    Then the system provides a single station-liveness sender in libs/edge that implements StationLivenessPort
    And the system does not open a second heartbeat sender from GEST

  Scenario: When a consumer calls setDetectionState the system carries it on the next heartbeat and never reports RUNNING without a pushed state
    When GEST calls setDetectionState with state "PAUSED" and reason "HIDDEN"
    And the station-liveness sender posts its next heartbeat
    Then the system carries the given detection state, reason and engine version on the next heartbeat
    And the system does not report RUNNING when no detection state has been pushed

  Scenario: When a consumer calls beatNow the system sends an immediate out-of-cadence heartbeat
    Given GEST has pushed detection state "RUNNING"
    When GEST calls beatNow
    Then the system sends an immediate out-of-cadence heartbeat carrying the last pushed detection state

  Scenario: The system sends the periodic station heartbeat on a cadence at or below thirty seconds
    When the station-liveness sender runs its periodic cadence
    Then the system sends the periodic station heartbeat on a cadence at or below thirty seconds
    And a single dropped beat is not mistaken for a detection lapse

  Scenario: When the reported detection state transitions the system sends an immediate heartbeat with the new state
    Given GEST has pushed detection state "RUNNING"
    When the reported detection state transitions to "PAUSED"
    Then the system sends an immediate heartbeat carrying the new detection state in addition to the periodic cadence

  Scenario: When the station transitions to hidden the system sends the final heartbeat with a keepalive fetch and not sendBeacon
    When the station transitions to hidden on visibilitychange
    Then the system sends the final heartbeat with a keepalive fetch
    And the system does not use navigator.sendBeacon because it cannot carry the device bearer token

  Scenario: When a heartbeat response carries a refreshed edge-device token the system rotates the stored station token
    When the station-liveness sender receives a heartbeat response carrying a refreshed edge-device token
    Then the system rotates the stored station token
    And the system does not keep using the superseded token

  Scenario: The system sends the heartbeat only from the libs/edge sender and not from the caregiver dashboard
    When the caregiver dashboard renders the device-status surfaces
    Then the system sends POST /edge/heartbeat only from the libs/edge station-liveness sender on the edge.device token
    And the system does not send a heartbeat from the caregiver dashboard

  Scenario: The system mirrors the detection fields from the device read and does not fabricate them when absent
    When the caregiver dashboard reads the device projection
    Then the system mirrors detectionState, detectionStateSince, detectionReason, engineVersion and lastDetectingAt from the device read
    And the system does not fabricate a detection value when the backend omits it
