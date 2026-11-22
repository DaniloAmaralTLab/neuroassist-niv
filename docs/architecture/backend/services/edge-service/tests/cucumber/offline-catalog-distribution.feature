Feature: Offline catalog distribution to the edge device

# Covers SPEC-03 (ADR-004) and SPEC-10; invariants INV-EDGE-5, INV-EDGE-2.
# EDGE serves the last-good cached catalog and refreshes from PAT with a service-client identity.

Background:
  Given a tenant "T1" with a patient "P1"
  And a paired device "D1" with a live edge.device token holding "edge.catalog.read"
  And EDGE holds a cached catalog for patient "P1" with one command mapping "BLINK" to "suction"

Scenario: The device reads its cached catalog with an EDGE ETag
  When the device reads GET /edge/catalog
  Then the response status is 200
  And the catalog includes the command mapping "BLINK" to "suction"
  And each command primaryPrimitive is resolved to code and displayName
  And the response carries an ETag

Scenario: Conditional read returns 304 when nothing changed
  Given the device has the current EDGE ETag for its catalog
  When the device reads GET /edge/catalog with header "If-None-Match" set to that ETag
  Then the response status is 304
  And the response has no body

Scenario: EDGE refreshes from PAT with a service-client token and ETag
  When EDGE refreshes the catalog from PAT
  Then EDGE calls PAT with a service-client token holding authority "pat.command.read"
  And EDGE sends header "If-None-Match" with the stored PAT ETag

Scenario: A PAT 304 keeps the cache and audits nothing
  Given PAT responds 304 to the conditional refresh
  When EDGE refreshes the catalog from PAT
  Then the cached catalog is unchanged
  And no "CatalogRefreshed" audit is recorded

Scenario: A PAT 200 replaces the cache and audits a refresh
  Given PAT responds 200 with a changed catalog and a new ETag
  When EDGE refreshes the catalog from PAT
  Then the cached catalog is replaced
  And a "CatalogRefreshed" audit is recorded to HIST

Scenario: A PAT outage never hard-fails the device read
  Given PAT is unreachable
  When the device reads GET /edge/catalog
  Then the response status is 200
  And the response serves the last cached catalog

Scenario: A first-ever read with no cache and PAT down is unavailable
  Given no catalog has ever been cached for patient "P1"
  And PAT is unreachable
  When the device reads GET /edge/catalog
  Then the response status is 503
  And the problem type is "catalog-unavailable"

Scenario: EDGE never pulls PAT with a device or patient-session token
  When EDGE refreshes the catalog from PAT
  Then EDGE does not present an edge.device token to PAT
  And EDGE does not present a patient-session token to PAT
