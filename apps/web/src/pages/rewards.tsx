import { useState } from "react";
import { trpc } from "../lib/trpc";

const REWARD_ICONS: Record<string, string> = {
  coffee: "☕",
  smoothie: "🥤",
  apparel: "👕",
  custom: "🎁",
};

export default function RewardsPage() {
  const { data: tiers, isLoading } = trpc.rewards.tiers.useQuery();
  const { data: member } = trpc.members.me.useQuery();
  const { data: myRedemptions } = trpc.rewards.myRedemptions.useQuery();
  const utils = trpc.useUtils();

  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<number | null>(null);

  const redeem = trpc.rewards.redeem.useMutation({
    onSuccess: (_, vars) => {
      utils.rewards.myRedemptions.invalidate();
      utils.members.me.invalidate();
      setRedeeming(null);
      setJustRedeemed(vars.rewardTierId);
      setTimeout(() => setJustRedeemed(null), 3000);
    },
    onError: () => setRedeeming(null),
  });

  const totalMiles = member?.totalMiles ?? 0;

  // figure out next locked tier for progress hero
  const sortedTiers = [...(tiers ?? [])].sort((a, b) => a.milesRequired - b.milesRequired);
  const unlockedTiers = sortedTiers.filter((t) => totalMiles >= t.milesRequired);
  const nextTier = sortedTiers.find((t) => totalMiles < t.milesRequired);

  const progressPct = nextTier
    ? Math.min(100, (totalMiles / nextTier.milesRequired) * 100)
    : 100;

  function handleRedeem(tierId: number) {
    setRedeeming(tierId);
    redeem.mutate({ rewardTierId: tierId });
  }

  const tierNameById = (id: number) => tiers?.find((t) => t.id === id)?.name ?? `Reward #${id}`;
  const tierTypeById = (id: number) => tiers?.find((t) => t.id === id)?.rewardType ?? "custom";

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon"><GiftIcon /></span>
            Rewards
          </h1>
          <p className="page-sub">Run miles, earn perks. Every step brings you closer to a free coffee.</p>
        </div>
      </div>

      {/* ── Progress Hero ── */}
      <div className="card" style={{
        padding: "26px 28px", marginBottom: 28,
        background: "linear-gradient(135deg, #C8611A 0%, #9E4712 100%)",
        border: "none", color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", opacity: .75, marginBottom: 6 }}>
              YOUR PROGRESS
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 48, fontWeight: 900, fontFamily: "var(--font-display)", lineHeight: 1 }}>
                {totalMiles.toFixed(1)}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, opacity: .8 }}>miles</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: .75, marginBottom: 2 }}>Tiers Unlocked</div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--font-display)" }}>
              {unlockedTiers.length}<span style={{ fontSize: 18, opacity: .7 }}>/{sortedTiers.length}</span>
            </div>
          </div>
        </div>

        {nextTier ? (
          <>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.25)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                height: "100%", width: progressPct + "%", borderRadius: 99,
                background: "rgba(255,255,255,.9)",
                transition: "width .8s cubic-bezier(.2,.7,.3,1)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, opacity: .85 }}>
              <span>{totalMiles.toFixed(1)} mi</span>
              <span>
                {REWARD_ICONS[nextTier.rewardType]} Next: {nextTier.name} at {nextTier.milesRequired} mi
                · {(nextTier.milesRequired - totalMiles).toFixed(1)} mi to go
              </span>
            </div>
          </>
        ) : sortedTiers.length > 0 ? (
          <div style={{ fontSize: 15, fontWeight: 700, opacity: .9 }}>
            🎉 You've unlocked every reward tier — incredible!
          </div>
        ) : null}
      </div>

      {/* ── Tier Cards ── */}
      {isLoading ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading rewards…</p>
      ) : sortedTiers.length === 0 ? (
        <div className="card" style={{ padding: "36px 24px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ fontSize: 28, marginBottom: 10 }}>☕</p>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No rewards set up yet</p>
          <p style={{ fontSize: 14 }}>Your café admin hasn't created reward tiers yet. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
          {sortedTiers.map((tier) => {
            const earned = totalMiles >= tier.milesRequired;
            const pct = Math.min(100, (totalMiles / tier.milesRequired) * 100);
            const redemptionsForTier = (myRedemptions ?? []).filter((r) => r.rewardTierId === tier.id);
            const pendingRedemption = redemptionsForTier.find((r) => r.status === "pending");
            const approvedRedemption = redemptionsForTier.find((r) => r.status === "approved");
            const isJustRedeemed = justRedeemed === tier.id;

            return (
              <div
                key={tier.id}
                className="card"
                style={{
                  padding: "22px 24px",
                  borderColor: earned ? "var(--primary-tint)" : "var(--border)",
                  background: isJustRedeemed ? "var(--primary-tint-2)" : undefined,
                  transition: "background .4s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                  {/* Icon tile */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 28, flexShrink: 0,
                    background: earned ? "var(--primary-tint)" : "var(--card-soft)",
                    border: `2px solid ${earned ? "var(--primary-tint)" : "var(--border-2)"}`,
                  }}>
                    {earned ? REWARD_ICONS[tier.rewardType] : "🔒"}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 17, fontWeight: 800 }}>{tier.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                        background: "var(--card-soft)", color: "var(--ink-2)", border: "1px solid var(--border-2)" }}>
                        {REWARD_ICONS[tier.rewardType]} {tier.milesRequired} mi
                      </span>
                      {earned && !pendingRedemption && !approvedRedemption && (
                        <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                          background: "var(--primary-tint)", color: "var(--primary)" }}>
                          UNLOCKED ✓
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
                      {tier.description}
                    </p>

                    {/* Progress bar */}
                    <div style={{ height: 6, borderRadius: 99, background: "var(--border-2)", overflow: "hidden", maxWidth: 320, marginBottom: 6 }}>
                      <div style={{
                        height: "100%", width: pct + "%", borderRadius: 99,
                        background: earned
                          ? "linear-gradient(90deg, #C8611A, #9E4712)"
                          : "var(--border)",
                        transition: "width .8s cubic-bezier(.2,.7,.3,1)",
                      }} />
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
                      {earned
                        ? `${tier.milesRequired} mi — milestone reached!`
                        : `${totalMiles.toFixed(1)} / ${tier.milesRequired} mi · ${(tier.milesRequired - totalMiles).toFixed(1)} mi to go`}
                    </p>
                  </div>

                  {/* Action */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {approvedRedemption ? (
                      <span className="badge badge-approved" style={{ fontSize: 13, padding: "6px 14px" }}>✓ Approved</span>
                    ) : pendingRedemption ? (
                      <span className="badge badge-pending" style={{ fontSize: 13, padding: "6px 14px" }}>⏳ Pending</span>
                    ) : earned ? (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 14, padding: "11px 22px" }}
                        disabled={redeeming === tier.id}
                        onClick={() => handleRedeem(tier.id)}
                      >
                        {redeeming === tier.id ? "Redeeming…" : "Redeem"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                        {(tier.milesRequired - totalMiles).toFixed(1)} mi left
                      </span>
                    )}
                  </div>
                </div>

                {/* Celebration flash */}
                {isJustRedeemed && (
                  <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10,
                    background: "var(--primary-tint)", color: "var(--primary-deep)", fontWeight: 700, fontSize: 14 }}>
                    🎉 Redemption submitted! Your café admin will approve it shortly.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Redemption History ── */}
      {myRedemptions && myRedemptions.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>My Redemption History</h2>
          <div className="card" style={{ overflow: "hidden" }}>
            {[...myRedemptions].reverse().map((r, i, arr) => (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>
                  {REWARD_ICONS[tierTypeById(r.rewardTierId)]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{tierNameById(r.rewardTierId)}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {new Date(r.createdAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <span className={`badge ${
                  r.status === "approved" ? "badge-approved" :
                  r.status === "rejected" ? "badge-manual" :
                  "badge-pending"
                }`} style={{ fontSize: 13, padding: "5px 12px" }}>
                  {r.status === "approved" ? "✓ Approved" : r.status === "rejected" ? "Rejected" : "⏳ Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GiftIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
}
