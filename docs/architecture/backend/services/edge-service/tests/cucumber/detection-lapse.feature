Feature: Detection state and detection-lapse escalation

# Covers ADR-005 (SAFETY-GEST-1) and SPEC-02 / SPEC-05 / SPEC-07 / SPEC-10;
# invariants INV-EDGE-9 (detection liveness != connectivity) and INV-EDGE-10 (single lapse episode).
# A station can be connected (online) yet NOT detecting; the heartbeat carries detectionState,
# and a scheduled sweep escalates a lapse to EVNT after N minutes (default 120 s).

Background:
  Given a tenant "T1" with a patient "P1"
  And a paired device "D1" with a live edge.device token holding "edge.heartbeat.record"
  And the detection-lapse threshold is 120 seconds

Scenario: A RUNNING heartbeat records detection state and advances lastDetectingAt
  When the device posts a heartbeat with detectionState "RUNNING"
  Then the response status is 200
  And the device detectionState is "RUNNING"
  And the device lastDetectingAt is updated

Scenario: A heartbeat that omits detectionState is recorded as UNKNOWN, never RUNNING
  When the device posts a heartbeat without a detectionState
  Then the response status is 200
  And the device detectionState is "UNKNOWN"
  And the device lastDetectingAt is not updated

Scenario: A connected station that is not detecting is distinguishable from offline on the read model
  Given the device posts a heartbeat with detectionState "PAUSED"
  When a caregiver reads GET /edge/devices/D1
  Then the device connectivity is "online"
  And the device detectionState is "PAUSED"

Scenario Outline: The sweep opens a lapse and raises it to EVNT when a connected station is not RUNNING
  Given the device last reported detectionState <state> beyond the lapse threshold
  When the detection-lapse sweep scans
  Then a detection-lapse episode is opened with cause "NOT_RUNNING"
  And the lapse is raised to EVNT with a service-client token and an idempotency key
  And a "DetectionLapseStarted" audit is recorded to HIST

  Examples:
    | state         |
    | "PAUSED"      |
    | "DEGRADED"    |
    | "UNAVAILABLE" |
    | "UNKNOWN"     |

Scenario: A fully off station that stopped beating still raises a lapse via the heartbeat-stop arm
  Given the device has sent no heartbeat beyond the lapse threshold
  When the detection-lapse sweep scans
  Then a detection-lapse episode is opened with cause "HEARTBEAT_STOPPED"
  And the lapse is raised to EVNT with a service-client token and an idempotency key

Scenario: A brief pause shorter than the threshold opens no lapse
  Given the device last reported detectionState "PAUSED" for 30 seconds
  When the detection-lapse sweep scans
  Then no detection-lapse episode is opened

Scenario: A repeated sweep over an already-open lapse opens no second episode and re-raises nothing
  Given device "D1" already has an open detection-lapse episode
  When the detection-lapse sweep scans again
  Then no second detection-lapse episode is opened
  And no second raise is sent to EVNT

Scenario: The first RUNNING heartbeat resolves an open lapse and notifies EVNT
  Given device "D1" already has an open detection-lapse episode
  When the device posts a heartbeat with detectionState "RUNNING"
  Then the open detection-lapse episode is resolved
  And EVNT is notified to resolve the episode
  And a "DetectionLapseResolved" audit is recorded to HIST

Scenario: EVNT unreachable on raise keeps the open episode for retry and never drops the lapse
  Given the device last reported detectionState "UNAVAILABLE" beyond the lapse threshold
  And EVNT is unreachable
  When the detection-lapse sweep scans
  Then the detection-lapse episode stays open and unraised
  And the lapse is scheduled for retry
