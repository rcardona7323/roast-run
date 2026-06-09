import { useState } from "react";
import { trpc } from "../lib/trpc";
import LogRunModal from "../components/log-run-modal";

export default function RunsPage() {
  const [showLog, setShowLog] = useState(false);
  const [filter, setFilter] = useState<"all" | "manual" | "strava">("all");
  const utils = trpc.useUtils();

  const { data: runs, isLoading } = trpc.runs.list.useQuery({ limit: 100 });
  const deleteRun = trpc.runs.delete.useMutation({
    onSuccess: () => {
      utils.runs.list.invalidate();
      utils.dashboard.summary.invalidate();
    },
  });

  const filtered = (runs ?? []).filter((r) =>
    filter === "all" ? true : r.source === filter
  );

  const totalMiles = (runs ?? []).reduce((s, r) => s + r.distanceMiles, 0);

  return (
    <div className="screen">
      {showLog && (
        <LogRunModal
          onClose={() => setShowLog(false)}
          onSaved={() => { setShowLog(false); utils.runs.list.invalidate(); utils.dashboard.summary.invalidate(); }}
        />
      )}

      <div className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><HistoryIcon /></span>
            Run History
          </h1>
          <p className="page-sub">
            {runs
              ? `All your logged miles in one place — ${totalMiles.toFixed(1)} mi across ${runs.length} run${runs.length !== 1 ? "s" : ""}.`
              : "All your logged miles in one place."}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLog(true)}>
          <PlusIcon /> Log a New Run
        </button>
      </div>

      {/* Filter tabs */}
      <div className="segmented" style={{ marginBottom: 24 }}>
        {(["all", "manual", "strava"] as const).map((f) => (
          <button
            key={f}
            className={`seg${filter === f ? " on" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "manual" ? "Manual" : "Strava"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ color: "var(--muted)", padding: 24 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          No runs yet.{" "}
          <button style={{ color: "var(--primary)", fontWeight: 600 }} onClick={() => setShowLog(true)}>
            Log your first run
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((run) => (
            <div
              key={run.id}
              className="card"
              style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 18 }}
            >
              <DateTile iso={run.date} />
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--primary)" }}>
                    {run.distanceMiles.toFixed(2)}
                  </span>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>miles</span>
                </div>
                {run.notes && (
                  <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 3 }}>{run.notes}</p>
                )}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                {run.isDependent && run.memberName && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                    background: "var(--primary-tint)", color: "var(--primary)" }}>
                    {run.memberName}
                  </span>
                )}
                <span className={`badge ${run.source === "strava" ? "badge-strava" : "badge-manual"}`}>
                  {run.source === "strava" ? "Strava" : "Manual"}
                </span>
                <button
                  className="icon-btn"
                  onClick={() => { if (confirm("Delete this run?")) deleteRun.mutate({ id: run.id }); }}
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DateTile({ iso }: { iso: string }) {
  const d = new Date(iso + "T00:00:00");
  const mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const yr = d.getFullYear();
  return (
    <div style={{ textAlign: "center", minWidth: 52, padding: "8px 12px", borderRadius: 10,
      border: "1px solid var(--border-2)", background: "var(--card-soft)", flexShrink: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", letterSpacing: ".06em" }}>{mon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{day}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{yr}</div>
    </div>
  );
}

function HistoryIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><polyline points="12 7 12 12 15 15"/></svg>;
}
function PlusIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function TrashIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
}
