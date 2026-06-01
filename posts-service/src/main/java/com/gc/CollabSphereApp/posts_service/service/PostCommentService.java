package com.gc.CollabSphereApp.posts_service.service;

import com.gc.CollabSphereApp.posts_service.auth.UserContextHolder;
import com.gc.CollabSphereApp.posts_service.dto.PostCommentCreateRequestDto;
import com.gc.CollabSphereApp.posts_service.dto.PostCommentDto;
import com.gc.CollabSphereApp.posts_service.entity.Post;
import com.gc.CollabSphereApp.posts_service.entity.PostComment;
import com.gc.CollabSphereApp.posts_service.exception.BadRequestException;
import com.gc.CollabSphereApp.posts_service.repository.PostCommentRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostCommentService {

    private final PostCommentRepository postCommentRepository;
    private final PostService postService;
    private final ModelMapper modelMapper;

    public List<PostCommentDto> getComments(Long postId) {
        postService.requirePostVisible(postId);
        return postCommentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(comment -> modelMapper.map(comment, PostCommentDto.class))
                .toList();
    }

    public PostCommentDto createComment(Long postId, PostCommentCreateRequestDto requestDto) {
        Post post = postService.requirePostVisible(postId);
        String content = requestDto == null || requestDto.getContent() == null ? "" : requestDto.getContent().trim();
        if (content.isEmpty()) {
            throw new BadRequestException("Comment cannot be empty");
        }
        if (content.length() > 500) {
            throw new BadRequestException("Comment cannot exceed 500 characters");
        }

        PostComment comment = new PostComment();
        comment.setPostId(post.getId());
        comment.setUserId(UserContextHolder.getCurrentUserId());
        comment.setContent(content);
        return modelMapper.map(postCommentRepository.save(comment), PostCommentDto.class);
    }
}
