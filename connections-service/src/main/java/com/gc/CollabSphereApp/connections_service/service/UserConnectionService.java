package com.gc.CollabSphereApp.connections_service.service;


import com.gc.CollabSphereApp.event.UserCreatedEvent;
import com.gc.CollabSphereApp.connections_service.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserConnectionService {
    private final PersonRepository personRepository;

    @Value("${kafka.topic.user-created-topic}")
    private String userCreatedTopic;

    @Value("${kafka.topic.user-created-dlq}")
    private String userCreatedDlqTopic;

    /**
     * Consumes UserCreatedEvent from Kafka and upserts Person node in Neo4j.
     * Idempotent via MERGE. Malformed events go to DLQ.
     */
    @KafkaListener(topics = "${kafka.topic.user-created-topic}")
    @Transactional
    public void handleUserCreatedEvent(UserCreatedEvent event) {
        try {
            log.info("Received UserCreatedEvent: {}", event);
            // MERGE Cypher for idempotency
            personRepository.upsertPersonWithCompanyAndColleagues(
                    event.getId(),
                    event.getName().toString(),
                    event.getEmail().toString(),
                    event.getWorksAt().toString(),
                    LocalDateTime.now() // or event.getUpdatedAt() if available
            );
            log.info("Upserted Person node for userId={}", event.getId());
        } catch (DataAccessException | IllegalArgumentException ex) {
            log.warn("Malformed UserCreatedEvent, will be sent to DLQ by DefaultErrorHandler: {}", event, ex);
        }
    }
}
