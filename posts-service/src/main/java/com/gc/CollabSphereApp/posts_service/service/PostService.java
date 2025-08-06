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


    public PostDto createPost(PostCreateRequestDto postDto) {
        Long userId = UserContextHolder.getCurrentUserId();

        Post post = modelMapper.map(postDto, Post.class);
        post.setUserId(userId);

        Post savedPost = postsRepository.save(post);

        // Map to Avro event
        PostCreatedEvent postCreatedEvent = modelMapper.map(savedPost, PostCreatedEvent.class);
        kafkaTemplate.send(KAFKA_POST_CREATED_TOPIC, postCreatedEvent.getId(), postCreatedEvent);

        // Return the created post as DTO
        return modelMapper.map(savedPost, PostDto.class);
    }

    public PostDto getPostById(Long postId) {
        log.debug("Retrieving post with ID: {}", postId);
        Long userId = UserContextHolder.getCurrentUserId();
        //To get the first degree connections of this user
        List<PersonDto> firstConnections = connectionsClient.getFirstConnections();
        //        TODO send Notifications to all connections

        Post post =  postsRepository.findById(postId).orElseThrow(() ->
                new ResourceNotFoundException("Post not found with id:" +postId));
        return modelMapper.map(post, PostDto.class);
    }

    public List<PostDto> getAllPostsOfUser(Long targetUserId) {
        Long currentUserId = UserContextHolder.getCurrentUserId();

        // If user is not viewing their own posts, check if they're connected
        if (!currentUserId.equals(targetUserId)) {
            List<PersonDto> connections = connectionsClient.getFirstConnections();
            boolean isConnected = connections.stream()
                    .anyMatch(connection -> connection.getId().equals(targetUserId));

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
}

