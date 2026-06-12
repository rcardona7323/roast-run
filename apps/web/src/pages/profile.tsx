import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useSession, signOut } from "../lib/auth";
import FamilySection from "../components/family-section";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data: member } = trpc.members.me.useQuery();
  const utils = trpc.useUtils();

  const update = trpc.members.update.useMutation({
    onSuccess: () => utils.members.me.invalidate(),
  });
  const getOrCreate = trpc.members.getOrCreate.useMutation({
    onSuccess: () => utils.members.me.invalidate(),
  });

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (member) {
      setDisplayName(member.displayName ?? "");
      setEmail(member.email ?? session?.user.email ?? "");
      setPhone(member.phone ?? "");
      setEmergencyContact(member.emergencyContact ?? "");
      setEmergencyPhone(member.emergencyPhone ?? "");
    } else if (session?.user) {
      setDisplayName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [member, session]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const action = member
      ? update.mutateAsync({
          displayName,
          email,
          phone: phone || undefined,
          emergencyContact: emergencyContact || undefined,
          emergencyPhone: emergencyPhone || undefined,
        })
      : getOrCreate.mutateAsync({ displayName, email });
    action.then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); });
  }

  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><UserIcon /></span>
            My Profile
          </h1>
          <p className="page-sub">Update your contact details and emergency info.</p>
        </div>
      </div>

      <div style={{ maxWidth: 540 }}>
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 32 }}>
          <div className="avatar-circle" style={{ width: 64, height: 64, fontSize: 22 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{displayName || "—"}</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>{member?.totalMiles?.toFixed(1) ?? "0.0"} miles logged</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Personal info */}
          <div className="card" style={{ padding: "26px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label className="flabel">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="field"
              />
            </div>
            <div>
              <label className="flabel">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="flabel">
                Phone <span style={{ color: "var(--muted)", fontWeight: 500 }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="field"
              />
            </div>
          </div>

          {/* Emergency contact */}
          <div className="card" style={{ padding: "26px 24px", marginTop: 14, display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 16 }}>🚨</span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>Emergency Contact</span>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>(optional)</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                Shared with club organizers only in case of an emergency during a run.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <div>
                <label className="flabel">Contact Name</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Jane Cardona"
                  className="field"
                />
              </div>
              <div>
                <label className="flabel">Contact Phone</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="field"
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="submit"
              disabled={update.isPending || getOrCreate.isPending}
              className="btn btn-primary"
            >
              {update.isPending || getOrCreate.isPending ? "Saving…" : "Save Changes"}
            </button>
            {saved && <span style={{ fontSize: 14, color: "var(--green)", fontWeight: 600 }}>Saved ✓</span>}
          </div>
        </form>

        <FamilySection />

        {!member?.stravaTokens && (
          <div style={{ marginTop: 28, padding: "20px 22px", borderRadius: "var(--radius)",
            background: "var(--primary-tint-2)", border: "1px solid var(--primary-tint)" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--primary-deep)", marginBottom: 6 }}>
              Connect Strava
            </p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
              Auto-import runs from your Strava activities. New activities sync automatically.
            </p>
            <a href="/api/strava/connect" className="btn btn-primary" style={{ fontSize: 14, padding: "10px 18px" }}>
              Connect Strava
            </a>
          </div>
        )}

        {/* Sign out */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <button
            className="btn btn-outline"
            style={{ width: "100%", fontSize: 15, padding: "12px", color: "#B0492A" }}
            onClick={() => signOut().then(() => { window.location.href = "/"; })}
          >
            Sign Out
          </button>
          <p style={{ fontSize: 12.5, color: "var(--muted-2)", textAlign: "center", marginTop: 10 }}>
            Signed in as {session?.user.email}
          </p>
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
