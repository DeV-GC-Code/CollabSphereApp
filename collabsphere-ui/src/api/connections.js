import { request } from "./client.js";

export function searchPeople(query, token) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("query", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/connections/core/people${suffix}`, { token });
}

export function getMyConnections(token) {
  return request("/connections/core/connections", { token });
}

export function getReceivedRequests(token) {
  return request("/connections/core/requests/received", { token });
}

export function getSentRequests(token) {
  return request("/connections/core/requests/sent", { token });
}

export function sendConnectionRequest(userId, token) {
  return request(`/connections/core/request/${userId}`, {
    method: "POST",
    token,
  });
}

export function acceptConnectionRequest(senderId, token) {
  return request(`/connections/core/accept/${senderId}`, {
    method: "POST",
    token,
  });
}

export function rejectConnectionRequest(senderId, token) {
  return request(`/connections/core/reject/${senderId}`, {
    method: "POST",
    token,
  });
}
