package com.gc.CollabSphereApp.connections_service.service;

import com.gc.CollabSphereApp.connections_service.auth.UserContextHolder;
import com.gc.CollabSphereApp.connections_service.dto.PersonConnectionDto;
import com.gc.CollabSphereApp.connections_service.entity.Person;
import com.gc.CollabSphereApp.connections_service.repository.PersonRepository;
import com.gc.CollabSphereApp.event.AcceptConnectionEvent;
import com.gc.CollabSphereApp.event.SendConnectionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
@Slf4j
public class ConnectionsService {

    private final PersonRepository personRepository;
    private final KafkaTemplate<Long, SendConnectionEvent> kafkaTemplate;
    private final KafkaTemplate<Long, AcceptConnectionEvent> acceptConnectionKafkaTemplate;

    @Value("${kafka.topic.send-connection-topic}")
    private String sendConnectionTopic;

    @Value("${kafka.topic.accept-connection-topic}")
    private String acceptConnectionTopic;

    @Transactional(readOnly = true)
    public List<PersonConnectionDto> searchPeople(String query) {
        Long userId = UserContextHolder.getCurrentUserId();
        return personRepository.searchPeople(userId, query).stream()
                .map(person -> toConnectionDto(person, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonConnectionDto> getConnections() {
        Long userId = UserContextHolder.getCurrentUserId();
        return personRepository.getAcceptedConnections(userId).stream()
                .map(person -> toDto(person, "CONNECTED"))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonConnectionDto> getReceivedRequests() {
        Long userId = UserContextHolder.getCurrentUserId();
        return personRepository.getReceivedConnectionRequests(userId).stream()
                .map(person -> toDto(person, "REQUEST_RECEIVED"))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonConnectionDto> getSentRequests() {
        Long userId = UserContextHolder.getCurrentUserId();
        return personRepository.getSentConnectionRequests(userId).stream()
                .map(person -> toDto(person, "REQUEST_SENT"))
                .toList();
    }

    @Transactional
    public Boolean sendConnectionRequest(Long receiverId) {
        Long senderId = UserContextHolder.getCurrentUserId();
        log.info("Trying to send connection request, sender: {}, receiver: {}", senderId, receiverId);

        if (senderId.equals(receiverId)) {
            throw new IllegalArgumentException("Cannot send connection request to yourself");
        }
        if (receiverId == null || receiverId <= 0) {
            throw new IllegalArgumentException("Receiver ID is invalid");
        }
        // Check if both users exist in Neo4j
        if (personRepository.findByUserId(senderId).isEmpty()) {
            throw new IllegalStateException("Sender does not exist in Neo4j");
        }
        if (personRepository.findByUserId(receiverId).isEmpty()) {
            throw new IllegalStateException("Receiver does not exist in Neo4j");
        }
        if (personRepository.connectionRequestExists(senderId, receiverId)) {
            throw new IllegalStateException("Connection request already exists");
        }
        if (personRepository.alreadyConnected(senderId, receiverId)) {
            throw new IllegalStateException("Users are already connected");
        }
        if (personRepository.connectionRequestExists(receiverId, senderId)) {
            personRepository.acceptConnectionRequest(receiverId, senderId);
            AcceptConnectionEvent acceptEvent = AcceptConnectionEvent.newBuilder()
                    .setSenderId(receiverId)
                    .setReceiverId(senderId)
                    .build();
            acceptConnectionKafkaTemplate.send(acceptConnectionTopic, receiverId, acceptEvent);
            return true;
        }
        personRepository.addConnectionRequest(senderId, receiverId);
        log.info("Connection request sent successfully");
        SendConnectionEvent event = SendConnectionEvent.newBuilder()
                .setSenderId(senderId)
                .setReceiverId(receiverId)
                .build();
        kafkaTemplate.send(sendConnectionTopic, senderId, event);
        return true;
    }

    @Transactional
    public Boolean acceptConnectionRequest(Long senderId) {
        Long receiverId = UserContextHolder.getCurrentUserId();
        log.info("Trying to accept connection request, sender: {}, receiver: {}", senderId, receiverId);

        if (senderId.equals(receiverId)) {
            throw new IllegalArgumentException("Cannot accept your own connection request");
        }
        if (senderId <= 0) {
            throw new IllegalArgumentException("Sender ID is invalid");
        }
        if (!personRepository.connectionRequestExists(senderId, receiverId)) {
            throw new IllegalStateException("No connection request exists to accept");
        }
        if (personRepository.alreadyConnected(senderId, receiverId)) {
            throw new IllegalStateException("Users are already connected");
        }
        personRepository.acceptConnectionRequest(senderId, receiverId);
        log.info("Connection request accepted successfully");
        AcceptConnectionEvent event = AcceptConnectionEvent.newBuilder()
                .setSenderId(senderId)
                .setReceiverId(receiverId)
                .build();
        acceptConnectionKafkaTemplate.send(acceptConnectionTopic, senderId, event);
        return true;
    }

    @Transactional
    public Boolean rejectConnectionRequest(Long senderId) {
        Long receiverId = UserContextHolder.getCurrentUserId();
        log.info("Trying to reject connection request, sender: {}, receiver: {}", senderId, receiverId);

        if (senderId.equals(receiverId)) {
            throw new IllegalArgumentException("Cannot reject your own connection request");
        }
        if (senderId <= 0) {
            throw new IllegalArgumentException("Sender ID is invalid");
        }
        if (!personRepository.connectionRequestExists(senderId, receiverId)) {
            throw new IllegalStateException("No connection request exists to reject");
        }

        personRepository.rejectConnectionRequest(senderId, receiverId);
        log.info("Connection request rejected successfully");
        return true;
    }

    private PersonConnectionDto toConnectionDto(Person person, Long currentUserId) {
        Long otherUserId = person.getUserId();
        String status = "NONE";
        if (personRepository.alreadyConnected(currentUserId, otherUserId)) {
            status = "CONNECTED";
        } else if (personRepository.connectionRequestExists(currentUserId, otherUserId)) {
            status = "REQUEST_SENT";
        } else if (personRepository.connectionRequestExists(otherUserId, currentUserId)) {
            status = "REQUEST_RECEIVED";
        }
        return toDto(person, status);
    }

    private PersonConnectionDto toDto(Person person, String status) {
        return PersonConnectionDto.builder()
                .id(person.getId())
                .userId(person.getUserId())
                .name(person.getName())
                .email(person.getEmail())
                .worksAt(person.getWorksAt())
                .status(status)
                .build();
    }

}
