Feature: Record opt-in minimal usage signals

# SPEC-02, SPEC-05 · api-contract §4 · INV-CONV-6 (no free text, opt-in)

Background:
  Given a patient-session token for patient "pat-1" in tenant "tenant-a"

Scenario: An opted-in patient's usage signal is recorded
  Given usage logging is opted in for patient "pat-1"
  When the station records usage for phrase "phr-suction" with key "pat-1:phr-suction:2026-11-20T12:05:00Z"
  Then the response status is 202
  And a usage signal with phraseId "phr-suction" and a timestamp is stored

Scenario: A repeated signal is idempotent
  Given usage logging is opted in for patient "pat-1"
  And a usage signal with key "pat-1:phr-suction:2026-11-20T12:05:00Z" already exists
  When the station records usage for phrase "phr-suction" with key "pat-1:phr-suction:2026-11-20T12:05:00Z"
  Then the response status is 200
  And no duplicate usage signal is stored

Scenario: An opted-out patient's signal is accepted but discarded
  Given usage logging is opted out for patient "pat-1"
  When the station records usage for phrase "phr-suction" with key "pat-1:phr-suction:2026-11-20T12:06:00Z"
  Then the response status is 202
  And no usage signal is stored

Scenario: Free text is rejected
  Given usage logging is opted in for patient "pat-1"
  When the station records usage with an extra free-text field
  Then the response status is 400
  And the problem type is "validation-error"

Scenario: Usage recording is never audited to HIST
  Given usage logging is opted in for patient "pat-1"
  When the station records usage for phrase "phr-suction" with key "pat-1:phr-suction:2026-11-20T12:07:00Z"
  Then no HIST audit fact is emitted

Scenario Outline: Only the minimal fields are accepted
  Given usage logging is opted in for patient "pat-1"
  When the station records usage for phrase "<phraseId>" with key "<key>"
  Then the response status is 202

  Examples:
    | phraseId   | key                                   |
    | phr-water  | pat-1:phr-water:2026-11-20T12:08:00Z  |
    | phr-comfort| pat-1:phr-comfort:2026-11-20T12:09:00Z|
