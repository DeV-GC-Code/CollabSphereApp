package com.gc.CollabSphereApp.posts_service.service;

import com.gc.CollabSphereApp.event.PostCreatedEvent;
import com.gc.CollabSphereApp.posts_service.auth.UserContextHolder;
import com.gc.CollabSphereApp.posts_service.client.ConnectionsClient;
import com.gc.CollabSphereApp.posts_service.dto.PersonDto;
import com.gc.CollabSphereApp.posts_service.dto.PostCreateRequestDto;
import com.gc.CollabSphereApp.posts_service.dto.PostDto;
import com.gc.CollabSphereApp.posts_service.entity.Post;
import com.gc.CollabSphereApp.posts_service.exception.ResourceNotFoundException;
import com.gc.CollabSphereApp.posts_service.repository.PostsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    @Value("${kafka.topic.post-created-topic}")
    private String KAFKA_POST_CREATED_TOPIC;

    private final PostsRepository postsRepository;
    private final ModelMapper modelMapper;
    private final ConnectionsClient connectionsClient;
    private final KafkaTemplate<Long, PostCreatedEvent> kafkaTemplate;

    /**
     * Returns the caller's connections. Falls back to an empty list when the
     * connections-service is unavailable so all other operations degrade
     * gracefully instead of failing with a 5xx.
     */
    private List<PersonDto> fetchConnections() {
        try {
            return connectionsClient.getFirstConnections();
        } catch (Exception e) {
            log.warn("[PostService] connections-service unreachable — degraded mode (own posts only): {}",
                    e.getMessage());
            return List.of();
        }
    }

    public PostDto createPost(PostCreateRequestDto postDto) {
        Long userId = UserContextHolder.getCurrentUserId();
        Post post = modelMapper.map(postDto, Post.class);
        post.setUserId(userId);
        Post savedPost = postsRepository.save(post);

        PostCreatedEvent event = modelMapper.map(savedPost, PostCreatedEvent.class);
        kafkaTemplate.send(KAFKA_POST_CREATED_TOPIC, event.getId(), event);

        return modelMapper.map(savedPost, PostDto.class);
    }

    public PostDto getPostById(Long postId) {
        Post post = requirePostVisible(postId);
        return modelMapper.map(post, PostDto.class);
    }

    public List<PostDto> getAllPostsOfUser(Long targetUserId) {
        Long currentUserId = UserContextHolder.getCurrentUserId();

        if (!currentUserId.equals(targetUserId)) {
            boolean isConnected = fetchConnections().stream()
                    .anyMatch(c -> targetUserId.equals(c.getUserId()));
            if (!isConnected) {
                throw new ResourceNotFoundException("Posts not accessible - User not connected");
            }
        }

        List<Post> posts = postsRepository.findByUserId(targetUserId);
        if (posts.isEmpty()) {
            throw new ResourceNotFoundException("No posts found for user: " + targetUserId);
        }

        return posts.stream()
                .map(post -> modelMapper.map(post, PostDto.class))
                .collect(Collectors.toList());
    }

    public List<PostDto> getFeed() {
        Long currentUserId = UserContextHolder.getCurrentUserId();
        List<Long> visibleUserIds = new ArrayList<>();
        visibleUserIds.add(currentUserId);

        fetchConnections().stream()
                .map(PersonDto::getUserId)
                .filter(uid -> uid != null && !visibleUserIds.contains(uid))
                .forEach(visibleUserIds::add);

        return postsRepository.findByUserIdInOrderByCreatedAtDesc(visibleUserIds).stream()
                .map(post -> modelMapper.map(post, PostDto.class))
                .collect(Collectors.toList());
    }

    public Post requirePostVisible(Long postId) {
        Long currentUserId = UserContextHolder.getCurrentUserId();
        Post post = postsRepository.findById(postId).orElseThrow(() ->
                new ResourceNotFoundException("Post not found with id:" + postId));

        if (currentUserId.equals(post.getUserId())) {
            return post;
        }

        boolean isConnected = fetchConnections().stream()
                .map(PersonDto::getUserId)
                .anyMatch(post.getUserId()::equals);

        if (!isConnected) {
            throw new ResourceNotFoundException("Post not accessible - User not connected");
        }
        return post;
    }
}
