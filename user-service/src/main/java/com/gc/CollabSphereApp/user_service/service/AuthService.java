package com.gc.CollabSphereApp.user_service.service;

import com.gc.CollabSphereApp.event.UserCreatedEvent;
import com.gc.CollabSphereApp.user_service.dto.LoginRequestDto;
import com.gc.CollabSphereApp.user_service.dto.SignupRequestDto;
import com.gc.CollabSphereApp.user_service.dto.UserDto;
import com.gc.CollabSphereApp.user_service.entity.User;
import com.gc.CollabSphereApp.user_service.exception.BadRequestException;
import com.gc.CollabSphereApp.user_service.exception.ResourceNotFoundException;
import com.gc.CollabSphereApp.user_service.repository.UserRepository;
import com.gc.CollabSphereApp.user_service.utils.PasswordUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final ModelMapper modelMapper;
    private final JwtService jwtService;

    @Value("${kafka.topic.user-created-topic}")
    private String userCreatedTopic;

    private final KafkaTemplate<Long, UserCreatedEvent> kafkaTemplate;

    public UserDto signUp(SignupRequestDto signupRequestDto) {
        boolean exists = userRepository.existsByEmail(signupRequestDto.getEmail());
        if(exists) {
            throw new BadRequestException("User already exists, cannot signup again.");
        }

        User user = modelMapper.map(signupRequestDto, User.class);
        user.setPassword(PasswordUtil.hashPassword(signupRequestDto.getPassword()));
        // Ensure worksAt is never null when persisting (DB has NOT NULL constraint)
        String worksAt = signupRequestDto.getWorksAt();
        if (worksAt == null) {
            worksAt = ""; // default empty string when client doesn't provide value
        }
        user.setWorksAt(worksAt);

        User savedUser = userRepository.save(user);
        // Send UserCreatedEvent to Kafka
        UserCreatedEvent event = UserCreatedEvent.newBuilder()
                .setId(savedUser.getId())
                .setName(savedUser.getName())
                .setEmail(savedUser.getEmail())
                .setWorksAt(savedUser.getWorksAt())
                .build();
        kafkaTemplate.send(userCreatedTopic, Long.valueOf(savedUser.getId().toString()), event);
        return modelMapper.map(savedUser, UserDto.class);
    }

    public String login(LoginRequestDto loginRequestDto) {
        User user = userRepository.findByEmail(loginRequestDto.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: "+loginRequestDto.getEmail()));

        boolean isPasswordMatch = PasswordUtil.checkPassword(loginRequestDto.getPassword(), user.getPassword());

        if(!isPasswordMatch) {
            throw new BadRequestException("Incorrect password");
        }

        return jwtService.generateAccessToken(user);
    }
}
