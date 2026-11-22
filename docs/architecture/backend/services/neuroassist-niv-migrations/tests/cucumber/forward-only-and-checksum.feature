Feature: Forward-only, immutable, checksum-validated migrations

# Covers SPEC-05 (idempotency/concurrency) and SPEC-07 (exit codes).
# INV-MIG-3 (immutability), INV-MIG-4 (next-version rule).

Background:
  Given a clean PostgreSQL with an admin datasource
  And the MIG baseline and a global module block V0010 are available

Scenario: re-running an up-to-date database is a no-op
  Given MIG has already run "--all" successfully
  When MIG runs with "--all"
  Then the run exits 0
  And no new version is recorded in any schema history

Scenario: editing an applied script fails the run fast
  Given MIG has already applied global block V0010
  And the applied script for V0010 is edited in place
  When MIG runs with "--all"
  Then the run exits 2
  And schema "neuroassist_global" is reported FAILED
  And the failure message mentions a checksum mismatch

Scenario: a new script numbered below the current max is rejected
  Given neuroassist_global is at version "V0010"
  And a global script "V0007" is added below the current max
  When MIG runs with "--all"
  Then the run exits 2
  And the failure message mentions out-of-order

Scenario Outline: exit code reflects the invocation outcome
  When MIG runs with "<args>"
  Then the run exits <code>

  Examples:
    | args                 | code |
    | --all                | 0    |
    |                      | 1    |
    | --all --global-only  | 1    |
    | --tenant             | 1    |
