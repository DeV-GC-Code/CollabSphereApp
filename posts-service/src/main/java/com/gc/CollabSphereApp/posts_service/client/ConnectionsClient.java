package com.gc.CollabSphereApp.posts_service.client;

import com.gc.CollabSphereApp.posts_service.dto.PersonDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;


// ARC-2: the fallback degrades gracefully (empty connection list → e.g. an empty/
// global feed) when connections-service is down or slow, instead of cascading a 500
// onto the feed. Requires feign.circuitbreaker.enabled=true + resilience4j on the
// classpath (see pom.xml + application.yml).
@FeignClient(
        name = "connections-service",
        url = "${connections-service.url:http://localhost:9030}",
        path = "/connections",
        fallback = ConnectionsClientFallback.class
)
public interface ConnectionsClient {

    @GetMapping("/core/connections")
    List<PersonDto> getFirstConnections();

}

