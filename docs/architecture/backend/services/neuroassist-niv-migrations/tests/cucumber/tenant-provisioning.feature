Feature: Tenant provisioning and single-tenant migration

# Covers SPEC-03 (provisioning + enumeration) and INV-MIG-6 (non-transactional DDL).

Background:
  Given a clean PostgreSQL with an admin datasource
  And the MIG baseline and a tenant module block V0020 are available
  And neuroassist_global is at the current version

Scenario: provisioning a new tenant creates the schema and brings it to version
  Given no schema named "t_unitC" exists
  When MIG runs with "--provision-tenant unitC"
  Then the run exits 0
  And schema "t_unitC" exists
  And schema "t_unitC" is at version "V0020"

Scenario: provisioning an existing tenant is idempotent
  Given tenant schema "t_unitC" exists at version "V0020"
  When MIG runs with "--provision-tenant unitC"
  Then the run exits 0
  And schema "t_unitC" is at version "V0020"

Scenario: --tenant on an existing schema migrates only that schema
  Given tenant schema "t_unitA" exists at version "V0005"
  And tenant schema "t_unitB" exists at version "V0005"
  When MIG runs with "--tenant unitA"
  Then the run exits 0
  And schema "t_unitA" is at version "V0020"
  And schema "t_unitB" is at version "V0005"

Scenario: --tenant on a missing schema fails and creates nothing
  Given no schema named "t_ghost" exists
  When MIG runs with "--tenant ghost"
  Then the run exits 2
  And schema "t_ghost" does not exist
