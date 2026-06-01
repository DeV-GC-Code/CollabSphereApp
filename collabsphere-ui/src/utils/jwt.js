export function decodeJwt(token) {
  const [, payload] = token.split(".");
  if (!payload) return {};

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  try {
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}
