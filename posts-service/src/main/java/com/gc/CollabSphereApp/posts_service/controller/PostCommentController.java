package com.gc.CollabSphereApp.posts_service.controller;

import com.gc.CollabSphereApp.posts_service.dto.PostCommentCreateRequestDto;
import com.gc.CollabSphereApp.posts_service.dto.PostCommentDto;
import com.gc.CollabSphereApp.posts_service.service.PostCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/core")
@RequiredArgsConstructor
public class PostCommentController {

    private final PostCommentService postCommentService;

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<PostCommentDto>> getComments(@PathVariable Long postId) {
        return ResponseEntity.ok(postCommentService.getComments(postId));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<PostCommentDto> createComment(
            @PathVariable Long postId,
            @RequestBody PostCommentCreateRequestDto requestDto
    ) {
        return new ResponseEntity<>(postCommentService.createComment(postId, requestDto), HttpStatus.CREATED);
    }
}
