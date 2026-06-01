package com.gc.CollabSphereApp.posts_service.repository;

import com.gc.CollabSphereApp.posts_service.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
    List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);
}
