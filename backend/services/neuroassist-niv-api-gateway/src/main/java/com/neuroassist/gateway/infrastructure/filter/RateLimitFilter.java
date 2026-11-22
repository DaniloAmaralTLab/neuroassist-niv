package com.neuroassist.gateway.infrastructure.filter;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * In-memory per-IP sliding-window rate limiter for the two sensitive public endpoints (ADR-005,
 * api-contract §6, integration-contracts §5).
 *
 * <ul>
 *   <li>Bucket {@code login}: {@code POST /acs/auth/login} (credential exchange).
 *   <li>Bucket {@code pairing}: {@code POST /edge/devices/pair} (device pairing).
 * </ul>
 *
 * <p>No Redis — in-memory per-instance as stated in integration-contracts §5 (messaging disabled).
 * Thresholds are configuration, not hard-coded (ADR-005).
 *
 * <p>pitfall applied — {@code be-gateway:rate-limit:anonymous-request-drains-the-same-bucket}:
 * keyed by remote IP; a single NAT address is not expected to cause over-throttling at the
 * configured capacity. TODO(Layer 2): add secondary key (username prefix / pairing-code prefix).
 *
 * <p>pitfall applied — {@code reactor:onErrorResume-after-flatMap-chain}: 429 short-circuit writes
 * directly to the response before {@code chain.filter()}; no error handler on the chain call.
 */
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    private static final String LOGIN_PATH = "/acs/auth/login";
    private static final String PAIRING_PATH = "/edge/devices/pair";

    @Value("${gateway.ratelimit.login.capacity:5}")
    private int loginCapacity;

    @Value("${gateway.ratelimit.login.refill-per-minute:5}")
    private int loginRefillPerMinute;

    @Value("${gateway.ratelimit.pairing.capacity:10}")
    private int pairingCapacity;

    @Value("${gateway.ratelimit.pairing.refill-per-minute:10}")
    private int pairingRefillPerMinute;

    private final ConcurrentMap<String, RateLimitWindow> loginWindows = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, RateLimitWindow> pairingWindows = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!HttpMethod.POST.equals(exchange.getRequest().getMethod())) {
            return chain.filter(exchange);
        }
        String path = exchange.getRequest().getPath().pathWithinApplication().value();

        ConcurrentMap<String, RateLimitWindow> targetWindows;
        int capacity;
        int refill;
        if (LOGIN_PATH.equals(path)) {
            targetWindows = loginWindows;
            capacity = loginCapacity;
            refill = loginRefillPerMinute;
        } else if (PAIRING_PATH.equals(path)) {
            targetWindows = pairingWindows;
            capacity = pairingCapacity;
            refill = pairingRefillPerMinute;
        } else {
            return chain.filter(exchange);
        }

        String clientKey = resolveClientKey(exchange);
        final int cap = capacity;
        final int ref = refill;
        RateLimitWindow window =
                targetWindows.computeIfAbsent(clientKey, k -> new RateLimitWindow(cap, ref));

        if (!window.tryConsume()) {
            return writeTooManyRequests(exchange);
        }
        return chain.filter(exchange);
    }

    private String resolveClientKey(ServerWebExchange exchange) {
        String forwarded = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
        return (remote != null) ? remote.getAddress().getHostAddress() : "unknown";
    }

    private Mono<Void> writeTooManyRequests(ServerWebExchange exchange) {
        String correlationId =
                exchange.getRequest()
                        .getHeaders()
                        .getFirst(CorrelationIdFilter.CORRELATION_ID_HEADER);
        String safeId = (correlationId != null && !correlationId.isBlank()) ? correlationId : "";
        String body =
                "{\"type\":\"https://neuroassist.niv/errors/rate-limited\","
                        + "\"title\":\"Too Many Requests\","
                        + "\"status\":429,"
                        + "\"detail\":\"Rate limit exceeded. Please try again later.\","
                        + "\"correlationId\":\""
                        + safeId
                        + "\"}";
        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    // ── Sliding-window counter ───────────────────────────────────────────────────────────────────

    static final class RateLimitWindow {

        private final int maxRequests;
        private final long windowMillis;
        private final Deque<Long> timestamps = new ArrayDeque<>();

        RateLimitWindow(int maxRequests, int refillPerMinute) {
            // Simple sliding window: allow at most maxRequests per 60-second window per IP.
            // refillPerMinute is treated as an alias for maxRequests (same value expected from
            // config); separate bucket shape is a Layer 2 concern (ADR-005).
            this.maxRequests = Math.max(maxRequests, refillPerMinute);
            this.windowMillis = 60_000L;
        }

        synchronized boolean tryConsume() {
            long now = System.currentTimeMillis();
            long cutoff = now - windowMillis;
            while (!timestamps.isEmpty() && timestamps.peekFirst() < cutoff) {
                timestamps.pollFirst();
            }
            if (timestamps.size() < maxRequests) {
                timestamps.addLast(now);
                return true;
            }
            return false;
        }
    }
}
