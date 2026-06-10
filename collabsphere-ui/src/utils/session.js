const SESSION_KEY = "collabsphere.session";

function isExpired(session) {
  const exp = session?.user?.exp;
  if (!exp) return false;
  return Date.now() >= exp * 1000;
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (isExpired(session)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
