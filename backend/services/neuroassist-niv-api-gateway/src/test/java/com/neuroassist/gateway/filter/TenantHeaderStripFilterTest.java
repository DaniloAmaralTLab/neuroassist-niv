package com.neuroassist.gateway.filter;

import static org.assertj.core.api.Assertions.assertThat;

import com.neuroassist.gateway.infrastructure.filter.TenantHeaderStripFilter;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Unit tests for {@link TenantHeaderStripFilter} — no Spring Boot context required.
 *
 * <p>Verifies ADR-003 / INV-G3 (api-contract §5): client-supplied X-Tenant-Id is never forwarded to
 * downstream services.
 */
class TenantHeaderStripFilterTest {

    private final TenantHeaderStripFilter filter = new TenantHeaderStripFilter();

    @Test
    void x_tenant_id_is_stripped_before_forwarding_to_downstream() {
        MockServerHttpRequest request =
                MockServerHttpRequest.get("/pat/patients")
                        .header("X-Tenant-Id", "tenant-evil-override")
                        .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        GatewayFilterChain chain =
                e -> {
                    captured.set(e);
                    return Mono.empty();
                };

        filter.filter(exchange, chain).block();

        assertThat(captured.get().getRequest().getHeaders())
                .doesNotContainKey("X-Tenant-Id")
                .doesNotContainKey("x-tenant-id");
    }

    @Test
    void legitimate_headers_are_not_removed() {
        MockServerHttpRequest request =
                MockServerHttpRequest.get("/pat/patients")
                        .header("Authorization", "Bearer tok")
                        .header("X-Correlation-Id", "cid-123")
                        .header("X-Tenant-Id", "should-be-stripped")
                        .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        GatewayFilterChain chain =
                e -> {
                    captured.set(e);
                    return Mono.empty();
                };

        filter.filter(exchange, chain).block();

        assertThat(captured.get().getRequest().getHeaders().getFirst("Authorization"))
                .isEqualTo("Bearer tok");
        assertThat(captured.get().getRequest().getHeaders().getFirst("X-Correlation-Id"))
                .isEqualTo("cid-123");
        assertThat(captured.get().getRequest().getHeaders()).doesNotContainKey("X-Tenant-Id");
    }
}
