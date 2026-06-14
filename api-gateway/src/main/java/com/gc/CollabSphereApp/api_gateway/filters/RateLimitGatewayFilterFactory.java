package com.gc.CollabSphereApp.api_gateway.filters;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * SEC-2 — lightweight in-memory, per-client-IP rate limiter for sensitive
 * routes (referenced as filter `RateLimit` in application.yml, applied to the
 * public auth route).
 *
 * Fixed window: {@value #MAX_REQUESTS} requests / {@value #WINDOW_MS}ms per IP.
 * Returns HTTP 429 when exceeded.
 *
 * DEV-GRADE: state is per gateway instance (not shared across replicas) and
 * never evicted aggressively. For production, switch to a Redis-backed
 * RequestRateLimiter so the limit is global. See docs/security/hardening.md (SEC-2).
 */
@Component
public class RateLimitGatewayFilterFactory
        extends AbstractGatewayFilterFactory<RateLimitGatewayFilterFactory.Config> {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000L;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            final String ip = (exchange.getRequest().getRemoteAddress() != null)
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            final long now = Instant.now().toEpochMilli();

            Window window = windows.compute(ip, (key, current) -> {
                if (current == null || now - current.start > WINDOW_MS) {
                    return new Window(now); // new window, count = 1
                }
                current.count.incrementAndGet();
                return current;
            });

            if (window.count.get() > MAX_REQUESTS) {
                exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                return exchange.getResponse().setComplete();
            }
            return chain.filter(exchange);
        };
    }

    private static final class Window {
        final long start;
        final AtomicInteger count = new AtomicInteger(1);
        Window(long start) { this.start = start; }
    }

    public static class Config {
    }
}
