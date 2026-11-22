package com.neuroassist.gateway.infrastructure.filter;

import java.util.Set;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Strips client-supplied tenant-identity headers before forwarding to downstream services (ADR-003,
 * INV-G3, api-contract §5).
 *
 * <p>No client-supplied {@code X-Tenant-Id} (or variant spellings) is ever trusted by the gateway.
 * Downstream services derive tenant context from the validated JWT, not from an HTTP header they
 * receive.
 *
 * <p>pitfall applied — {@code be-security:tenant-header:inbound-header-must-be-stripped}: all known
 * variant spellings are stripped.
 *
 * <p>pitfall applied — {@code reactor:onErrorResume-after-flatMap-chain}: no {@code onErrorResume}
 * on {@code chain.filter()} to avoid masking downstream errors.
 */
@Component
public class TenantHeaderStripFilter implements GlobalFilter, Ordered {

    /** All variant spellings that must be stripped (case-insensitive via Spring HttpHeaders). */
    static final Set<String> STRIPPED_HEADERS =
            Set.of("X-Tenant-Id", "x-tenant-id", "X-TenantId", "x-tenantid", "X-Tenant");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerWebExchange mutated =
                exchange.mutate()
                        .request(r -> r.headers(h -> STRIPPED_HEADERS.forEach(h::remove)))
                        .build();
        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1;
    }
}
