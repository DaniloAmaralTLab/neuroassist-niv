Feature: Client tenant header stripping

# Refs: SPEC-06 (security), ADR-003, INV-G3, Risk R5

Background:
  Given the gateway is running with the eight business routes configured
  And a valid ACS token
  And REG advertises an UP instance of "pat-service"

Scenario: An inbound X-Tenant-Id is stripped before forwarding
  Given the request carries X-Tenant-Id "t_attacker"
  When a GET request is sent to "/pat/commands"
  Then the forwarded request has no X-Tenant-Id header

Scenario Outline: Tenant-context header variants are all stripped
  Given the request carries header "<header>" with value "t_attacker"
  When a GET request is sent to "/pat/commands"
  Then the forwarded request has no "<header>" header

  Examples:
    | header        |
    | X-Tenant-Id   |
    | X-Tenant      |
    | Tenant-Id     |

Scenario: The gateway injects no tenant header of its own
  Given the request carries no tenant header
  When a GET request is sent to "/pat/commands"
  Then the forwarded request has no tenant-context header
  And tenant context is left for the resource server to derive from the signed claim
