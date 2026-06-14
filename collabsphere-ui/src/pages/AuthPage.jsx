import { useEffect, useState } from "react";
import { getStats, login, signup } from "../api/auth.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { BrandOrb } from "../components/BrandOrb.jsx";
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
    <div className="auth">
      <div className="auth__panel">
        {/* Brand */}
        <div className="auth__brand">
          <BrandOrb size={68} />
          <span className="auth__brandname">CollabSphere</span>
        </div>

        {/* Heading */}
        <header className="auth__head">
          <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p>
            {isSignup
              ? "Join the community for engineers, designers & product thinkers."
              : "Sign in to where ideas collide & networks grow."}
          </p>
        </header>

        {error && <div className="notice notice--error" role="alert">{error}</div>}
        {message && <div className="notice notice--success" role="status">{message}</div>}

        {/* Form */}
        <form className="auth__form" onSubmit={submit} noValidate>
          {isSignup && (
            <>
              <label className="auth__field">
                <span>Full name</span>
                <input value={form.name} onChange={set("name")} autoComplete="name" placeholder="Ada Lovelace" required />
              </label>
              <label className="auth__field">
                <span>Company / School</span>
                <input value={form.worksAt} onChange={set("worksAt")} autoComplete="organization" placeholder="Acme Inc." required />
              </label>
            </>
          )}

          <label className="auth__field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@company.com" required />
          </label>

          <label className="auth__field auth__field--pwd">
            <span>Password</span>
            <div className="auth__wrap">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth__pwd-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </label>

          {isSignup && (
            <p className="auth__hint">Min 8 characters · no spaces · 1 uppercase · 1 number</p>
          )}

          <button className="button button--primary button--block auth__submit" type="submit" disabled={loading}>
            {loading ? (
              <Spinner label={isSignup ? "Creating account" : "Signing in"} />
            ) : isSignup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Switch */}
        <p className="auth__switch">
          {isSignup ? "Already have an account?" : "New to CollabSphere?"}{" "}
          <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>

        {memberCount != null && (
          <p className="auth__proof">Join {Number(memberCount).toLocaleString()}+ members already on CollabSphere</p>
        )}
      </div>
    </div>
  );
}
