/* Rewards + redemptions. window.Rewards */
/* global React, Icons, Util */
const { useState: useStateRw } = React;

function RewardCard({ tier, totalMiles, redemption, onRedeem }) {
  const reached = totalMiles >= tier.miles;
  const toGo = tier.miles - totalMiles;
  const claimed = !!redemption;
  let badge;
  if (claimed) badge = <span className="badge badge-redeemed">{Icons.check({width:12,height:12})}Redeemed</span>;
  else if (reached) badge = <span className="badge" style={{ background: 'var(--primary-tint)', color: 'var(--primary-deep)' }}>{Icons.bolt({width:11,height:11})}Unlocked</span>;
  else badge = <span className="badge badge-dark">{Icons.lock({width:11,height:11})}Locked</span>;

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
      opacity: reached ? 1 : .96 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 13px', borderRadius: 999,
          background: 'var(--card-soft)', border: '1px solid var(--border-2)', fontWeight: 700, fontSize: 14, color: 'var(--ink-2)' }}>
          {tier.miles} mi
        </span>
        {badge}
      </div>
      <h3 style={{ fontSize: 23, fontWeight: 700 }}>{tier.name}</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.5, flex: 1 }}>{tier.desc}</p>
      {claimed ? (
        <button className="reward-btn" disabled style={{ color: 'var(--muted)' }}>Reward claimed</button>
      ) : reached ? (
        <button className="reward-btn redeem" onClick={() => onRedeem(tier)}>
          {Icons.cup({ width: 16, height: 16 })} Redeem reward
        </button>
      ) : (
        <button className="reward-btn" disabled style={{ color: 'var(--muted)' }}>{toGo.toFixed(1)} miles to go</button>
      )}
    </div>
  );
}

function Rewards({ tiers, totalMiles, redemptions, onRedeem }) {
  const [tab, setTab] = useStateRw('available');
  const redMap = {};
  redemptions.forEach(r => { redMap[r.tierId] = r; });

  return (
    <div className="screen main-narrow" style={{ margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ic">{Icons.gift()}</span>Rewards</h1>
          <p className="page-sub">Unlock café perks with your miles.</p>
        </div>
        <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13.5, fontWeight: 600 }}>Your Balance</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--primary)' }}>{totalMiles.toFixed(1)} mi</span>
        </div>
      </div>

      <div className="pill-tabs" style={{ marginBottom: 24 }}>
        <button className={'pill-tab' + (tab === 'available' ? ' on' : '')} onClick={() => setTab('available')}>Available Rewards</button>
        <button className={'pill-tab' + (tab === 'mine' ? ' on' : '')} onClick={() => setTab('mine')}>
          My Redemptions{redemptions.length ? ` (${redemptions.length})` : ''}
        </button>
      </div>

      {tab === 'available' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {tiers.map(t => <RewardCard key={t.id} tier={t} totalMiles={totalMiles} redemption={redMap[t.id]} onRedeem={onRedeem} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {redemptions.length === 0 && (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
              No redemptions yet. Reach a tier and claim your first reward!
            </div>
          )}
          {[...redemptions].sort((a,b)=>b.date.localeCompare(a.date)).map(r => (
            <div key={r.id} className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {Icons.cup({ width: 22, height: 22 })}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16.5 }}>{r.tier}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>{r.miles} mi reward · Requested {Util.shortPretty(r.date)}</div>
              </div>
              <span className={'badge badge-' + r.status} style={{ marginLeft: 'auto', textTransform: 'capitalize' }}>
                {r.status === 'approved' && Icons.check({width:12,height:12})}
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
window.Rewards = Rewards;
