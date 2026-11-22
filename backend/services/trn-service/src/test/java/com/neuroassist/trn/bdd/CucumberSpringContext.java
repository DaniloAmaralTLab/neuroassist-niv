package com.neuroassist.trn.bdd;

import com.neuroassist.trn.integration.BaseIntegrationTest;
import io.cucumber.spring.CucumberContextConfiguration;

/**
 * Bootstraps the Spring context for Cucumber step definitions. Extends BaseIntegrationTest to
 * inherit Testcontainers PostgreSQL setup (D-532: singleton container pattern for BDD test
 * context).
 *
 * <p>@SpringBootTest and @ActiveProfiles("test") are inherited from BaseIntegrationTest. Messaging
 * is disabled for trn-service (consumed_events: [], events.published: []).
 */
@CucumberContextConfiguration
public class CucumberSpringContext extends BaseIntegrationTest {}
