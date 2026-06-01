import { request } from "./client.js";

export function getConversations(token) {
  return request("/messages/core/conversations", { token });
}

export function getMessages(recipientId, token) {
  return request(`/messages/core/conversations/${recipientId}`, { token });
}

export function sendMessage(recipientId, content, token) {
  return request(`/messages/core/conversations/${recipientId}`, {
    method: "POST",
    body: { content },
    token,
  });
}

export function deleteMessage(messageId, token) {
  return request(`/messages/core/${messageId}`, { method: "DELETE", token });
}

export function markConversationRead(recipientId, token) {
  return request(`/messages/core/conversations/${recipientId}/read`, {
    method: "PUT",
    token,
  });
}
