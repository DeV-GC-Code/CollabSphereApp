package com.gc.CollabSphereApp.posts_service.repository;

import com.gc.CollabSphereApp.posts_service.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    boolean existsByUserIdAndPostId(Long userId, Long postId);

    Optional<PostLike> findByUserIdAndPostId(Long userId, Long postId);

    @Transactional
// without transactional a remove to db cannot be done or you we can also put one at the like service unlike post method
    void deleteByUserIdAndPostId(Long userId, Long postId);
}