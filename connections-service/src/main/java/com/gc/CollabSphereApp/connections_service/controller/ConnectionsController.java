package com.gc.CollabSphereApp.connections_service.controller;

import com.gc.CollabSphereApp.connections_service.dto.PersonConnectionDto;
import com.gc.CollabSphereApp.connections_service.service.ConnectionsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/core")
@RequiredArgsConstructor
public class ConnectionsController {

    private final ConnectionsService connectionsService;

    @GetMapping("/people")
    public ResponseEntity<List<PersonConnectionDto>> searchPeople(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(connectionsService.searchPeople(query));
    }

    @GetMapping("/connections")
    public ResponseEntity<List<PersonConnectionDto>> getConnections() {
        return ResponseEntity.ok(connectionsService.getConnections());
    }

    @GetMapping("/requests/received")
    public ResponseEntity<List<PersonConnectionDto>> getReceivedRequests() {
        return ResponseEntity.ok(connectionsService.getReceivedRequests());
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<List<PersonConnectionDto>> getSentRequests() {
        return ResponseEntity.ok(connectionsService.getSentRequests());
    }

    @PostMapping("/request/{userId}")
    public ResponseEntity<Boolean> sendConnectionRequest(@PathVariable Long userId) {
        return ResponseEntity.ok(connectionsService.sendConnectionRequest(userId));
    }

    @PostMapping("/accept/{userId}")
    public ResponseEntity<Boolean> acceptConnectionRequest(@PathVariable Long userId) {
        return ResponseEntity.ok(connectionsService.acceptConnectionRequest(userId));
    }

    @PostMapping("/reject/{userId}")
    public ResponseEntity<Boolean> rejectConnectionRequest(@PathVariable Long userId) {
        return ResponseEntity.ok(connectionsService.rejectConnectionRequest(userId));
    }
}
