import { useState } from "react";
import { trpc } from "../lib/trpc";
import Avatar from "../components/avatar";

type Period = "weekly" | "monthly" | "allTime";

const PERIOD_LABELS: Record<Period, string> = {
  weekly: "This Week",
  monthly: "This Month",
  allTime: "All Time",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const { data, isLoading } = trpc.leaderboard.get.useQuery();

  const rows = data?.[period] ?? [];

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><TrophyIcon /></span>
            Leaderboard
          </h1>
          <p className="page-sub">See how you stack up against your fellow runners.</p>
        </div>
      </div>

      {/* Period tabs */}
      <div className="segmented" style={{ marginBottom: 28 }}>
        {(["weekly", "monthly", "allTime"] as Period[]).map((p) => (
          <button
            key={p}
            className={`seg${period === p ? " on" : ""}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ color: "var(--muted)", padding: 24 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No runs logged yet. Be the first on the board!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((entry) => {
            const isPodium = entry.rank <= 3;
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div
                key={entry.memberId}
                className="card"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  borderColor: entry.rank === 1 ? "var(--primary-tint)" : "var(--border)",
                  background: entry.rank === 1 ? "linear-gradient(135deg,#FBF8F3,#FAF1E7)" : "var(--card)",
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 36, textAlign: "center", flexShrink: 0,
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: isPodium ? 24 : 17,
                  color: isPodium ? "var(--primary)" : "var(--muted-2)",
                }}>
                  {isPodium ? medals[entry.rank - 1] : `#${entry.rank}`}
                </div>

                {/* Avatar */}
                <Avatar name={entry.displayName} image={entry.image} size={40} fontSize={15} />

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>{entry.displayName}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                    {Number(entry.runs)} run{Number(entry.runs) !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Miles */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{
                    fontFamily: "var(--font-display)", fontWeight: 800,
                    fontSize: entry.rank === 1 ? 28 : 22,
                    color: entry.rank === 1 ? "var(--primary)" : "var(--ink)",
                  }}>
                    {Number(entry.miles).toFixed(1)}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600, marginLeft: 4 }}>mi</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  );
}
