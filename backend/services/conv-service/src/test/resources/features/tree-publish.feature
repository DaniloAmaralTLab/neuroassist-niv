Feature: Publish a tree version from TRN

# SPEC-02, SPEC-05 · api-contract §5 · ADR-006 (hard-502) · INV-CONV-1/2/3

Background:
  Given a TRN service-client token for tenant "tenant-a"
  And patient "pat-1" has an active tree version 7 with ETag "sha256:aaa"

Scenario: Publishing a new version supersedes the previous one
  When TRN publishes a valid tree version for patient "pat-1" with key "trn:publish:appr-100"
  Then the response status is 201
  And the new version is active
  And the previous version 7 is superseded
  And a "TreePublished" fact and a "TreeVersionSuperseded" fact are audited to HIST

Scenario: Publish is idempotent on the approval key
  Given TRN already published with key "trn:publish:appr-100"
  When TRN publishes a valid tree version for patient "pat-1" with key "trn:publish:appr-100"
  Then the response status is 200
  And no duplicate version is created

Scenario: A dangling audio reference is rejected
  When TRN publishes a tree whose phrase references an assetId missing from the manifest
  Then the response status is 422
  And the problem type is "dangling-audio-reference"
  And nothing is persisted

Scenario: A HIST audit failure rolls back the publish (hard-502)
  Given HIST is unavailable
  When TRN publishes a valid tree version for patient "pat-1" with key "trn:publish:appr-101"
  Then the response status is 502
  And the problem type is "audit-unavailable"
  And the active version is still 7

Scenario: A patient-session token cannot publish
  Given a patient-session token for patient "pat-1" in tenant "tenant-a"
  When the station POSTs to publish a tree version
  Then the response status is 403

Scenario Outline: The published ETag is a pure function of the content hash
  When TRN publishes a tree version whose content hash is "<hash>"
  Then the response ETag is "<hash>"

  Examples:
    | hash       |
    | sha256:bbb |
    | sha256:ccc |
