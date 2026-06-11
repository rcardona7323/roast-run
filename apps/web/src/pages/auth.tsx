import { useState } from "react";
import { useLocation, Link } from "wouter";
import { signIn, signUp } from "../lib/auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const redirectTo = new URLSearchParams(window.location.search).get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn.email({ email, password });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await signUp.email({ email, password, name });
        if (error) throw new Error(error.message);
      }
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await signIn.social({ provider: "google", callbackURL: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <div className="auth-layout" style={{ background: "var(--bg)" }}>
      {/* Left panel — hidden on mobile */}
      <div className="auth-hero" style={{
        background: "linear-gradient(160deg, #C8611A 0%, #8C3D0A 100%)",
        flexDirection: "column", justifyContent: "space-between",
        padding: "36px 48px", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center", color: "#fff" }}>
            <CupIcon />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, color: "#fff", lineHeight: 1.1 }}>Roast &amp; Run</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 500 }}>Café Club</div>
          </div>
        </div>

        {/* Center copy */}
        <div style={{ position: "relative" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38, color: "#fff", lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: 16 }}>
            Run more.<br />Earn your coffee.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.75)", lineHeight: 1.6, maxWidth: 320 }}>
            Log miles, hit milestones, and redeem café rewards. Your run club's rewards platform.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 36 }}>
            {[
              "Track every mile — manual or Strava",
              "Unlock rewards at distance milestones",
              "See your progress toward the next perk",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <CheckIcon />
                </div>
                <span style={{ fontSize: 14.5, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: "relative" }}>
          <Link href="/">
            <button style={{ fontSize: 13.5, color: "rgba(255,255,255,.6)", fontWeight: 500 }}>← Back to home</button>
          </Link>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 48px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, marginBottom: 6 }}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 32 }}>
            {mode === "signin" ? "Sign in to your run club." : "Join your café run club today."}
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border-2)",
              background: "var(--card)", fontSize: 15, fontWeight: 600, color: "var(--ink-2)",
              transition: "background .15s", marginBottom: 20, cursor: "pointer",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 13, color: "var(--muted-2)", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "signup" && (
              <div>
                <label className="flabel">Your name</label>
                <input
                  type="text"
                  placeholder="Rick Cardona"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="field"
                />
              </div>
            )}
            <div>
              <label className="flabel">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field"
              />
            </div>
            <div>
              <label className="flabel">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="field"
              />
            </div>

            {error && (
              <p style={{ fontSize: 14, color: "#B0492A", background: "#F6E5E0", padding: "10px 14px", borderRadius: 10 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", fontSize: 16, padding: "13px", marginTop: 4 }}
            >
              {loading ? "Loading…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginTop: 24 }}>
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
              style={{ color: "var(--primary)", fontWeight: 700 }}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function CupIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
