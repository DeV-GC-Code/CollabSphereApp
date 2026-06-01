import { request } from "./client.js";

export function signup(payload) {
  return request("/users/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export function login(payload) {
  return request("/users/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getStats() {
  return request("/users/stats");
}
