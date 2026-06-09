import { useState } from "react";
import { trpc } from "../lib/trpc";
import { signOut } from "../lib/auth";

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface Props {
  onSelectOrg: (id: string) => void;
}

export default function OnboardingPage({ onSelectOrg }: Props) {
  const { data: existingOrgs, isLoading } = trpc.organizations.mine.useQuery();
  const createOrg = trpc.organizations.create.useMutation();

  const [cafeName, setCafeName] = useState("");
  const [yourName, setYourName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const slug = slugify(cafeName);
      if (!slug) throw new Error("Café name must contain letters or numbers");
      const org = await createOrg.mutateAsync({ name: cafeName, slug, displayName: yourName });
      onSelectOrg(org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--primary-tint)", borderTopColor: "var(--primary)", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  const hasOrgs = existingOrgs && existingOrgs.length > 0;

  // ── Org picker ───────────────────────────────────────────────────────────
  if (hasOrgs && !showCreate) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, width: "100%" }}>

          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(135deg,#C8611A,#9E4712)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, margin: "0 auto 16px",
            }}>☕</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--font-display)", marginBottom: 6 }}>
              Welcome back!
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted)" }}>Select your run club to continue.</p>
          </div>

          {/* Org list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {existingOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => onSelectOrg(org.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "18px 22px",
                  borderRadius: "var(--radius)", border: "2px solid var(--border)",
                  background: "var(--card)", cursor: "pointer",
                  transition: "border-color .15s, box-shadow .15s",
                  display: "flex", alignItems: "center", gap: 16,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-tint)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg,#C8611A,#9E4712)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>☕</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{org.name}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>/{org.slug}</div>
                </div>
                <div style={{ marginLeft: "auto", color: "var(--primary)", fontSize: 20 }}>→</div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-outline"
              style={{ width: "100%", fontSize: 14 }}
            >
              + Create a new run club
            </button>
            <button
              onClick={() => signOut()}
              style={{ width: "100%", fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "8px" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create org form ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 460, width: "100%" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg,#C8611A,#9E4712)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, margin: "0 auto 16px",
          }}>☕</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--font-display)", marginBottom: 6 }}>
            Set up your Run Club
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)" }}>
            Create your café's run club and start rewarding your runners.
          </p>
        </div>

        <div className="card" style={{ padding: "28px 28px" }}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="flabel">Café Name</label>
              <input
                type="text"
                placeholder="e.g. Blue Bottle Coffee"
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                required
                className="field"
              />
              {cafeName && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>
                  Invite link: /join/{slugify(cafeName)}
                </p>
              )}
            </div>

            <div>
              <label className="flabel">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Rick"
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                required
                className="field"
              />
            </div>

            {error && <p style={{ fontSize: 14, color: "#B0492A" }}>{error}</p>}

            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary"
              style={{ fontSize: 15, padding: "13px", width: "100%" }}
            >
              {creating ? "Creating…" : "Create Run Club"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {hasOrgs && (
            <button
              onClick={() => setShowCreate(false)}
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 14 }}
            >
              ← Back to my clubs
            </button>
          )}
          <button
            onClick={() => signOut()}
            style={{ width: "100%", fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "8px" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
