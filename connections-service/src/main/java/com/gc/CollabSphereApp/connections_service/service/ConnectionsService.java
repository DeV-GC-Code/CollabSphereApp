package com.gc.CollabSphereApp.connections_service.service;

import com.gc.CollabSphereApp.connections_service.auth.UserContextHolder;
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
    public List<Person> getFirstDegreeConnections() {
        Long userId = UserContextHolder.getCurrentUserId();
        log.info("Getting first degree connections for user with id: {}", userId);

        return personRepository.getFirstDegreeConnections(userId);
    }

    @Transactional(readOnly = true)
    public List<Person> getSecondDegreeConnections() {
        Long userId = UserContextHolder.getCurrentUserId();
        log.info("Getting second degree connections for user with id: {}", userId);
        return personRepository.getSecondDegreeConnections(userId);
    }

    @Transactional(readOnly = true)
    public List<Person> getThirdDegreeConnections() {
        Long userId = UserContextHolder.getCurrentUserId();
        log.info("Getting third degree connections for user with id: {}", userId);
        return personRepository.getThirdDegreeConnections(userId);
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

}