Feature: Reserved version-block registry guard

# Covers SPEC-04 (data model) and INV-MIG-2 (one block per module, no overlap).

Background:
  Given a clean PostgreSQL with an admin datasource
  And the MIG baseline seeds migration_range_registry

Scenario: the baseline seeds every known reserved block
  When MIG runs with "--global-only"
  Then the run exits 0
  And migration_range_registry contains block "V0001".."V0009" for "MIG"
  And migration_range_registry contains block "V0010".."V0012" for "ACS"
  And migration_range_registry contains block "V0070".."V0079" for "CONV"

Scenario: unconfirmed proposals are seeded as not confirmed
  When MIG runs with "--global-only"
  Then the run exits 0
  And block "V0040".."V0049" for "EVNT" is marked confirmed false
  And block "V0050".."V0059" for "GEST" is marked confirmed false
  And block "V0060".."V0069" for "HIST" is marked confirmed false

Scenario: overlapping blocks fail the guard before any apply
  Given a module declares a block "V0011".."V0013" overlapping ACS "V0010".."V0012"
  When MIG runs with "--all"
  Then the run exits 2
  And the failure message mentions a reserved-block overlap
  And no module block is applied
