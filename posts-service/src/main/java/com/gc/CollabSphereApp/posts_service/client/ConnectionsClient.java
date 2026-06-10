package com.gc.CollabSphereApp.posts_service.client;

import com.gc.CollabSphereApp.posts_service.dto.PersonDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;


@FeignClient(name = "connections-service", url = "${connections-service.url:http://localhost:9030}", path = "/connections")
public interface ConnectionsClient {

    @GetMapping("/core/connections")
    List<PersonDto> getFirstConnections();

}

