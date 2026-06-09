import { useEffect, useState } from "react";
import { getStats, login, signup } from "../api/auth.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { GlobeViz } from "../components/GlobeViz.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";

const EMPTY = { name: "", email: "", password: "", worksAt: "" };

function validatePassword(pwd) {
  if (!pwd) return "Password is required.";
  if (/\s/.test(pwd)) return "Password must not contain spaces.";
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pwd)) return "Password must include at least one uppercase letter.";
  if (!/\d/.test(pwd)) return "Password must include at least one number.";
  return null;
}

export function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [memberCount, setMemberCount] = useState(null);
  const { signIn } = useAuth();

  useEffect(() => {
    getStats()
      .then((data) => setMemberCount(data?.memberCount ?? null))
      .catch(() => setMemberCount(null));
  }, []);

  const isSignup = mode === "signup";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setMessage("");
    setShowPwd(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (isSignup) {
        const pwdError = validatePassword(form.password);
        if (pwdError) { setError(pwdError); setLoading(false); return; }

        const created = await signup({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          worksAt: form.worksAt.trim(),
        });
        switchMode("login");
        setForm((f) => ({ ...f, name: "", password: "", worksAt: "" }));
        setMessage(`Account created for ${created.name || form.email} — sign in to continue`);
      } else {
        const res = await login({ email: form.email.trim(), password: form.password });
        const token = typeof res === "string" ? res : res?.token || res?.accessToken;
        if (!token) throw new Error("No access token in login response");
        signIn(String(token), form.email.trim());
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">

      {/* ── LEFT — Hero ──────────────────────────────────────── */}
      <aside className="auth-hero">

        {/* Brand — pinned top */}
        <div className="auth-hero__brand-row">
          <div className="auth-hero__icon">
            <img src="/icon.png" alt="CollabSphere" />
          </div>
          <span className="auth-hero__brand-name">CollabSphere</span>
        </div>

        {/* Center — full globe + copy, vertically centered */}
        <div className="auth-hero__center">
          <div className="auth-hero__viz">
            <GlobeViz size={480} />
          </div>
          <div className="auth-hero__copy">
            <h1 className="auth-hero__headline">
              Where ideas <span className="hero-accent">collide</span><br />
              &amp; networks grow.
            </h1>
            <p className="auth-hero__sub">
              The professional community for engineers, designers, and product thinkers.
            </p>
          </div>
        </div>

      </aside>

      {/* ── RIGHT — Form ─────────────────────────────────────── */}
      <main className="auth-form-side">
        <div className="auth-glass-card">

          <h2 className="auth-glass-card__title">
            {isSignup ? "Create account" : "Sign in"}
          </h2>
          <p className="auth-glass-card__sub">
            {isSignup ? "Free forever · no credit card needed" : "or create an account"}
          </p>

          {error   && <div className="notice notice--error"   role="alert">{error}</div>}
          {message && <div className="notice notice--success" role="status">{message}</div>}

          <form className="auth-glass-form" onSubmit={submit} noValidate>
            {isSignup && (
              <>
                <div className="auth-field">
                  <input
                    value={form.name}
                    onChange={set("name")}
                    autoComplete="name"
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="auth-field">
                  <input
                    value={form.worksAt}
                    onChange={set("worksAt")}
                    autoComplete="organization"
                    placeholder="Company / School"
                    required
                  />
                </div>
              </>
            )}

            <div className="auth-field">
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                placeholder="Email address"
                required
              />
            </div>

            <div className="auth-field auth-field--password">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="Password"
                required
              />
              <button
                type="button"
                className="auth-pwd-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>

            {isSignup && (
              <p className="auth-pwd-hint">
                Min 8 chars · no spaces · 1 uppercase · 1 number
              </p>
            )}

            <button
              className="auth-btn auth-btn--primary"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Spinner label={isSignup ? "Creating account" : "Signing in"} />
              ) : isSignup ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <button
            type="button"
            className="auth-btn auth-btn--outline"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Sign in instead" : "Create account"}
          </button>

        </div>
      </main>
    </div>
  );
}
