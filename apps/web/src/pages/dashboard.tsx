import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import LogRunModal from "../components/log-run-modal";

export default function DashboardPage() {
  const [showLog, setShowLog] = useState(false);
  const { data, isLoading } = trpc.dashboard.summary.useQuery();
  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ color: "var(--muted)" }}>Loading…</div>
      </div>
    );
  }

  if (!data) return null;

  const { member, recentRuns, earnedTiers, nextTier, weekMiles, streakWeeks } = data;
  const totalMiles = member.totalMiles;
  const goal = nextTier?.milesRequired ?? totalMiles;
  const pct = nextTier ? Math.min(100, (totalMiles / nextTier.milesRequired) * 100) : 100;
  const toNext = nextTier ? nextTier.milesRequired - totalMiles : 0;
  const pending = earnedTiers.length;

  return (
    <div className="screen">
      {showLog && (
        <LogRunModal
          onClose={() => setShowLog(false)}
          onSaved={() => { setShowLog(false); utils.dashboard.summary.invalidate(); utils.runs.list.invalidate(); }}
        />
      )}

      <div className="page-head">
        <div>
          <h1 className="page-title">Your Dashboard</h1>
          <p className="page-sub">Welcome back, {member.displayName}. Let's get moving.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLog(true)}>
          <ShoeIcon /> Log a Run
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }}>
        <StatCard
          icon={<ActivityIcon />}
          label="Total Miles"
          accent
          foot={`${recentRuns.length} recent runs logged`}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 52, lineHeight: 0.9 }}>
            {totalMiles.toFixed(1)}
          </div>
        </StatCard>

        <StatCard icon={<FlameIcon />} label="This Week" foot="miles logged this week">
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 46, lineHeight: 0.9 }}>
            {weekMiles.toFixed(1)} <span style={{ fontSize: 22, color: "var(--muted)", fontWeight: 700 }}>mi</span>
          </div>
        </StatCard>

        <StatCard
          icon={<FlameIcon />}
          label="Week Streak"
          foot={
            streakWeeks === 0
              ? "log a run to start a streak"
              : streakWeeks === 1
              ? "keep it going next week!"
              : "consecutive weeks running"
          }
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 46, lineHeight: 0.9 }}>
            {streakWeeks > 0 && "🔥"}{streakWeeks}
            <span style={{ fontSize: 22, color: "var(--muted)", fontWeight: 700 }}> wk{streakWeeks !== 1 ? "s" : ""}</span>
          </div>
        </StatCard>

        <StatCard
          icon={<CupIcon />}
          label="Earned Rewards"
          foot={pending ? <span style={{ color: "var(--primary)" }}>{pending} tier{pending > 1 ? "s" : ""} unlocked</span> : "Keep running!"}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 46, lineHeight: 0.9 }}>
            {earnedTiers.length}
          </div>
        </StatCard>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: "24px 26px", marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ color: "var(--green)", display: "grid" }}><RibbonIcon /></span>
          <h3 style={{ fontSize: 19, fontWeight: 700 }}>Next Reward</h3>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 15, marginBottom: 20 }}>
          {nextTier
            ? <>{toNext.toFixed(1)} miles left until you unlock: <strong style={{ color: "var(--ink)" }}>{nextTier.name}</strong></>
            : "You've unlocked every reward tier — incredible."}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 9 }}>
          <span>Current: {totalMiles.toFixed(1)} mi</span>
          <span>Goal: {goal} mi</span>
        </div>
        <div style={{ height: 13, borderRadius: 99, background: "#EDE6DB", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: pct + "%", borderRadius: 99,
            background: "linear-gradient(90deg,#D2691E,#B95513)",
            transition: "width .8s cubic-bezier(.2,.7,.3,1)"
          }} />
        </div>
      </div>

      {/* Recent runs */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 21, fontWeight: 800 }}>Recent Runs</h3>
          <Link href="/runs">
            <button className="btn btn-ghost" style={{ padding: "6px 4px", fontSize: 14.5 }}>
              View all →
            </button>
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
            No runs yet.{" "}
            <button style={{ color: "var(--primary)", fontWeight: 600 }} onClick={() => setShowLog(true)}>
              Log your first run
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentRuns.map((run) => (
              <div key={run.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                <DateTile iso={run.date} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>
                    {run.distanceMiles.toFixed(2)}
                  </span>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>mi</span>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span className={`badge ${run.source === "strava" ? "badge-strava" : "badge-manual"}`}>
                    {run.source === "strava" ? "Strava" : "Manual"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, children, accent, foot }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
  accent?: boolean; foot?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "20px 22px", borderRadius: "var(--radius)",
      background: accent ? "linear-gradient(150deg,#D2691E 0%,#B95513 100%)" : "var(--card)",
      border: accent ? "none" : "1px solid var(--border)",
      boxShadow: accent ? "0 14px 30px -14px rgba(200,97,26,.6)" : "var(--shadow)",
      color: accent ? "#fff" : "var(--ink)",
      display: "flex", flexDirection: "column", gap: 12, minHeight: 142,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 600,
        color: accent ? "rgba(255,255,255,.92)" : "var(--muted)" }}>
        <span style={{ color: accent ? "rgba(255,255,255,.95)" : "var(--primary)", display: "grid" }}>{icon}</span>
        {label}
      </div>
      <div style={{ marginTop: "auto" }}>{children}</div>
      {foot && <div style={{ fontSize: 13, fontWeight: 600, color: accent ? "rgba(255,255,255,.85)" : "var(--muted)" }}>{foot}</div>}
    </div>
  );
}

function DateTile({ iso }: { iso: string }) {
  const d = new Date(iso + "T00:00:00");
  const mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
  const day = d.getDate();
  return (
    <div style={{ textAlign: "center", minWidth: 44, padding: "6px 10px", borderRadius: 10,
      border: "1px solid var(--border-2)", background: "var(--card-soft)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", letterSpacing: ".06em" }}>{mon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{day}</div>
    </div>
  );
}

function ActivityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function FlameIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
}
function CupIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>;
}
function RibbonIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;
}
function ShoeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 17H3a1 1 0 0 1-1-1v-2a4 4 0 0 1 4-4h1l2-5h1a3 3 0 0 1 3 3v1h1a4 4 0 0 1 4 4v2a1 1 0 0 1-1 1z"/></svg>;
}
