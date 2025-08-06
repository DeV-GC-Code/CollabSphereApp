package com.gc.CollabSphereApp.notification_service.consumer;

import com.gc.CollabSphereApp.event.AcceptConnectionEvent;
import com.gc.CollabSphereApp.event.PostCreatedEvent;
import com.gc.CollabSphereApp.event.PostLikedEvent;
import com.gc.CollabSphereApp.event.SendConnectionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class KafkaConsumer {
    @KafkaListener(topics = "post-created-topic")
    public void handlePostCreated(PostCreatedEvent postCreatedEvent) {
        log.info("HandlePostCreated: {}",postCreatedEvent);
    }

    @KafkaListener(topics = "post-liked-topic")
    public void handlePostLiked(PostLikedEvent postLikedEvent) {
        log.info("HandlePostLiked: {}", postLikedEvent);
        Long postCreatorId = postLikedEvent.getUserid();
        Long likedByUserId = postLikedEvent.getLikedByUserId();
        log.info("Notification: User {} liked your post (ID: {}). Notification sent to User {}.", likedByUserId, postLikedEvent.getPostid(), postCreatorId);
    }

    @KafkaListener(topics = "accept-connection-topic")
    public void handleAcceptConnections(AcceptConnectionEvent acceptConnectionEvent) {
        log.info("HandleAcceptConnectionRequest: {}", acceptConnectionEvent);
    }

    @KafkaListener(topics = "send-connection-topic")
    public void handleSendConnections(SendConnectionEvent sendConnectionEvent) {
        log.info("HandleSendConnectionRequest: {}", sendConnectionEvent);
    }

}
