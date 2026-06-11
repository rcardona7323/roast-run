import { useState } from "react";
import { Link } from "wouter";
import { authClient } from "../lib/auth";

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const linkError = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) {
      setError("Reset link is invalid or missing. Request a new one.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const invalidLink = linkError === "INVALID_TOKEN" || (!token && !done);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, marginBottom: 6 }}>
          {done ? "Password updated" : "Choose a new password"}
        </h1>

        {done ? (
          <>
            <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28 }}>
              Your password has been reset. You can sign in with it now.
            </p>
            <Link href="/auth">
              <button className="btn btn-primary" style={{ width: "100%", fontSize: 16, padding: "13px" }}>
                Go to Sign In
              </button>
            </Link>
          </>
        ) : invalidLink ? (
          <>
            <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28 }}>
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link href="/auth">
              <button className="btn btn-primary" style={{ width: "100%", fontSize: 16, padding: "13px" }}>
                Back to Sign In
              </button>
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28 }}>
              Pick something memorable — at least 8 characters.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="flabel">New password</label>
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
              <div>
                <label className="flabel">Confirm new password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? "Saving…" : "Set New Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
