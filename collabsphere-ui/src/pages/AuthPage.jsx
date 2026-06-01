import { useEffect, useState } from "react";
import { getStats, login, signup } from "../api/auth.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Sphere3D } from "../components/Sphere3D.jsx";
import { Icons } from "../components/Icons.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

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
  const [mode, setMode] = useState("signup");
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
    <div className="auth-split" style={{ position: "relative" }}>
      <ThemeToggle className="auth-floating-toggle" />

      {/* ── LEFT — Hero ──────────────────────────────────────── */}
      <aside className="auth-hero">

        {/* Brand — pinned top */}
        <div className="auth-hero__brand-row">
          <div className="auth-hero__icon">
            <img src="/icon.png" alt="CollabSphere" />
          </div>
          <span className="auth-hero__brand-name">CollabSphere</span>
        </div>

        {/* Center block — sphere + copy vertically centered together */}
        <div className="auth-hero__center">
          <div className="auth-hero__viz">
            <Sphere3D size={320} />
          </div>

          <div className="auth-hero__copy">
            <h1 className="auth-hero__headline">
              Where ideas <span className="hero-accent">collide</span><br />
              &amp; networks grow.
            </h1>
            <p className="auth-hero__sub">
              The professional community for engineers, designers, and product thinkers.
            </p>
            <div className="auth-hero__stats">
              {memberCount !== null && (
                <>
                  <span>{memberCount.toLocaleString()} members</span>
                  <span className="stat-sep" />
                </>
              )}
              <span>Engineers</span>
              <span className="stat-sep" />
              <span>Designers</span>
              <span className="stat-sep" />
              <span>PMs</span>
            </div>
          </div>
        </div>

      </aside>

      {/* ── RIGHT — Form ─────────────────────────────────────── */}
      <main className="auth-form-side">
        <div className="auth-form-card">

          <div className="auth-form-card__header">
            <div>
              <h2 className="auth-form-card__title">
                {isSignup ? "Create your account" : "Welcome back"}
              </h2>
              <p className="auth-form-card__sub">
                {isSignup ? "Free forever · no credit card needed" : "Sign in to continue to CollabSphere"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              className={`auth-tab${mode === "signup" ? " active" : ""}`}
              type="button" role="tab" aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
            >Sign up</button>
            <button
              className={`auth-tab${mode === "login" ? " active" : ""}`}
              type="button" role="tab" aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
            >Log in</button>
          </div>

          {error   && <div className="notice notice--error"   role="alert">{error}</div>}
          {message && <div className="notice notice--success" role="status">{message}</div>}

          <form className="form" onSubmit={submit} noValidate>
            {isSignup && (
              <>
                <label>
                  <span>Full name</span>
                  <input value={form.name} onChange={set("name")} autoComplete="name" placeholder="Jane Smith" required />
                </label>
                <label>
                  <span>Company / School</span>
                  <input value={form.worksAt} onChange={set("worksAt")} autoComplete="organization" placeholder="Acme Corp" required />
                </label>
              </>
            )}

            <label>
              <span>Email address</span>
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="jane@acme.com" required />
            </label>

            <label>
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "Create a strong password" : "Your password"}
                  required
                  style={{ width: "100%" }}
                />
                <button
                  type="button"
                  className="password-field__toggle"
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
            </label>

            <button
              className="button button--primary button--block auth-submit"
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

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="auth-switch__link"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
            >
              {isSignup ? "Sign in" : "Create a free account"}
            </button>
          </p>

        </div>
      </main>
    </div>
  );
}
