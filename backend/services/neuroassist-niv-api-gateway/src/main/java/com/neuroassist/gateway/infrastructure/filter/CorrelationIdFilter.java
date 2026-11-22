package com.neuroassist.gateway.infrastructure.filter;

import java.util.UUID;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Ensures every request and response carries an {@code X-Correlation-Id} header (INV-G4,
 * api-contract §5).
 *
 * <ul>
 *   <li>If the inbound request already has the header, it is preserved unchanged.
 *   <li>If absent, a UUID is generated and injected into both the forwarded request and the
 *       response.
 * </ul>
 *
 * <p>pitfall applied — {@code reactor:onErrorResume-after-flatMap-chain}: no {@code onErrorResume}
 * on {@code chain.filter()} to avoid swallowing downstream errors.
 *
 * <p>Order {@link Ordered#HIGHEST_PRECEDENCE} ensures this filter runs before all other gateway
 * filters so the correlation ID is available to downstream filters (e.g. {@link
 * TenantHeaderStripFilter}, rate-limiter, access log).
 */
@Component
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String existing = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
        String id =
                (existing != null && !existing.isBlank()) ? existing : UUID.randomUUID().toString();

        // Set on the outgoing response header before the chain runs so it is present
        // regardless of whether the downstream sets the same header.
        exchange.getResponse().getHeaders().set(CORRELATION_ID_HEADER, id);

        // Forward the correlation ID downstream in the mutated request.
        ServerWebExchange mutated =
                exchange.mutate().request(r -> r.header(CORRELATION_ID_HEADER, id)).build();

        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
