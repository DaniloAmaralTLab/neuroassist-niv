Feature: Background sync, staleness and cold-empty
  As a patient station
  I want to refresh the bundle out of the daily loop and keep serving the cache when offline
  So that the patient keeps a usable tree and never faces an infinite spinner or a blank screen
  Covers: SPEC-04 (304 up-to-date, newer-version atomic swap, HTTP adapter default), SPEC-03 (cold-start
          bounded loading, cold-empty offline, offline-stale marker), SPEC-07 (404 tree-not-published
          cold-empty, offline/stale are states)

  Background:
    Given a station with a valid patient-session carrying conv.tree.read

  Scenario: A conditional sync with a matching ETag keeps serving the cached bundle
    Given a cached bundle with a stored ETag
    When the station syncs the tree with If-None-Match equal to the cached ETag
    And conv-service responds 304 Not Modified
    Then the system treats the bundle as up-to-date
    And the system keeps serving the cached bundle

  Scenario: A newer version is downloaded and audio prefetched before an atomic swap
    Given a cached bundle at an older version
    When the tree sync returns a newer version
    Then the system downloads the full bundle and diff-prefetches its audio
    And the system atomically swaps the cache
    And the system keeps serving the previous bundle until the swap completes

  Scenario: Published conv-service binds the HTTP adapter as the default and maps via wire mappers
    Given conv-service is published
    When provideConv wires the tree, audio and usage ports
    Then the system binds the HTTP adapter as the default
    And the system maps every response through the shared wire mappers

  Scenario: Cold start holds a bounded loading state, never empty-as-configured
    Given the station is on cold start with the first tree sync in flight
    When the converse surface renders
    Then the system holds a bounded loading state
    And the system does not render an empty tree as configured

  Scenario: A never-synced offline station shows the cold-empty state, not an infinite spinner
    Given no snapshot is cached and the station is offline
    When the converse surface renders
    Then the system renders the cold-empty not-yet-synced state
    And the system does not render a spinner that blocks forever

  Scenario: A cold first sync answered 404 tree-not-published shows cold-empty, not a blank surface
    Given the first GET /conv/tree responds 404 tree-not-published
    When the converse surface renders
    Then the system shows the cold-empty not-yet-synced state
    And the system does not render a blank speaking surface

  Scenario: Serving a cached snapshot offline shows the last-synced marker and stays usable
    Given a cached snapshot is present and the station is offline
    When the converse surface renders
    Then the system shows the offline last-synced version marker
    And the system keeps the cached tree usable

  Scenario: Offline and stale are states that keep serving the cache without a blocking error
    Given the station is offline or the cached snapshot is stale
    When the patient uses the tree
    Then the system treats offline and stale as states
    And the system keeps serving the cached bundle without a blocking error
