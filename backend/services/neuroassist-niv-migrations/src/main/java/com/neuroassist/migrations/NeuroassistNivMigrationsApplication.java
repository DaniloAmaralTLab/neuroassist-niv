package com.neuroassist.migrations;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Centralized Flyway migration runner.
 *
 * <p>Runs as a one-shot Spring Boot application (no HTTP port). Flyway auto-configuration applies
 * all pending migrations against the configured schema on startup, then the JVM exits.
 */
@SpringBootApplication
public class NeuroassistNivMigrationsApplication {

    public static void main(String[] args) {
        SpringApplication.run(NeuroassistNivMigrationsApplication.class, args);
    }
}
