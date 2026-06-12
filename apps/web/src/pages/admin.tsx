import { useState } from "react";
import { trpc } from "../lib/trpc";

function InviteBanner() {
  const { data: org } = trpc.organizations.get.useQuery();
  const [copied, setCopied] = useState(false);

  if (!org) return null;

  const inviteUrl = `${window.location.origin}/join/${org.slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      marginBottom: 28, padding: "18px 22px", borderRadius: "var(--radius)",
      background: "var(--primary-tint-2)", border: "1px solid var(--primary-tint)",
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ fontSize: 22, flexShrink: 0 }}>🔗</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary-deep)", marginBottom: 4 }}>
          Member Invite Link
        </div>
        <div style={{
          fontSize: 13, color: "var(--ink-2)", fontFamily: "monospace",
          background: "var(--card)", border: "1px solid var(--border-2)",
          borderRadius: 8, padding: "7px 12px", overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {inviteUrl}
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="btn btn-primary"
        style={{ fontSize: 13.5, padding: "10px 18px", flexShrink: 0, minWidth: 100 }}
      >
        {copied ? "✓ Copied!" : "Copy Link"}
      </button>
    </div>
  );
}

type Tab = "tiers" | "redemptions" | "members" | "email";

const REWARD_TYPES = [
  { value: "coffee", label: "☕ Coffee" },
  { value: "smoothie", label: "🥤 Smoothie" },
  { value: "apparel", label: "👕 Apparel" },
  { value: "custom", label: "🎁 Custom" },
] as const;

type RewardType = "coffee" | "smoothie" | "apparel" | "custom";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("tiers");

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><ShieldIcon /></span>
            Club Admin
          </h1>
          <p className="page-sub">Manage reward tiers, redemptions, and members for your club.</p>
        </div>
      </div>

      <InviteBanner />

      <div className="segmented" style={{ marginBottom: 28 }}>
        <button className={`seg${tab === "tiers" ? " on" : ""}`} onClick={() => setTab("tiers")}>
          Reward Tiers
        </button>
        <button className={`seg${tab === "redemptions" ? " on" : ""}`} onClick={() => setTab("redemptions")}>
          Redemptions
        </button>
        <button className={`seg${tab === "members" ? " on" : ""}`} onClick={() => setTab("members")}>
          Members
        </button>
        <button className={`seg${tab === "email" ? " on" : ""}`} onClick={() => setTab("email")}>
          ✉️ Email
        </button>
      </div>

      {tab === "tiers" && <RewardTiersSection />}
      {tab === "redemptions" && <RedemptionsSection />}
      {tab === "members" && <MembersSection />}
      {tab === "email" && <EmailSection />}
    </div>
  );
}

/* ─── Reward Tiers ───────────────────────────────────────────────────── */

function RewardTiersSection() {
  const utils = trpc.useUtils();
  const { data: tiers, isLoading } = trpc.rewards.adminTiers.useQuery();

  const createTier = trpc.rewards.createTier.useMutation({
    onSuccess: () => { utils.rewards.adminTiers.invalidate(); setShowForm(false); resetForm(); },
  });
  const updateTier = trpc.rewards.updateTier.useMutation({
    onSuccess: () => { utils.rewards.adminTiers.invalidate(); setEditing(null); },
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  // form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [miles, setMiles] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("coffee");

  function resetForm() { setName(""); setDescription(""); setMiles(""); setRewardType("coffee"); }

  function openEdit(tier: NonNullable<typeof tiers>[number]) {
    setEditing(tier.id);
    setName(tier.name);
    setDescription(tier.description);
    setMiles(String(tier.milesRequired));
    setRewardType(tier.rewardType as RewardType);
    setShowForm(false);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createTier.mutate({ name, description, milesRequired: parseFloat(miles), rewardType, active: true });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    updateTier.mutate({ id: editing, name, description, milesRequired: parseFloat(miles), rewardType });
  }

  function handleToggleActive(tier: NonNullable<typeof tiers>[number]) {
    updateTier.mutate({ id: tier.id, active: !tier.active });
  }

  const typeLabel = (t: string) => REWARD_TYPES.find((r) => r.value === t)?.label ?? t;

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Reward Tiers</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3 }}>
            Define milestones members can reach to earn free drinks or merch.
          </p>
        </div>
        {!showForm && !editing && (
          <button className="btn btn-primary" style={{ fontSize: 14, padding: "10px 18px" }} onClick={() => setShowForm(true)}>
            + New Tier
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ padding: "22px 24px", marginBottom: 20, border: "2px solid var(--primary-tint)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 18 }}>New Reward Tier</h3>
          <form onSubmit={handleCreate}>
            <TierForm
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              miles={miles} setMiles={setMiles}
              rewardType={rewardType} setRewardType={setRewardType}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={createTier.isPending} style={{ fontSize: 14 }}>
                {createTier.isPending ? "Creating…" : "Create Tier"}
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </button>
            </div>
            {createTier.error && (
              <p style={{ fontSize: 13, color: "#B0492A", marginTop: 10 }}>{createTier.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Tiers list */}
      {isLoading ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
      ) : !tiers || tiers.length === 0 ? (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🏆</p>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No reward tiers yet</p>
          <p style={{ fontSize: 13.5 }}>Create your first tier to motivate members to keep running.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tiers.map((tier) => (
            <div key={tier.id}>
              {editing === tier.id ? (
                <div className="card" style={{ padding: "22px 24px", border: "2px solid var(--primary-tint)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 18 }}>Edit Tier</h3>
                  <form onSubmit={handleUpdate}>
                    <TierForm
                      name={name} setName={setName}
                      description={description} setDescription={setDescription}
                      miles={miles} setMiles={setMiles}
                      rewardType={rewardType} setRewardType={setRewardType}
                    />
                    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                      <button type="submit" className="btn btn-primary" disabled={updateTier.isPending} style={{ fontSize: 14 }}>
                        {updateTier.isPending ? "Saving…" : "Save Changes"}
                      </button>
                      <button type="button" className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => { setEditing(null); resetForm(); }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="card admin-item-row" style={{
                  padding: "18px 22px",
                  opacity: tier.active ? 1 : 0.55,
                }}>
                  {/* Miles badge */}
                  <div style={{
                    minWidth: 72, height: 72, borderRadius: 16, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: tier.active ? "var(--primary)" : "var(--border-2)",
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", color: "#fff", lineHeight: 1 }}>
                      {tier.milesRequired % 1 === 0 ? tier.milesRequired : tier.milesRequired.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.8)", fontWeight: 600, letterSpacing: ".04em" }}>mi</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{tier.name}</span>
                      <span style={{ fontSize: 13, padding: "3px 10px", borderRadius: 999,
                        background: "var(--primary-tint)", color: "var(--primary)", fontWeight: 600 }}>
                        {typeLabel(tier.rewardType)}
                      </span>
                      {!tier.active && (
                        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999,
                          background: "var(--border-2)", color: "var(--muted)", fontWeight: 600 }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{tier.description}</p>
                  </div>

                  <div className="admin-item-actions">
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 13, padding: "7px 14px" }}
                      onClick={() => openEdit(tier)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 13, padding: "7px 14px", color: tier.active ? "var(--muted)" : "var(--primary)" }}
                      onClick={() => handleToggleActive(tier)}
                      disabled={updateTier.isPending}
                    >
                      {tier.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TierForm({
  name, setName, description, setDescription, miles, setMiles, rewardType, setRewardType,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  miles: string; setMiles: (v: string) => void;
  rewardType: RewardType; setRewardType: (v: RewardType) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div>
          <label className="flabel">Tier Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. First Free Coffee" required className="field" />
        </div>
        <div>
          <label className="flabel">Miles Required</label>
          <input type="number" step="0.5" min="0.5" value={miles} onChange={(e) => setMiles(e.target.value)}
            placeholder="25" required className="field" />
        </div>
      </div>
      <div>
        <label className="flabel">Reward Type</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {REWARD_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setRewardType(rt.value)}
              style={{
                padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer",
                background: rewardType === rt.value ? "var(--primary)" : "var(--card-soft)",
                color: rewardType === rt.value ? "#fff" : "var(--ink-2)",
                border: `1px solid ${rewardType === rt.value ? "transparent" : "var(--border-2)"}`,
                transition: "all .15s",
              }}
            >
              {rt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="flabel">Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Enjoy a complimentary drip coffee or espresso drink" required className="field" />
      </div>
    </div>
  );
}

/* ─── Redemptions ────────────────────────────────────────────────────── */

function RedemptionsSection() {
  const utils = trpc.useUtils();
  const { data: allRedemptions, isLoading } = trpc.rewards.allRedemptions.useQuery();
  const { data: tiers } = trpc.rewards.adminTiers.useQuery();
  const { data: members } = trpc.members.list.useQuery();

  const updateStatus = trpc.rewards.updateRedemptionStatus.useMutation({
    onSuccess: () => utils.rewards.allRedemptions.invalidate(),
  });

  const tierName = (id: number) => tiers?.find((t) => t.id === id)?.name ?? `Tier #${id}`;
  const memberName = (uid: string) => members?.find((m) => m.userId === uid)?.displayName ?? uid.slice(0, 8) + "…";

  const pending = (allRedemptions ?? []).filter((r) => r.status === "pending");
  const resolved = (allRedemptions ?? []).filter((r) => r.status !== "pending");

  if (isLoading) return <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>;

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Reward Redemptions</h2>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
        Approve or reject member redemption requests.
      </p>

      {pending.length === 0 && resolved.length === 0 ? (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🎉</p>
          <p style={{ fontWeight: 600 }}>No redemptions yet</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Pending ({pending.length})
              </h3>
              <div className="card" style={{ overflow: "hidden" }}>
                {pending.map((r, i) => (
                  <div key={r.id} className="admin-item-row" style={{
                    padding: "16px 20px",
                    borderBottom: i < pending.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{memberName(r.userId)}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>
                        {tierName(r.rewardTierId)} · {new Date(r.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className="admin-item-actions">
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 13, padding: "8px 16px" }}
                        onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}
                        disabled={updateStatus.isPending}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 13, padding: "8px 16px", color: "#B0492A" }}
                        onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}
                        disabled={updateStatus.isPending}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>
                History ({resolved.length})
              </h3>
              <div className="card" style={{ overflow: "hidden" }}>
                {resolved.map((r, i) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                    borderBottom: i < resolved.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{memberName(r.userId)}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>
                        {tierName(r.rewardTierId)} · {new Date(r.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                      background: r.status === "approved" ? "#D1FAE5" : "#FEE2E2",
                      color: r.status === "approved" ? "#065F46" : "#991B1B",
                    }}>
                      {r.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Members ────────────────────────────────────────────────────────── */

function MembersSection() {
  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.members.list.useQuery();
  const setAdmin = trpc.members.setAdmin.useMutation({
    onSuccess: () => utils.members.list.invalidate(),
  });
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  if (isLoading) return <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>;

  const humans = [...(members ?? [])].sort((a, b) =>
    (a.displayName ?? "").localeCompare(b.displayName ?? "")
  );

  return (
    <div>
      {selectedMemberId && (
        <MemberDetailModal
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
          onToggleAdmin={(id, isAdmin) => setAdmin.mutate({ memberId: id, isAdmin })}
        />
      )}

      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Members ({humans.length})</h2>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
        Click any member to view their full profile, contact info, and reward progress.
      </p>

      {humans.length === 0 ? (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)" }}>
          No members yet.
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {humans.map((m, i) => {
            const initials = (m.displayName ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                  borderBottom: i < humans.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer", transition: "background .12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="avatar-circle" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{m.displayName}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {m.email ?? "—"} · {m.totalMiles.toFixed(1)} mi
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {m.parentMemberId !== null ? (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                      background: "var(--gold-tint)", color: "#9A7A07" }}>
                      Dependent
                    </span>
                  ) : m.userId === null ? (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                      background: "#F1ECE4", color: "#7A7268" }}>
                      No account
                    </span>
                  ) : null}
                  {m.isAdmin && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                      background: "var(--primary-tint)", color: "var(--primary)" }}>
                      Admin
                    </span>
                  )}
                  <ChevronIcon />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Member Detail Modal ────────────────────────────────────────────── */

const REWARD_ICONS: Record<string, string> = {
  coffee: "☕", smoothie: "🥤", apparel: "👕", custom: "🎁",
};

function MemberDetailModal({ memberId, onClose, onToggleAdmin }: {
  memberId: number;
  onClose: () => void;
  onToggleAdmin: (id: number, isAdmin: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.members.detail.useQuery({ memberId });

  const [showLogRun, setShowLogRun] = useState(false);
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [runMiles, setRunMiles] = useState("");
  const [runNotes, setRunNotes] = useState("");

  const refresh = () => {
    utils.members.detail.invalidate({ memberId });
    utils.members.list.invalidate();
  };
  const adminCreateRun = trpc.runs.adminCreate.useMutation({
    onSuccess: () => { refresh(); setShowLogRun(false); setRunMiles(""); setRunNotes(""); },
  });
  const adminDeleteRun = trpc.runs.adminDelete.useMutation({ onSuccess: refresh });

  if (isLoading || !data) {
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, background: "var(--bg)" }}>
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--muted)" }}>Loading member…</p>
          </div>
        </div>
      </div>
    );
  }

  const { member, dependents, recentRuns, stats, redemptions, tiers } = data;
  const initials = (member.displayName ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const totalMiles = member.totalMiles ?? 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto", background: "var(--bg)" }}
      >
        <button className="modal-x" onClick={onClose}><XIcon /></button>

        {/* Header */}
        <div className="card" style={{ borderRadius: "var(--radius) var(--radius) 0 0", padding: "28px 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
            <div className="avatar-circle" style={{ width: 60, height: 60, fontSize: 20, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)" }}>{member.displayName}</div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 2 }}>{member.email ?? "No email"}</div>
            </div>
            {member.isAdmin && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                background: "var(--primary-tint)", color: "var(--primary)", flexShrink: 0 }}>
                Admin
              </span>
            )}
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            {[
              { label: "Total Miles", value: totalMiles.toFixed(1) + " mi" },
              { label: "Total Runs", value: String(stats?.totalRuns ?? 0) },
              { label: "Redemptions", value: String(redemptions.length) },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--card-soft)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", marginBottom: 4 }}>
                  {s.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", color: "var(--primary)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Contact info */}
          <section>
            <SectionLabel>Contact Information</SectionLabel>
            <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <InfoRow label="Email" value={member.email ?? "—"} />
              <InfoRow label="Phone" value={member.phone ?? "—"} />
            </div>
          </section>

          {/* Emergency contact */}
          <section>
            <SectionLabel>🚨 Emergency Contact</SectionLabel>
            <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {member.emergencyContact || member.emergencyPhone ? (
                <>
                  <InfoRow label="Name" value={member.emergencyContact ?? "—"} />
                  <InfoRow label="Phone" value={member.emergencyPhone ?? "—"} />
                </>
              ) : (
                <p style={{ fontSize: 13.5, color: "var(--muted)", fontStyle: "italic" }}>No emergency contact on file.</p>
              )}
            </div>
          </section>

          {/* Reward tier progress */}
          {tiers.length > 0 && (
            <section>
              <SectionLabel>Reward Progress</SectionLabel>
              <div className="card" style={{ overflow: "hidden" }}>
                {tiers.map((tier, i) => {
                  const earned = totalMiles >= tier.milesRequired;
                  const pct = Math.min(100, (totalMiles / tier.milesRequired) * 100);
                  const redemption = redemptions.find((r) => r.tier.id === tier.id);
                  return (
                    <div key={tier.id} style={{
                      padding: "14px 20px", display: "flex", alignItems: "center", gap: 14,
                      borderBottom: i < tiers.length - 1 ? "1px solid var(--border)" : "none",
                      opacity: earned ? 1 : 0.6,
                    }}>
                      <div style={{ fontSize: 20, flexShrink: 0 }}>{earned ? REWARD_ICONS[tier.rewardType] : "🔒"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{tier.name}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{tier.milesRequired} mi</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: "var(--border-2)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: pct + "%", borderRadius: 99,
                            background: earned ? "linear-gradient(90deg,#C8611A,#9E4712)" : "var(--border)",
                            transition: "width .6s ease",
                          }} />
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {redemption ? (
                          <span className={`badge ${
                            redemption.redemption.status === "approved" ? "badge-approved" :
                            redemption.redemption.status === "pending" ? "badge-pending" : "badge-manual"
                          }`} style={{ fontSize: 11 }}>
                            {redemption.redemption.status}
                          </span>
                        ) : earned ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>Unlocked</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>
                            {(tier.milesRequired - totalMiles).toFixed(1)} mi left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Family members */}
          {dependents.length > 0 && (
            <section>
              <SectionLabel>Family Members</SectionLabel>
              <div className="card" style={{ overflow: "hidden" }}>
                {dependents.map((dep, i) => {
                  const di = (dep.displayName ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={dep.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                      borderBottom: i < dependents.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{di}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{dep.displayName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{dep.totalMiles.toFixed(1)} mi</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Log a run for this member */}
          <section>
            <SectionLabel>Log a Run for {member.displayName}</SectionLabel>
            {showLogRun ? (
              <div className="card" style={{ padding: "18px 20px", border: "2px solid var(--primary-tint)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="form-row-2">
                    <div>
                      <label className="flabel">Date</label>
                      <input type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} required className="field" />
                    </div>
                    <div>
                      <label className="flabel">Distance (miles)</label>
                      <input type="number" step="0.01" min="0.01" placeholder="3.10"
                        value={runMiles} onChange={(e) => setRunMiles(e.target.value)} required className="field" />
                    </div>
                  </div>
                  <div>
                    <label className="flabel">Notes <span style={{ color: "var(--muted)", fontWeight: 500 }}>(optional)</span></label>
                    <input type="text" placeholder="Added by admin" value={runNotes}
                      onChange={(e) => setRunNotes(e.target.value)} className="field" />
                  </div>
                  {adminCreateRun.error && (
                    <p style={{ fontSize: 13, color: "#B0492A" }}>{adminCreateRun.error.message}</p>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 14 }}
                      disabled={adminCreateRun.isPending || !runMiles}
                      onClick={() => adminCreateRun.mutate({
                        memberId: member.id,
                        distanceMiles: parseFloat(runMiles),
                        date: runDate,
                        notes: runNotes || undefined,
                      })}
                    >
                      {adminCreateRun.isPending ? "Saving…" : "Save Run"}
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => setShowLogRun(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button className="btn btn-outline" style={{ fontSize: 14, width: "100%" }} onClick={() => setShowLogRun(true)}>
                + Log a Run
              </button>
            )}
          </section>

          {/* Recent runs */}
          {recentRuns.length > 0 && (
            <section>
              <SectionLabel>Recent Runs</SectionLabel>
              <div className="card" style={{ overflow: "hidden" }}>
                {recentRuns.map((run, i) => (
                  <div key={run.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "11px 20px",
                    borderBottom: i < recentRuns.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ fontSize: 13, color: "var(--muted)", minWidth: 80 }}>
                      {new Date(run.date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                      {run.distanceMiles.toFixed(2)} mi
                    </div>
                    {run.notes && <div style={{ fontSize: 13, color: "var(--ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.notes}</div>}
                    <span className={`badge ${run.source === "strava" ? "badge-strava" : "badge-manual"}`} style={{ fontSize: 11 }}>
                      {run.source}
                    </span>
                    <button
                      title="Delete run"
                      disabled={adminDeleteRun.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete this ${run.distanceMiles.toFixed(2)} mi run? ${member.displayName}'s total will be reduced.`)) {
                          adminDeleteRun.mutate({ id: run.id });
                        }
                      }}
                      style={{ color: "var(--muted-2)", padding: 4, lineHeight: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#B0492A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-2)")}
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Admin actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 13.5, color: member.isAdmin ? "#B0492A" : "var(--ink-2)" }}
              onClick={() => onToggleAdmin(member.id, !member.isAdmin)}
            >
              {member.isAdmin ? "Remove Admin Access" : "Grant Admin Access"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: ".07em",
      textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

/* ─── Email ──────────────────────────────────────────────────────────── */

function EmailSection() {
  const { data: members } = trpc.members.list.useQuery();
  const sendUpdate = trpc.email.sendWeeklyUpdate.useMutation();
  const sendTest = trpc.email.sendTestEmail.useMutation();

  const [subject, setSubject] = useState("🏃 Coastal Crew Run Club — Weekly Update");
  const [body, setBody] = useState(
    "Hope everyone had a great week of running!\n\nHere's a quick update from the Coastal Crew. Keep logging those miles — every run counts toward your next reward.\n\nSee you on the road ☕"
  );
  const [result, setResult] = useState<{ sent: number; failed: number; results: { email: string; name: string; ok: boolean; error?: string }[] } | null>(null);
  const [testSent, setTestSent] = useState<string | null>(null);

  const eligibleCount = (members ?? []).filter((m) => m.userId && m.email).length;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setTestSent(null);
    try {
      const res = await sendUpdate.mutateAsync({ subject, body });
      setResult(res);
    } catch {
      // error shown via sendUpdate.error
    }
  }

  async function handleTest() {
    setTestSent(null);
    setResult(null);
    try {
      const res = await sendTest.mutateAsync({ subject, body });
      setTestSent(res.email);
    } catch {
      // error shown via sendTest.error
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Send Email Update</h2>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 20 }}>
        Compose a message and send it to all {eligibleCount} member{eligibleCount !== 1 ? "s" : ""} with an email address.
        Each email is personalised with their name and current mile total.
      </p>

      {/* Success result */}
      {result && (
        <div style={{
          marginBottom: 20, padding: "16px 20px", borderRadius: "var(--radius)",
          background: result.failed === 0 ? "#ECEFE9" : "#FFF4E0",
          border: `1px solid ${result.failed === 0 ? "#C5D4BC" : "#F0D898"}`,
        }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4,
            color: result.failed === 0 ? "var(--green)" : "#9A7A07" }}>
            {result.failed === 0
              ? `✓ Sent to ${result.sent} member${result.sent !== 1 ? "s" : ""}`
              : `${result.sent} sent · ${result.failed} failed`}
          </div>
          {result.failed > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--muted)" }}>
              {result.results.filter((r) => !r.ok).map((r) => (
                <li key={r.email}>{r.name} ({r.email}) — {r.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Test sent */}
      {testSent && (
        <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: "var(--radius)",
          background: "#ECEFE9", border: "1px solid #C5D4BC" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--green)" }}>
            ✓ Test email sent to {testSent}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
            Check your inbox — subject line is prefixed with [TEST].
          </div>
        </div>
      )}

      {/* Test error */}
      {sendTest.error && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: "var(--radius)",
          background: "#FDE8E0", border: "1px solid #F5C0A8", fontSize: 14, color: "#B0492A" }}>
          {sendTest.error.message}
        </div>
      )}

      {/* Error */}
      {sendUpdate.error && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: "var(--radius)",
          background: "#FDE8E0", border: "1px solid #F5C0A8", fontSize: 14, color: "#B0492A" }}>
          {sendUpdate.error.message}
        </div>
      )}

      <form onSubmit={handleSend}>
        <div className="card" style={{ padding: "26px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Subject */}
          <div>
            <label className="flabel">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="field"
              placeholder="e.g. Weekly update from Coastal Crew Run Club"
            />
          </div>

          {/* Body */}
          <div>
            <label className="flabel">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="field"
              rows={8}
              placeholder="Write your message here…"
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              Each member will also see a personalised miles badge and a link to their progress.
            </p>
          </div>

          {/* Recipients preview */}
          <div style={{ background: "var(--card-soft)", borderRadius: 10, padding: "12px 16px",
            fontSize: 13.5, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📬</span>
            <span>
              Will send to <strong>{eligibleCount} member{eligibleCount !== 1 ? "s" : ""}</strong> with an email address on file.
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={sendTest.isPending || sendUpdate.isPending}
              className="btn btn-outline"
              style={{ fontSize: 14, padding: "11px 22px" }}
            >
              {sendTest.isPending ? "Sending test…" : "📨 Send Test to Me"}
            </button>
            <button
              type="submit"
              disabled={sendUpdate.isPending || sendTest.isPending || eligibleCount === 0}
              className="btn btn-primary"
              style={{ fontSize: 15, padding: "12px 28px" }}
            >
              {sendUpdate.isPending ? "Sending…" : `Send to All ${eligibleCount} Member${eligibleCount !== 1 ? "s" : ""}`}
            </button>
            {sendUpdate.isPending && (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Sending individually — this may take a moment…
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────── */
function ChevronIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}><polyline points="9 18 15 12 9 6"/></svg>;
}

function XIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}

function ShieldIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
