package com.neuroassist.acs.integration;

import javax.sql.DataSource;
import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Integration-test base. The database comes from one of two places:
 *
 * <ul>
 *   <li>{@code TEST_DB_URL} (+ optional {@code TEST_DB_USER}, {@code TEST_DB_PASSWORD}): an
 *       existing local PostgreSQL, for machines without Docker. Point it at a dedicated, empty
 *       database: the test profile uses {@code ddl-auto: create-drop}.
 *   <li>otherwise a Testcontainers PostgreSQL (needs Docker), as before.
 * </ul>
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    private static final String EXTERNAL_URL = System.getenv("TEST_DB_URL");
    private static final String EXTERNAL_USER = envOr("TEST_DB_USER", "test");
    private static final String EXTERNAL_PASSWORD = envOr("TEST_DB_PASSWORD", "test");

    static final PostgreSQLContainer<?> POSTGRES;

    static {
        if (EXTERNAL_URL == null || EXTERNAL_URL.isBlank()) {
            POSTGRES =
                    new PostgreSQLContainer<>("postgres:16-alpine")
                            .withDatabaseName("neuroassist-niv_test")
                            .withUsername("test")
                            .withPassword("test")
                            .withInitScript("init-schema.sql");
            POSTGRES.start();
        } else {
            POSTGRES = null;
            runInitScript();
        }
    }

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        if (POSTGRES == null) {
            registry.add("spring.datasource.url", () -> EXTERNAL_URL);
            registry.add("spring.datasource.username", () -> EXTERNAL_USER);
            registry.add("spring.datasource.password", () -> EXTERNAL_PASSWORD);
        } else {
            registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
            registry.add("spring.datasource.username", POSTGRES::getUsername);
            registry.add("spring.datasource.password", POSTGRES::getPassword);
        }
    }

    /** Same bootstrap the container runs; statements that need a missing role are tolerated. */
    private static void runInitScript() {
        DataSource ds = new DriverManagerDataSource(EXTERNAL_URL, EXTERNAL_USER, EXTERNAL_PASSWORD);
        ResourceDatabasePopulator populator =
                new ResourceDatabasePopulator(new ClassPathResource("init-schema.sql"));
        populator.setContinueOnError(true);
        populator.execute(ds);
    }

    private static String envOr(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
