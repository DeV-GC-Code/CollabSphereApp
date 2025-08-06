package com.gc.CollabSphereApp.posts_service.service;

import com.gc.CollabSphereApp.event.PostLikedEvent;
import com.gc.CollabSphereApp.posts_service.auth.UserContextHolder;
import com.gc.CollabSphereApp.posts_service.entity.PostLike;
import com.gc.CollabSphereApp.posts_service.exception.BadRequestException;
import com.gc.CollabSphereApp.posts_service.exception.ResourceNotFoundException;
import com.gc.CollabSphereApp.posts_service.repository.PostLikeRepository;
import com.gc.CollabSphereApp.posts_service.repository.PostsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostLikeService {

    @Value("${kafka.topic.post-liked-topic}")
    private String KAFKA_POST_LIKED_TOPIC;


    private final PostLikeRepository postLikeRepository;
    private final PostsRepository postsRepository;

    private final KafkaTemplate<Long, Object> kafkaTemplate;

    public void likePost(Long postId) {
        Long userId = UserContextHolder.getCurrentUserId();
        log.info("Attempting to like the post with id: {}", postId);
        boolean exists = postsRepository.existsById(postId);
        if(!exists) throw new ResourceNotFoundException("Post not found with id: "+postId);

        boolean alreadyLiked = postLikeRepository.existsByUserIdAndPostId(userId, postId);
        if(alreadyLiked) throw new BadRequestException("Cannot like the same post again.");

        PostLike postLike = new PostLike();
        postLike.setPostId(postId);
        postLike.setUserId(userId);
        PostLike savedLike = postLikeRepository.save(postLike);

        // Publish PostLikedEvent
        PostLikedEvent event = new PostLikedEvent(
                savedLike.getId(),
                savedLike.getPostId(),
                savedLike.getUserId()
        );
        kafkaTemplate.send(KAFKA_POST_LIKED_TOPIC, event.getId(), event);

        log.info("Post with id: {} liked successfully", postId);
    }

    public void unlikePost(Long postId) {
        Long userId = UserContextHolder.getCurrentUserId();
        log.info("Attempting to unlike the post with id: {}", postId);
        boolean exists = postsRepository.existsById(postId);
        if(!exists) throw new ResourceNotFoundException("Post not found with id: "+postId);

        boolean alreadyLiked = postLikeRepository.existsByUserIdAndPostId(userId, postId);
        if(!alreadyLiked) throw new BadRequestException("Cannot unlike the post which is not liked.");

        postLikeRepository.deleteByUserIdAndPostId(userId, postId);

        log.info("Post with id: {} unliked successfully", postId);
    }
}
