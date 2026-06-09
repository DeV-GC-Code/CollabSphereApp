const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const REQUEST_TIMEOUT_MS = 12000;

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function normalizeError(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return payload.error || payload.message || payload.detail || fallback;
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request(path, { method = "GET", body, token, signal } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);

  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ApiError(
        controller.signal.reason === "timeout"
          ? "Request timed out. Please try again."
          : "Request was cancelled.",
        408,
      );
    }
    if (err instanceof TypeError) {
      throw new ApiError("Service unavailable. Please try again.", 503);
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  const payload = await parseResponse(response).catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      normalizeError(payload, response.statusText || `Request failed with ${response.status}`),
      response.status,
      payload,
    );
  }

  return payload;
}
