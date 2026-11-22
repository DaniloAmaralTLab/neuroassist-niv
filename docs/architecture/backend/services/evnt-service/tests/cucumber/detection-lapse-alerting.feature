# Covers SPEC-12 (LAPSE-1..LAPSE-7) + ADR-006: detection-lapse alerting (SAFETY-GEST-1).
# EDGE raises a detection lapse (station connected but not detecting, or heartbeat stopped) over a
# service-client token; EVNT surfaces a distinct alert to linked caregivers and escalates out-of-band
# reusing the SPEC-11 ladder (Web Push -> SMS -> voice) until resolved or acknowledged. A real
# emergency always outranks a lapse.

Feature: Detection-lapse alerting

Background:
  Given a tenant "t1" with patient "p1" on device "d1"
  And caregiver "c1" is linked to patient "p1" in tenant "t1"
  And EDGE holds an "edge-service" service-client token for the EVNT detection-lapse authorities
  And escalation timings are push "0" s, sms "30" s, voice "90" s

Scenario: EDGE raises a detection lapse and EVNT opens an episode
  When EDGE raises a detection lapse for device "d1" patient "p1" cause "NOT_RUNNING" with idempotency key "ep-1"
  Then the detection lapse "ep-1" is persisted with status "open"
  And a "DetectionLapseRaised" audit is recorded for the lapse "ep-1"

Scenario: Tier 0 Web Push fires on an open lapse
  Given caregiver "c1" has an active push subscription "sub-c1"
  And a detection lapse "ep-1" for patient "p1" is open
  When the escalation sweep runs
  Then a Tier 0 "web_push" attempt to "sub-c1" is recorded for lapse "ep-1" with status "sent"
  And an "EscalationAttempted" audit is recorded for lapse "ep-1" tier "0"

Scenario: SMS fires after the configured delay while the lapse stays open
  Given caregiver "c1" has phone "+5511999990000" from ACS with consent
  And a detection lapse "ep-1" for patient "p1" has been open for "30" s
  When the escalation sweep runs
  Then a Tier 1 "sms" attempt to "+5511999990000" is recorded for lapse "ep-1" with status "sent"

Scenario: EDGE resolve stops escalation immediately
  Given a detection lapse "ep-1" for patient "p1" has been open for "30" s
  And EDGE resolves the detection lapse "ep-1" on the first "RUNNING" heartbeat
  When the escalation sweep runs at "T+90" s
  Then no Tier 2 "voice" attempt is recorded for lapse "ep-1"
  And a "DetectionLapseResolved" audit is recorded for the lapse "ep-1"

Scenario: Caregiver acknowledgement stops escalation
  Given a detection lapse "ep-1" for patient "p1" has been open for "30" s
  And caregiver "c1" acknowledges the detection lapse "ep-1"
  When the escalation sweep runs at "T+90" s
  Then no Tier 2 "voice" attempt is recorded for lapse "ep-1"
  And a "DetectionLapseAcknowledged" audit is recorded for the lapse "ep-1"

Scenario: A replayed raise after resolution does not restart escalation (ordering safety)
  Given a detection lapse "ep-1" for patient "p1" is resolved
  When EDGE raises a detection lapse for device "d1" patient "p1" cause "NOT_RUNNING" with idempotency key "ep-1"
  Then the existing detection lapse "ep-1" is returned with status "resolved"
  And no new escalation tier is started for lapse "ep-1"

Scenario: Resolve of an unknown lapse is rejected
  When EDGE resolves the detection lapse "unknown-lapse"
  Then the resolve is rejected with status "404"

Scenario: An unconfirmed emergency outranks a lapse alert
  Given a detection lapse "ep-1" for patient "p1" has been open for "30" s
  And patient "p1" has an unconfirmed emergency event "e1"
  When the escalation sweep runs
  Then no new detection-lapse tier is started for patient "p1"
  And the lapse "ep-1" is not surfaced as an emergency

Scenario: The station token cannot raise a detection lapse
  When a station presents an "edge.device" token to raise a detection lapse
  Then the raise is rejected with status "401"

Scenario: A lapse is visible on the distinct caregiver list, not the active-alarm
  Given a detection lapse "ep-1" for patient "p1" is open
  When caregiver "c1" lists detection lapses for patient "p1"
  Then the detection lapse "ep-1" is returned on the list
  And the active-alarm for patient "p1" does not contain the lapse "ep-1"

Scenario: An unlinked caregiver cannot read a patient's lapses
  Given caregiver "c2" is not linked to patient "p1"
  When caregiver "c2" lists detection lapses for patient "p1"
  Then the list is rejected with status "404"

Scenario Outline: Each lapse tier targets the linked caregiver at its due time
  Given caregiver "c1" has an active push subscription "sub-c1"
  And caregiver "c1" has phone "+5511999990000" from ACS with consent
  And a detection lapse "ep-1" for patient "p1" has been open for "<elapsed>" s
  When the escalation sweep runs
  Then a Tier <tier> "<channel>" attempt is recorded for lapse "ep-1" and caregiver "c1"

  Examples:
    | elapsed | tier | channel  |
    | 0       | 0    | web_push |
    | 30      | 1    | sms      |
    | 90      | 2    | voice    |
