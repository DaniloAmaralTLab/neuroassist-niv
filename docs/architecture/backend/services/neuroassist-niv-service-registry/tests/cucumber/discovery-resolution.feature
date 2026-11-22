Feature: Discovery resolution for consumers

# Refs: SPEC-02 (registry core), contracts/hub-integration.md §2, SPEC-07 (health)

Background:
  Given the neuroassist-niv-service-registry (REG) is running as a single Eureka node

Scenario: The gateway resolves an lb:// target to a healthy instance
  Given an instance of "pat-service" is registered and UP
  When the API gateway (GWY) resolves "lb://pat-service" through discovery
  Then the registry returns the healthy instance for load-balanced routing

Scenario: Only UP instances are returned for a logical id
  Given two instances of "evnt-service" are registered
  And one instance is UP and the other reports OUT_OF_SERVICE
  When a consumer queries discovery for "evnt-service"
  Then only the UP instance is returned

Scenario: A scaled-up instance becomes discoverable without consumer reconfiguration
  Given one instance of "acs-service" is registered and UP
  When a second instance of "acs-service" registers
  Then both instances are returned for discovery
  And no consumer configuration change is required

Scenario Outline: Each platform service resolves by its stable logical id
  Given an instance of "<service>" is registered and UP
  When a consumer queries discovery for "<service>"
  Then the registry returns that instance

  Examples:
    | service                     |
    | acs-service                 |
    | pat-service                 |
    | edge-service                |
    | evnt-service                |
    | conv-service                |
    | gest-service                |
    | hist-service                |
    | trn-service                 |
    | neuroassist-niv-api-gateway |
