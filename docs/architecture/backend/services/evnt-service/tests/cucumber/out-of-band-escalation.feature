# Covers SPEC-11 (ESC-1..ESC-7) + ADR-005: out-of-band emergency escalation.
# Tiers (defaults): Tier 0 Web Push @ T+0, Tier 1 SMS @ T+30s, Tier 2 Voice @ T+90s,
# while the emergency stays unconfirmed. Stop on confirm; provider-failure fallback; idempotency.

Feature: Out-of-band emergency escalation

Background:
  Given a tenant "t1" with patient "p1"
  And caregiver "c1" is linked to patient "p1" in tenant "t1"
  And escalation timings are push "0" s, sms "30" s, voice "90" s
  And the escalation sweep runs every "5" s

Scenario: Tier 0 Web Push fires on emergency commit
  Given caregiver "c1" has an active push subscription "sub-c1"
  When an emergency event "e1" is committed for patient "p1"
  Then a Tier 0 "web_push" attempt to "sub-c1" is recorded with status "sent"
  And an "EscalationAttempted" audit is recorded for event "e1" tier "0"

Scenario: SMS fires only after the configured delay while still unconfirmed
  Given caregiver "c1" has phone "+5511999990000" from ACS with consent
  And emergency event "e1" for patient "p1" has been unconfirmed for "30" s
  When the escalation sweep runs
  Then a Tier 1 "sms" attempt to "+5511999990000" is recorded with status "sent"

Scenario: Voice fires after the longer delay while still unconfirmed
  Given caregiver "c1" has phone "+5511999990000" from ACS with consent
  And emergency event "e1" for patient "p1" has been unconfirmed for "90" s
  When the escalation sweep runs
  Then a Tier 2 "voice" attempt to "+5511999990000" is recorded with status "sent"

Scenario: Confirmation stops escalation immediately
  Given emergency event "e1" for patient "p1" has been unconfirmed for "30" s
  And caregiver "c1" confirms event "e1"
  When the escalation sweep runs at "T+90" s
  Then no Tier 2 "voice" attempt is recorded for event "e1"

Scenario: Provider failure records a failed attempt and advances to the next tier
  Given caregiver "c1" has phone "+5511999990000" from ACS with consent
  And the SMS provider fails for event "e1"
  And emergency event "e1" for patient "p1" has been unconfirmed for "30" s
  When the escalation sweep runs
  Then a Tier 1 "sms" attempt is recorded with status "failed" and reason "provider-error"
  And a Tier 2 "voice" attempt is still attempted at its due time
  And the failure is audited and never silent

Scenario: Missing caregiver phone fails SMS/voice but Web Push still applies
  Given caregiver "c1" has an active push subscription "sub-c1"
  And ACS exposes no phone for caregiver "c1"
  And emergency event "e1" for patient "p1" has been unconfirmed for "90" s
  When the escalation sweep runs
  Then a Tier 0 "web_push" attempt to "sub-c1" is recorded with status "sent"
  And a Tier 1 "sms" attempt is recorded with status "failed" and reason "no-contact"

Scenario: A tier is never attempted twice for the same event and target (idempotency)
  Given caregiver "c1" has phone "+5511999990000" from ACS with consent
  And a Tier 1 "sms" attempt to "+5511999990000" for event "e1" already exists
  When the escalation sweep runs again for event "e1"
  Then no second Tier 1 "sms" attempt to "+5511999990000" is recorded for event "e1"

Scenario Outline: Each tier targets every linked caregiver at its due time
  Given caregivers "c1" and "c2" are linked to patient "p1"
  And emergency event "e1" for patient "p1" has been unconfirmed for "<elapsed>" s
  When the escalation sweep runs
  Then a Tier <tier> "<channel>" attempt is recorded for "c1" and for "c2"

  Examples:
    | elapsed | tier | channel  |
    | 0       | 0    | web_push |
    | 30      | 1    | sms      |
    | 90      | 2    | voice    |
