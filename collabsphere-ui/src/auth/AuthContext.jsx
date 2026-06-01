import { createContext, useContext, useMemo, useState } from "react";
import { decodeJwt } from "../utils/jwt.js";
import { loadSession, saveSession, clearSession } from "../utils/session.js";

const AuthContext = createContext(null);

function userFromToken(token, fallbackEmail = "") {
  const payload = decodeJwt(token);
  const email = payload.email || fallbackEmail;
  const fallbackName = email ? email.split("@")[0] : "Member";

  return {
    id: Number(payload.sub),
    email,
    name: payload.name || fallbackName,
    worksAt: payload.worksAt || "",
    exp: payload.exp,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  const signIn = (token, email) => {
    const nextSession = {
      token,
      user: userFromToken(token, email),
    };
    setSession(nextSession);
    saveSession(nextSession);
  };

  const signOut = () => {
    setSession(null);
    clearSession();
  };

  const value = useMemo(
    () => ({
      token: session?.token || null,
      user: session?.user || null,
      isAuthenticated: Boolean(session?.token),
      signIn,
      signOut,
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
