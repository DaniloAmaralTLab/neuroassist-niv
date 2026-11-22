package com.neuroassist.trn.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.test.web.servlet.MockMvc;

/**
 * D-642 — proves the generated @PreAuthorize is ENFORCED (method security on) and that the
 * authorities are read from the access token's `authorities` claim with no prefix.
 *
 * <p>Endpoint under test: GET /trn/sessions/1 - @PreAuthorize trn.session.read. The scaffold stub
 * throws UnsupportedOperationException, so "passed security" = the request reached the stub.
 */
@AutoConfigureMockMvc
class MethodSecurityEnforcementIT extends BaseIntegrationTest {

    private static final String URL = "/trn/sessions/1";

    @Autowired private MockMvc mvc;

    @Autowired private JwtAuthenticationConverter jwtAuthenticationConverter;

    @Test
    void noTokenIsUnauthorized() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenWithoutTheAuthorityIsForbidden() throws Exception {
        mvc.perform(get(URL).with(tokenWith("authorities", List.of("trn.session.create"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void authorityInScopeClaimDoesNotCount() throws Exception {
        // Default Spring mapping would turn `scope` into SCOPE_trn.session.read — must NOT match.
        mvc.perform(get(URL).with(tokenWith("scope", "trn.session.read")))
                .andExpect(status().isForbidden());
    }

    @Test
    void tokenWithTheAuthorityPassesSecurity() {
        Throwable thrown = null;
        int statusCode = -1;
        try {
            statusCode =
                    mvc.perform(
                                    get(URL).with(
                                                    tokenWith(
                                                            "authorities",
                                                            List.of("trn.session.read"))))
                            .andReturn()
                            .getResponse()
                            .getStatus();
        } catch (Exception e) {
            thrown = e;
        }
        if (thrown != null) {
            Throwable root = thrown;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            assertThat(root).isInstanceOf(UnsupportedOperationException.class);
        } else {
            assertThat(statusCode).isNotIn(401, 403);
        }
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor tokenWith(
            String claim, Object value) {
        return jwt().jwt(j -> j.claim(claim, value))
                .authorities(token -> jwtAuthenticationConverter.convert(token).getAuthorities());
    }
}
