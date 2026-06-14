package com.gc.CollabSphereApp.posts_service.auth;

import java.util.List;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * ARC-2 fix: the resilience4j circuit-breaker/time-limiter runs the connections Feign
 * call on a worker thread. {@link UserContextHolder} is backed by ThreadLocals, so the
 * caller's auth header is invisible on that worker thread — the {@link FeignClientInterceptor}
 * then forwards no token, connections-service answers 401, and the call always trips the
 * fallback (degraded/empty feed) even when connections-service is healthy.
 *
 * This decorator captures the caller's context at submit time and restores it on the
 * worker thread, so the existing ThreadLocal-based propagation keeps working through the
 * circuit breaker. {@link AbstractExecutorService} routes submit()/invoke*() through
 * {@link #execute(Runnable)}, so wrapping that one method covers every path.
 */
public class ContextAwareExecutorService extends AbstractExecutorService {

    private final ExecutorService delegate;

    public ContextAwareExecutorService(ExecutorService delegate) {
        this.delegate = delegate;
    }

    @Override
    public void execute(Runnable command) {
        final Long userId = UserContextHolder.getCurrentUserId();
        final String authorizationHeader = UserContextHolder.getCurrentAuthorizationHeader();
        delegate.execute(() -> {
            try {
                if (userId != null) {
                    UserContextHolder.setCurrentUserId(userId);
                }
                if (authorizationHeader != null) {
                    UserContextHolder.setCurrentAuthorizationHeader(authorizationHeader);
                }
                command.run();
            } finally {
                UserContextHolder.clear();
            }
        });
    }

    @Override
    public void shutdown() {
        delegate.shutdown();
    }

    @Override
    public List<Runnable> shutdownNow() {
        return delegate.shutdownNow();
    }

    @Override
    public boolean isShutdown() {
        return delegate.isShutdown();
    }

    @Override
    public boolean isTerminated() {
        return delegate.isTerminated();
    }

    @Override
    public boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException {
        return delegate.awaitTermination(timeout, unit);
    }
}
