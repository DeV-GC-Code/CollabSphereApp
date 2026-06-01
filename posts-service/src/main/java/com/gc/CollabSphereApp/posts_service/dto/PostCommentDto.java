package com.gc.CollabSphereApp.posts_service.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PostCommentDto {
    private Long id;
    private Long postId;
    private Long userId;
    private String content;
    private LocalDateTime createdAt;
}
