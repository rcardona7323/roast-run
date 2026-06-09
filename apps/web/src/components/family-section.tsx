import { useState } from "react";
import { trpc } from "../lib/trpc";

export default function FamilySection() {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const utils = trpc.useUtils();

  const { data: dependents, isLoading } = trpc.members.dependents.useQuery();
  const addDependent = trpc.members.addDependent.useMutation({
    onSuccess: () => {
      utils.members.dependents.invalidate();
      setNewName("");
      setAdding(false);
    },
  });
  const removeDependent = trpc.members.removeDependent.useMutation({
    onSuccess: () => utils.members.dependents.invalidate(),
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    addDependent.mutate({ displayName: newName.trim() });
  }

  return (
    <div style={{ maxWidth: 540, marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Family Members</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3 }}>
            Add kids or family who run with you. You log their miles; they earn rewards under your account.
          </p>
        </div>
        <button
          className="btn btn-outline"
          style={{ fontSize: 13.5, padding: "8px 16px", flexShrink: 0 }}
          onClick={() => setAdding(!adding)}
        >
          + Add
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="e.g. Emma"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="field"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ fontSize: 14, padding: "10px 18px" }} disabled={addDependent.isPending}>
            {addDependent.isPending ? "Adding…" : "Add"}
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => { setAdding(false); setNewName(""); }}>
            Cancel
          </button>
        </form>
      )}

      {isLoading ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
      ) : !dependents || dependents.length === 0 ? (
        <div className="card" style={{ padding: "20px 22px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          No family members added yet.
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {dependents.map((dep, i) => {
            const initials = dep.displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={dep.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                  borderBottom: i < dependents.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="avatar-circle" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{dep.displayName}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{dep.totalMiles.toFixed(1)} miles</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${dep.displayName}? Their run history will be deleted.`)) {
                      removeDependent.mutate({ memberId: dep.id });
                    }
                  }}
                  style={{ color: "var(--muted-2)", fontSize: 13, fontWeight: 600, padding: "6px 10px", borderRadius: 8, transition: "color .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#B0492A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-2)")}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
