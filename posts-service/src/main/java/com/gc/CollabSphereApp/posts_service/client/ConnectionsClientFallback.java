package com.gc.CollabSphereApp.posts_service.client;

import com.gc.CollabSphereApp.posts_service.dto.PersonDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * ARC-2 — circuit-breaker fallback for {@link ConnectionsClient}.
 *
 * When connections-service is unavailable or the circuit is open, return an
 * empty connection list so the feed degrades gracefully (empty / global) rather
 * than failing the whole request. The caller already handles an empty list.
 */
@Slf4j
@Component
public class ConnectionsClientFallback implements ConnectionsClient {

    @Override
    public List<PersonDto> getFirstConnections() {
        log.warn("[ARC-2] connections-service unavailable — returning empty connections (degraded feed)");
        return Collections.emptyList();
    }
}
