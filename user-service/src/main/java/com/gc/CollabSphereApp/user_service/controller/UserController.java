package com.gc.CollabSphereApp.user_service.controller;

import com.gc.CollabSphereApp.user_service.dto.UserDto;
import com.gc.CollabSphereApp.user_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ModelMapper modelMapper;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> stats() {
        return ResponseEntity.ok(Map.of("memberCount", userRepository.count()));
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> listAll() {
        List<UserDto> users = userRepository.findAll()
                .stream()
                .map(u -> modelMapper.map(u, UserDto.class))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(modelMapper.map(u, UserDto.class)))
                .orElse(ResponseEntity.notFound().build());
    }
}
