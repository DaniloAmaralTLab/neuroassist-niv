package com.neuroassist.gateway.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.authentication.ReactiveAuthenticationManagerResolver;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtReactiveAuthenticationManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * MANDATORY 401/403 proof test (D-642 lesson): demonstrates that the gateway's authz boundary is
 * enforced — not just assumed.
 *
 * <p>Test matrix:
 *
 * <ul>
 *   <li>Unauthenticated request to a protected route → 401.
 *   <li>Public path (allow-listed) → NOT 401 (may be 200 or 503, never 401).
 *   <li>Syntactically invalid token → 401.
 *   <li>Expired token → 401.
 *   <li>Valid token → reaches downstream attempt → 503 (no downstream running), NOT 401.
 * </ul>
 *
 * <p>No Docker, no external infrastructure. The {@link TestSecurityOverride} inner configuration
 * provides a {@code @Primary} {@link ReactiveAuthenticationManagerResolver} backed by an in-process
 * RSA key pair so the full Spring Security filter chain runs with real JWT validation.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthBoundaryTest {

    @Autowired private WebTestClient webTestClient;

    // ── 401 on protected route without token ───────────────────────────────────────────────────

    @Test
    void unauthenticated_request_to_protected_route_returns_401() {
        webTestClient.get().uri("/pat/patients").exchange().expectStatus().isUnauthorized();
    }

    // ── Public path (allow-listed) must NOT return 401 ─────────────────────────────────────────

    @Test
    void public_actuator_health_endpoint_is_not_401() {
        webTestClient
                .get()
                .uri("/actuator/health")
                .exchange()
                .expectStatus()
                .value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void public_acs_login_endpoint_is_not_401() {
        // POST /acs/auth/login is public — will get 503 (acs-service not running) but NOT 401.
        webTestClient
                .post()
                .uri("/acs/auth/login")
                .exchange()
                .expectStatus()
                .value(status -> assertThat(status).isNotEqualTo(401));
    }

    // ── 401 on malformed / expired tokens ─────────────────────────────────────────────────────

    @Test
    void syntactically_invalid_token_returns_401() {
        webTestClient
                .get()
                .uri("/pat/patients")
                .header("Authorization", "Bearer not.a.real.jwt")
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void expired_token_returns_401() throws Exception {
        String expired = TestSecurityOverride.signJwt(Instant.now().minusSeconds(3600));
        webTestClient
                .get()
                .uri("/pat/patients")
                .header("Authorization", "Bearer " + expired)
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    // ── Valid token passes the edge check; downstream 503 (not running) is NOT 401 ───────────

    @Test
    void valid_token_passes_edge_check_and_reaches_downstream() throws Exception {
        String valid = TestSecurityOverride.signJwt(Instant.now().plusSeconds(3600));
        webTestClient
                .get()
                .uri("/pat/patients")
                .header("Authorization", "Bearer " + valid)
                .exchange()
                .expectStatus()
                .value(status -> assertThat(status).isNotEqualTo(401));
    }

    // ── Inner @TestConfiguration — in-process RSA-backed resolver ─────────────────────────────

    /**
     * Provides a {@code @Primary} resolver that uses an in-process RSA key pair. The real {@link
     * com.neuroassist.gateway.infrastructure.config.SecurityConfig#authenticationManagerResolver}
     * bean is still created (lazy JWKS decoders) but is not injected into the security chain
     * because this {@code @Primary} bean takes precedence.
     */
    @TestConfiguration
    static class TestSecurityOverride {

        static final RSAKey TEST_KEY;

        static {
            try {
                TEST_KEY = new RSAKeyGenerator(2048).keyID("test-kid").generate();
            } catch (Exception e) {
                throw new ExceptionInInitializerError(e);
            }
        }

        @Bean
        @Primary
        ReactiveAuthenticationManagerResolver<ServerWebExchange> testAuthManagerResolver()
                throws Exception {
            NimbusReactiveJwtDecoder decoder =
                    NimbusReactiveJwtDecoder.withPublicKey(TEST_KEY.toRSAPublicKey()).build();
            JwtReactiveAuthenticationManager manager =
                    new JwtReactiveAuthenticationManager(decoder);
            return exchange -> Mono.just(manager);
        }

        /**
         * Signs a test JWT with the in-process RSA key.
         *
         * @param expiresAt expiry instant, or {@code null} for no {@code exp} claim (mimics
         *     patient-session tokens — ACS §4.1, Risk R2)
         */
        static String signJwt(Instant expiresAt) throws Exception {
            JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-kid").build();
            JWTClaimsSet.Builder claims =
                    new JWTClaimsSet.Builder().subject("test-user").issuer("test-issuer");
            if (expiresAt != null) {
                claims.expirationTime(Date.from(expiresAt));
            }
            SignedJWT jwt = new SignedJWT(header, claims.build());
            jwt.sign(new RSASSASigner(TEST_KEY));
            return jwt.serialize();
        }
    }
}
