Feature: Read the published tree bundle

# SPEC-02, SPEC-03 · api-contract §2 · INV-CONV-2/3/4/7

Background:
  Given a patient-session token for patient "pat-1" in tenant "tenant-a"
  And patient "pat-1" has an active tree version 7 with ETag "sha256:aaa"

Scenario: Station reads the active bundle with a strong ETag
  When the station GETs the tree
  Then the response status is 200
  And the response ETag is "sha256:aaa"
  And every phrase in the bundle references an assetId present in the audio manifest

Scenario: Conditional refresh returns 304 when the cache is current
  When the station GETs the tree with If-None-Match "sha256:aaa"
  Then the response status is 304
  And the response has no body

Scenario: A newer published version changes the served ETag
  Given patient "pat-1" has an active tree version 8 with ETag "sha256:bbb"
  When the station GETs the tree with If-None-Match "sha256:aaa"
  Then the response status is 200
  And the response ETag is "sha256:bbb"

Scenario: Cold patient with no active version is mute until first sync
  Given patient "pat-cold" has no active tree version
  And a patient-session token for patient "pat-cold" in tenant "tenant-a"
  When the station GETs the tree
  Then the response status is 404
  And the problem type is "tree-not-published"

Scenario: Tenant isolation hides another tenant's bundle
  Given a patient-session token for patient "pat-9" in tenant "tenant-b"
  When the station GETs the tree
  Then the response status is 404

Scenario Outline: X-Tenant-Id header is ignored; tenant comes from the token
  When the station GETs the tree with header X-Tenant-Id "<spoofedTenant>"
  Then the response status is 200
  And the resolved tenant is "tenant-a"

  Examples:
    | spoofedTenant |
    | tenant-b      |
    | tenant-zzz    |
