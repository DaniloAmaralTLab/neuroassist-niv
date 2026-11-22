Feature: Station identity gates the GEST runtime and status routes
  As the Patient-Mode station host
  I want GEST routes gated by the station identity, not a caregiver authority
  So that the detection runtime is a machine identity, never a dashboard permission

  Background:
    Given the Patient-Mode host has registered the GEST module descriptor

  Scenario: Mount the runtime with a valid station identity
    Given a valid "edge.device" station identity
    When the host navigates to the station runtime route
    Then the system mounts the detection runtime without a breadcrumb

  Scenario: Render the status surface with a valid station identity
    Given a valid "edge.device" station identity
    When the operator navigates to the station status route
    Then the system renders the on-station detection-status surface

  Scenario: Route to station-unpaired when the identity is absent or revoked
    Given an absent or revoked station identity
    When the host navigates to the station runtime route
    Then the system routes to the station-unpaired state
    And the system does not start the detection loop

  Scenario: Gate the runtime and status routes and surfaces by the station identity and evaluate no gest.runtime or gest.diagnostics authority
    When the host activates a GEST runtime or status route or surface
    Then the system gates the runtime and status routes and surfaces by the edge.device station identity
    And the system never evaluates a gest.runtime.read or gest.runtime.control or gest.diagnostics.read authority

  Scenario: Gate a future caregiver GEST screen on gest.capability.read and gest.engine.read exactly and introduce no gest.runtime or gest.diagnostics key
    Given a future caregiver-facing GEST screen is added
    When the system gates that caregiver screen
    Then the system gates it on gest.capability.read and gest.engine.read exactly
    And the system introduces no gest.runtime or gest.diagnostics key

  Scenario: Load every GEST feature route lazily
    When the host resolves the GEST routes
    Then the system loads every GEST feature route lazily
    And the system does not eager-bundle a feature library into the host shell
