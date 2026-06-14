package com.gc.CollabSphereApp.posts_service.config;

import com.gc.CollabSphereApp.posts_service.auth.ContextAwareExecutorService;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JCircuitBreakerFactory;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executors;

/**
 * ARC-2: make the resilience4j circuit breaker run the connections Feign call on a
 * context-aware executor so the caller's auth header (a ThreadLocal in UserContextHolder)
 * is propagated to the time-limiter worker thread. Without this the feed always falls back
 * to an empty connection list because the forwarded request is unauthenticated.
 */
@Configuration
public class CircuitBreakerExecutorConfig {

    @Bean
    public Customizer<Resilience4JCircuitBreakerFactory> contextAwareExecutorCustomizer() {
        return factory -> factory.configureExecutorService(
                new ContextAwareExecutorService(Executors.newCachedThreadPool()));
    }
}
