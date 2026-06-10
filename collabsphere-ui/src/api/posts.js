import { request } from "./client.js";

export function getUserPosts(userId, token) {
  return request(`/posts/core/users/${userId}/allPosts`, { token });
}

export function getFeed(token) {
  return request("/posts/core/feed", { token });
}

export function getPostComments(postId, token) {
  return request(`/posts/core/${postId}/comments`, { token });
}

export function createPostComment(postId, content, token) {
  return request(`/posts/core/${postId}/comments`, {
    method: "POST",
    body: { content },
    token,
  });
}

export function createPost(content, token) {
  return request("/posts/core", {
    method: "POST",
    body: { content },
    token,
  });
}

export function likePost(postId, token) {
  return request(`/likes/${postId}`, {
    method: "POST",
    token,
  });
}

export function unlikePost(postId, token) {
  return request(`/likes/${postId}`, {
    method: "DELETE",
    token,
  });
}
