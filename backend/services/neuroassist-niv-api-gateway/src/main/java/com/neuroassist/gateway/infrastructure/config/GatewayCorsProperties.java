package com.neuroassist.gateway.infrastructure.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Type-safe binding for {@code gateway.cors.*} properties.
 *
 * <p>Uses {@code @ConfigurationProperties} instead of {@code @Value} for list fields — avoids the
 * silent fall-back-to-literal pitfall (spring-config:value-annotation-on-yaml-list).
 */
@ConfigurationProperties(prefix = "gateway.cors")
public class GatewayCorsProperties {

    private List<String> allowedOrigins = List.of("http://localhost:4200");
    private List<String> allowedMethods = List.of("GET", "POST", "DELETE", "OPTIONS");
    private List<String> allowedHeaders =
            List.of("Authorization", "X-Correlation-Id", "Content-Type");
    private List<String> exposedHeaders = List.of("X-Correlation-Id");
    private boolean allowCredentials = true;

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    public List<String> getAllowedMethods() {
        return allowedMethods;
    }

    public void setAllowedMethods(List<String> allowedMethods) {
        this.allowedMethods = allowedMethods;
    }

    public List<String> getAllowedHeaders() {
        return allowedHeaders;
    }

    public void setAllowedHeaders(List<String> allowedHeaders) {
        this.allowedHeaders = allowedHeaders;
    }

    public List<String> getExposedHeaders() {
        return exposedHeaders;
    }

    public void setExposedHeaders(List<String> exposedHeaders) {
        this.exposedHeaders = exposedHeaders;
    }

    public boolean isAllowCredentials() {
        return allowCredentials;
    }

    public void setAllowCredentials(boolean allowCredentials) {
        this.allowCredentials = allowCredentials;
    }
}
