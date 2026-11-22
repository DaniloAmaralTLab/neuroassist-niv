Feature: Catalog distribution to detection actors

# Covers SPEC-03 (ADR-004) and SPEC-06; invariants INV-PAT-6, INV-PAT-7.
# The edge reads the catalog through a service-client identity, never the patient-session token.

Background:
  Given a patient "P1" with status "active" in tenant "T1"
  And patient "P1" has an active command "C1" mapping "BLINK" to "suction" with sensitivity "medium"

Scenario: Detection service client pulls the active catalog
  Given a detection service-client token holding authority "pat.command.read"
  When it reads the active catalog of patient "P1"
  Then the response status is 200
  And the catalog includes command "C1"
  And each command's primaryPrimitive is resolved to code and displayName
  And the response carries an ETag

Scenario: Conditional refresh returns 304 when nothing changed
  Given a detection service-client token holding authority "pat.command.read"
  And the client has the current ETag for patient "P1" active catalog
  When it reads the active catalog of patient "P1" with header "If-None-Match" set to that ETag
  Then the response status is 304
  And the response has no body

Scenario: A patient-session token cannot read the catalog
  Given a request bearing a patient-session token with authorities "conv.read, gest.read" only
  When it reads the active catalog of patient "P1"
  Then the response status is 403

Scenario: EVNT reads a single command by id for urgency and label
  Given a service-client token holding authority "pat.command.read"
  When it reads command "C1" by id
  Then the response status is 200
  And the response contains urgency and label

Scenario: Gesture-type catalog is readable but asserts no engine support
  Given a caregiver token holding authority "pat.gesture-type.read"
  When it lists the gesture-type catalog
  Then the response status is 200
  And the catalog is the global vocabulary independent of tenant
  And no entry asserts detection-engine support

Scenario: Registering a primitive requires the coordinator authority
  Given a caregiver token without authority "pat.gesture-type.create"
  When it registers a gesture-type with code "DOUBLE_BLINK"
  Then the response status is 403

Scenario: Duplicate gesture-type code is rejected
  Given a coordinator token holding authority "pat.gesture-type.create"
  And the global catalog already contains code "BLINK"
  When it registers a gesture-type with code "BLINK"
  Then the response status is 409
  And the problem type is "gesture-type-code-taken"
