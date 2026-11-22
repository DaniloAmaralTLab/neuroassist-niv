Feature: Onboard a tenant (ops-only)
  As the platform-ops service client on the admin host
  I want to onboard a care unit (tenant)
  So that the rest of the product can be set up for a family or clinic

  Scenario: When opsHostGuard resolves onAdminHost true the system allows navigation to the ops tenants route and onboards the tenant
    Given the browser is on the admin host
    And a caller with authority "acs.tenant.onboard"
    When opsHostGuard resolves onAdminHost true
    And the caller submits a tenant of type family with a name
    Then the system allows navigation to the ops tenants route
    And the system onboards the tenant

  Scenario: While not on the admin host the system blocks navigation to the ops tenants route and omits the ops breadcrumb and menu entry
    Given the browser is not on the admin host
    When the caller attempts to navigate to the ops tenants route
    Then the system blocks navigation to the ops tenants route
    And the system omits the ops breadcrumb and menu entry

  Scenario: When AccessDecision grants onboard but opsHostGuard resolves onAdminHost false the system blocks the tenant onboard action
    Given a caller with authority "acs.tenant.onboard"
    And opsHostGuard resolves onAdminHost false
    When the caller attempts to onboard a tenant
    Then the system blocks the tenant onboard action
