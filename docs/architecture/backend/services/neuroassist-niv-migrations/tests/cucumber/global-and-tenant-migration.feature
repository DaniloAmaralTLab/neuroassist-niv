Feature: Global and tenant migration in one pass

# Covers SPEC-02 (orchestration) and INV-MIG-1 (convergent versions).

Background:
  Given a clean PostgreSQL with an admin datasource
  And the MIG baseline block V0001..V0005 is available
  And a global module block V0010 and a tenant module block V0020 are available

Scenario: --all applies baseline, global pass, then every tenant
  Given tenant schemas "t_unitA" and "t_unitB" exist
  When MIG runs with "--all"
  Then the run exits 0
  And neuroassist_global is at version "V0010"
  And every tenant schema is at version "V0020"

Scenario: --all with no tenants applies only the global pass
  Given no tenant schemas exist
  When MIG runs with "--all"
  Then the run exits 0
  And neuroassist_global is at version "V0010"

Scenario: a failed global pass does not touch any tenant
  Given tenant schemas "t_unitA" and "t_unitB" exist
  And the global module block V0010 contains invalid DDL
  When MIG runs with "--all"
  Then the run exits 2
  And schema "neuroassist_global" is reported FAILED
  And schema "t_unitA" is reported SKIPPED
  And schema "t_unitB" is reported SKIPPED

Scenario: --global-only never touches tenant schemas
  Given tenant schemas "t_unitA" exists at version "V0005"
  When MIG runs with "--global-only"
  Then the run exits 0
  And neuroassist_global is at version "V0010"
  And schema "t_unitA" is at version "V0005"
