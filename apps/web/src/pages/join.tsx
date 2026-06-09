import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { useSession } from "../lib/auth";

interface Props {
  onSelectOrg: (id: string) => void;
}

export default function JoinPage({ onSelectOrg }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { data: session } = useSession();

  const { data: org, isLoading, error } = trpc.organizations.bySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const join = trpc.organizations.join.useMutation({
    onSuccess: (org) => {
      onSelectOrg(org.id);
    },
  });

  const [displayName, setDisplayName] = useState("");

  // Pre-fill name from session
  useEffect(() => {
    if (session?.user?.name && !displayName) {
      setDisplayName(session.user.name);
    }
  }, [session]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    join.mutate({ organizationId: org.id, displayName });
  }

  // Not logged in — send to auth, then back here
  if (!session) {
    const returnTo = `/join/${slug}`;
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ maxWidth: 420, width: "100%", padding: "44px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>☕</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--font-display)", marginBottom: 8 }}>
            Join the Run Club
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28, lineHeight: 1.5 }}>
            You need an account to join. Sign up or sign in first — we'll bring you right back.
          </p>
          <a
            href={`/auth?redirect=${encodeURIComponent(returnTo)}`}
            className="btn btn-primary"
            style={{ fontSize: 15, padding: "13px 28px", width: "100%", display: "block", textAlign: "center" }}
          >
            Sign up / Sign in
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Looking up the café…</div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ maxWidth: 420, width: "100%", padding: "44px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--font-display)", marginBottom: 8 }}>
            Club not found
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 28, lineHeight: 1.5 }}>
            We couldn't find a run club at this link. Check with your café for the correct invite URL.
          </p>
          <button className="btn btn-outline" style={{ fontSize: 14 }} onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 460, width: "100%" }}>

        {/* Café card */}
        <div className="card" style={{ padding: "32px 36px", marginBottom: 4, textAlign: "center" }}>
          {/* Brand mark */}
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#C8611A,#9E4712)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
            fontSize: 32,
          }}>
            ☕
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", letterSpacing: ".08em", marginBottom: 6 }}>
            YOU'VE BEEN INVITED TO JOIN
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-display)", marginBottom: 8 }}>
            {org.name}
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 0, lineHeight: 1.5 }}>
            Log your runs, earn rewards, and compete on the leaderboard with fellow members.
          </p>
        </div>

        {/* Perks strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { icon: "🏃", label: "Log Miles" },
            { icon: "☕", label: "Earn Rewards" },
            { icon: "🏆", label: "Leaderboard" },
          ].map((p) => (
            <div key={p.label} className="card" style={{ padding: "14px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{p.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{p.label}</div>
            </div>
          ))}
        </div>

        {/* Join form */}
        <div className="card" style={{ padding: "28px 36px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Join as…</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
            Choose how you'll appear on the leaderboard and to other members.
          </p>

          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="flabel">Your Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rick"
                required
                autoFocus
                className="field"
              />
            </div>

            {join.error && (
              <p style={{ fontSize: 14, color: "#B0492A" }}>{join.error.message}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={join.isPending}
              style={{ fontSize: 15, padding: "13px", width: "100%" }}
            >
              {join.isPending ? "Joining…" : `Join ${org.name} →`}
            </button>
          </form>

          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 16, textAlign: "center" }}>
            Signed in as {session.user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
