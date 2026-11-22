package com.neuroassist.acs.bdd;

import com.neuroassist.acs.integration.BaseIntegrationTest;
import io.cucumber.spring.CucumberContextConfiguration;

/**
 * Bootstraps the Spring context for Cucumber step definitions. Extends BaseIntegrationTest to
 * inherit the Testcontainers PostgreSQL setup and the "test" profile (Feign base-url stubs, JWKS,
 * Eureka off) — same pattern as pat-service (D-532). The previous be-bdd-generator variant
 * activated a "bdd" profile with no properties, so the context failed on http://${acs.base-url}.
 *
 * <p>@SpringBootTest and @ActiveProfiles("test") are inherited from BaseIntegrationTest.
 */
@CucumberContextConfiguration
public class CucumberSpringContext extends BaseIntegrationTest {}
