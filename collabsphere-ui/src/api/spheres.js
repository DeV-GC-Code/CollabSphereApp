import { request } from "./client.js";

export function getSpheres(query, token) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("query", query.trim());
  const qs = params.toString() ? `?${params}` : "";
  return request(`/spheres/core${qs}`, { token });
}

export function getSphere(id, token) {
  return request(`/spheres/core/${id}`, { token });
}

export function createSphere(payload, token) {
  return request("/spheres/core", { method: "POST", body: payload, token });
}

export function joinSphere(id, token) {
  return request(`/spheres/core/${id}/join`, { method: "POST", token });
}

export function leaveSphere(id, token) {
  return request(`/spheres/core/${id}/leave`, { method: "DELETE", token });
}

export function getSphereMembers(id, token) {
  return request(`/spheres/core/${id}/members`, { token });
}

export function getMySpheresActivity(token) {
  return request("/spheres/core/my", { token });
}

// ── Sphere Posts ──────────────────────────────────────────────────────────────

export function getSpherePosts(sphereId, token) {
  return request(`/spheres/core/${sphereId}/posts`, { token });
}

export function createSpherePost(sphereId, payload, token) {
  return request(`/spheres/core/${sphereId}/posts`, { method: "POST", body: payload, token });
}

export function getSpherePost(sphereId, postId, token) {
  return request(`/spheres/core/${sphereId}/posts/${postId}`, { token });
}

export function deleteSpherePost(sphereId, postId, token) {
  return request(`/spheres/core/${sphereId}/posts/${postId}`, { method: "DELETE", token });
}

export function voteSpherePost(sphereId, postId, vote, token) {
  return request(`/spheres/core/${sphereId}/posts/${postId}/vote`, { method: "POST", body: { vote }, token });
}

export function createSphereComment(sphereId, postId, content, token) {
  return request(`/spheres/core/${sphereId}/posts/${postId}/comments`, { method: "POST", body: { content }, token });
}

export function deleteSphereComment(sphereId, postId, commentId, token) {
  return request(`/spheres/core/${sphereId}/posts/${postId}/comments/${commentId}`, { method: "DELETE", token });
}
