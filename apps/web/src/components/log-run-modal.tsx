import { useState } from "react";
import { trpc } from "../lib/trpc";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function LogRunModal({ onClose, onSaved }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [miles, setMiles] = useState("");
  const [notes, setNotes] = useState("");
  const [forMemberId, setForMemberId] = useState<number | undefined>(undefined);
  const [error, setError] = useState("");

  const { data: me } = trpc.members.me.useQuery();
  const { data: dependents } = trpc.members.dependents.useQuery();

  const createRun = trpc.runs.create.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });

  const hasDependents = dependents && dependents.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    createRun.mutate({
      distanceMiles: parseFloat(miles),
      date,
      notes: notes || undefined,
      forMemberId,
    });
  }

  const selectedName = forMemberId
    ? dependents?.find((d) => d.id === forMemberId)?.displayName
    : (me?.displayName ?? "You");

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><XIcon /></button>
        <div className="card" style={{ borderRadius: "var(--radius) var(--radius) 0 0", padding: "28px 26px 24px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Log a Run</h2>

          {/* Who is this run for? */}
          {hasDependents && (
            <div style={{ marginBottom: 22 }}>
              <label className="flabel">Who is this run for?</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setForMemberId(undefined)}
                  style={{
                    padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: forMemberId === undefined ? "var(--primary)" : "var(--card-soft)",
                    color: forMemberId === undefined ? "#fff" : "var(--ink-2)",
                    border: `1px solid ${forMemberId === undefined ? "transparent" : "var(--border-2)"}`,
                    transition: "all .15s",
                  }}
                >
                  {me?.displayName ?? "Me"}
                </button>
                {dependents.map((dep) => (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => setForMemberId(dep.id)}
                    style={{
                      padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      background: forMemberId === dep.id ? "var(--primary)" : "var(--card-soft)",
                      color: forMemberId === dep.id ? "#fff" : "var(--ink-2)",
                      border: `1px solid ${forMemberId === dep.id ? "transparent" : "var(--border-2)"}`,
                      transition: "all .15s",
                    }}
                  >
                    {dep.displayName}
                  </button>
                ))}
              </div>
              {forMemberId && (
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
                  Logging for <strong style={{ color: "var(--ink)" }}>{selectedName}</strong> — miles count toward their total.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-row-2">
              <div>
                <label className="flabel">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="field" />
              </div>
              <div>
                <label className="flabel">Distance (miles)</label>
                <input
                  type="number" step="0.01" min="0.01" placeholder="3.10"
                  value={miles} onChange={(e) => setMiles(e.target.value)} required className="field"
                />
              </div>
            </div>
            <div>
              <label className="flabel">Notes <span style={{ color: "var(--muted)", fontWeight: 500 }}>(optional)</span></label>
              <input type="text" placeholder="Easy morning run…" value={notes} onChange={(e) => setNotes(e.target.value)} className="field" />
            </div>
            {error && <p style={{ fontSize: 14, color: "#B0492A" }}>{error}</p>}
          </form>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" style={{ fontSize: 14.5 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={createRun.isPending} onClick={handleSubmit as unknown as React.MouseEventHandler}>
            {createRun.isPending ? "Saving…" : "Save Run"}
          </button>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
