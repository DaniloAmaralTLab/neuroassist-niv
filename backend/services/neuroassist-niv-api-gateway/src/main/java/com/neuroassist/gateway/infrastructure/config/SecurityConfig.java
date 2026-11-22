package com.neuroassist.gateway.infrastructure.config;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.ReactiveAuthenticationManagerResolver;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtReactiveAuthenticationManager;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * WebFlux security configuration for the API Gateway.
 *
 * <p>Key decisions (api-contract §3, §5, §7; ADR-001..007):
 *
 * <ul>
 *   <li>Multi-issuer edge check (ACS + EDGE JWKS, ADR-002, INV-G6).
 *   <li>No {@code @EnableMethodSecurity} — gateway has no {@code @PreAuthorize}-annotated methods
 *       (D-642: add only where needed).
 *   <li>{@code jwk-set-uri} used (not {@code issuer-uri}) to avoid OIDC discovery at startup.
 *   <li>Absent {@code exp} is treated as valid — patient-session tokens (ACS §4.1, Risk R2); the
 *       default {@code JwtTimestampValidator} skips expiry check when {@code exp} is absent.
 *   <li>CORS config from {@link GatewayCorsProperties} — never {@code *} with credentials (Risk R6,
 *       ADR-004).
 * </ul>
 */
@Configuration
@EnableWebFluxSecurity
@EnableConfigurationProperties(GatewayCorsProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(
            ServerHttpSecurity http,
            ReactiveAuthenticationManagerResolver<ServerWebExchange> authManagerResolver,
            CorsConfigurationSource corsConfigurationSource) {
        return http.csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .authorizeExchange(
                        ex ->
                                ex
                                        // ── Public allow-list (generator-config.yml §public_paths,
                                        //    api-contract §3) ──
                                        .pathMatchers(HttpMethod.POST, "/acs/auth/login")
                                        .permitAll()
                                        .pathMatchers(HttpMethod.GET, "/acs/.well-known/jwks.json")
                                        .permitAll()
                                        .pathMatchers(HttpMethod.GET, "/edge/.well-known/jwks.json")
                                        .permitAll()
                                        .pathMatchers(HttpMethod.POST, "/edge/devices/pair")
                                        .permitAll()
                                        .pathMatchers(HttpMethod.GET, "/edge/actuator/health")
                                        .permitAll()
                                        .pathMatchers(HttpMethod.GET, "/actuator/health")
                                        .permitAll()
                                        // ── Everything else requires a valid JWT (INV-G2) ──
                                        .anyExchange()
                                        .authenticated())
                .oauth2ResourceServer(
                        rs ->
                                rs.authenticationManagerResolver(authManagerResolver)
                                        .authenticationEntryPoint(
                                                (exchange, ex) -> writeUnauthorized(exchange)))
                .build();
    }

    /**
     * Multi-issuer resolver (ADR-002, INV-G6): accepts tokens signed by EITHER ACS or EDGE JWKS.
     * Tries ACS first; on any JWT error falls back to EDGE. If both fail, the error propagates to
     * the security filter → 401.
     *
     * <p>pitfall applied — {@code reactor:onErrorResume-after-flatMap-chain}: the {@code
     * onErrorResume} is scoped only to the ACS authentication Mono; {@code chain.filter(exchange)}
     * is NOT wrapped with {@code onErrorResume} to avoid masking downstream 503/504 errors.
     *
     * <p>pitfall applied — {@code gwy:token-validation:upstream-503-mapped-to-401}: TODO(Layer 2) —
     * distinguish {@code BadJwtException} (401) from JWKS-fetch failures (503) by catching only
     * {@code OAuth2AuthenticationException} here and surfacing network errors as 503.
     */
    @Bean
    public ReactiveAuthenticationManagerResolver<ServerWebExchange> authenticationManagerResolver(
            @Value("${gateway.jwks.acs-uri}") String acsJwksUri,
            @Value("${gateway.jwks.edge-uri}") String edgeJwksUri) {

        ReactiveAuthenticationManager acsManager = buildAuthManager(acsJwksUri);
        ReactiveAuthenticationManager edgeManager = buildAuthManager(edgeJwksUri);

        return exchange ->
                Mono.just(
                        authentication ->
                                acsManager
                                        .authenticate(authentication)
                                        .onErrorResume(
                                                org.springframework.security.core
                                                        .AuthenticationException.class,
                                                e -> edgeManager.authenticate(authentication)));
    }

    private ReactiveAuthenticationManager buildAuthManager(String jwksUri) {
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder.withJwkSetUri(jwksUri).build();
        JwtAuthenticationConverter authConverter = new JwtAuthenticationConverter();
        // permissions claim without SCOPE_ prefix (pitfall:
        // security:jwt-authorities-converter-missing)
        authConverter.setJwtGrantedAuthoritiesConverter(permissionsClaimConverter());
        JwtReactiveAuthenticationManager manager = new JwtReactiveAuthenticationManager(decoder);
        manager.setJwtAuthenticationConverter(
                new ReactiveJwtAuthenticationConverterAdapter(authConverter));
        return manager;
    }

    /** Reads the {@code permissions} claim as authorities without the {@code SCOPE_} prefix. */
    private Converter<Jwt, Collection<GrantedAuthority>> permissionsClaimConverter() {
        return jwt -> {
            List<String> perms = jwt.getClaimAsStringList("permissions");
            if (perms == null) return List.of();
            return perms.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList());
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(GatewayCorsProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.getAllowedOrigins());
        config.setAllowedMethods(props.getAllowedMethods());
        config.setAllowedHeaders(props.getAllowedHeaders());
        config.setExposedHeaders(props.getExposedHeaders());
        config.setAllowCredentials(props.isAllowCredentials());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * RFC 7807 PHI-free 401 response (api-contract §6, INV-G1).
     *
     * <p>No request path, body, token content, or any identifier is included in the response.
     */
    private Mono<Void> writeUnauthorized(ServerWebExchange exchange) {
        String correlationId = exchange.getRequest().getHeaders().getFirst("X-Correlation-Id");
        String safeCorrelationId =
                (correlationId != null && !correlationId.isBlank()) ? correlationId : "";
        String body =
                "{\"type\":\"https://neuroassist.niv/errors/unauthorized\","
                        + "\"title\":\"Unauthorized\","
                        + "\"status\":401,"
                        + "\"detail\":\"Authentication required.\","
                        + "\"correlationId\":\""
                        + safeCorrelationId
                        + "\"}";
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
}
