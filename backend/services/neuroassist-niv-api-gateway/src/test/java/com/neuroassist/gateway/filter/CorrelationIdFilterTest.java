package com.neuroassist.gateway.filter;

import static org.assertj.core.api.Assertions.assertThat;

import com.neuroassist.gateway.infrastructure.filter.CorrelationIdFilter;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Unit tests for {@link CorrelationIdFilter} — no Spring Boot context required.
 *
 * <p>Verifies INV-G4 (api-contract §5): X-Correlation-Id is generated when absent and preserved
 * when present; it is forwarded in the downstream request and echoed in the response.
 */
class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    void correlation_id_is_generated_when_absent_and_forwarded_downstream() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/pat/patients").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        GatewayFilterChain chain =
                e -> {
                    captured.set(e);
                    return Mono.empty();
                };

        filter.filter(exchange, chain).block();

        // Downstream request must have the header
        assertThat(captured.get().getRequest().getHeaders())
                .containsKey(CorrelationIdFilter.CORRELATION_ID_HEADER);
        String id =
                captured.get()
                        .getRequest()
                        .getHeaders()
                        .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertThat(id).isNotBlank();

        // Response must echo the same id
        assertThat(
                        exchange.getResponse()
                                .getHeaders()
                                .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER))
                .isEqualTo(id);
    }

    @Test
    void correlation_id_is_preserved_when_present_in_inbound_request() {
        String existing = "req-id-abc-123";
        MockServerHttpRequest request =
                MockServerHttpRequest.get("/pat/patients")
                        .header(CorrelationIdFilter.CORRELATION_ID_HEADER, existing)
                        .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> captured = new AtomicReference<>();
        GatewayFilterChain chain =
                e -> {
                    captured.set(e);
                    return Mono.empty();
                };

        filter.filter(exchange, chain).block();

        assertThat(
                        captured.get()
                                .getRequest()
                                .getHeaders()
                                .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER))
                .isEqualTo(existing);
        assertThat(
                        exchange.getResponse()
                                .getHeaders()
                                .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER))
                .isEqualTo(existing);
    }
}
