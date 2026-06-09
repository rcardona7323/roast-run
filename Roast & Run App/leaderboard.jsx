/* Leaderboard. window.Leaderboard */
/* global React, Icons, Avatar */
const { useState: useStateLb } = React;

const RANGES = [['week','This Week'],['month','This Month'],['all','All Time']];
const PODIUM = {
  0: { bg: 'linear-gradient(120deg, #FBF1D2 0%, #FCF7E8 60%, #FFFDF7 100%)', border: '#F2C744', ring: 'rgba(242,183,5,.4)',
       circle: 'linear-gradient(135deg,#F6C42A,#E8A60C)', cText: '#fff', shadow: '0 16px 34px -16px rgba(232,166,12,.5)' },
  1: { bg: 'linear-gradient(120deg, #F1EFEA 0%, #FAF8F4 100%)', border: '#D4CDC2', ring: 'rgba(180,172,160,.35)',
       circle: '#C9C2B8', cText: '#fff', shadow: '0 12px 26px -16px rgba(120,112,100,.4)' },
  2: { bg: 'linear-gradient(120deg, #FAEADC 0%, #FCF4EC 100%)', border: '#D98E4E', ring: 'rgba(200,97,26,.3)',
       circle: 'linear-gradient(135deg,#D2752A,#B95513)', cText: '#fff', shadow: '0 12px 26px -16px rgba(200,97,26,.4)' },
};

function Leaderboard({ data }) {
  const [range, setRange] = useStateLb('all');
  const ranked = [...data].sort((a,b) => b[range] - a[range]);

  return (
    <div className="screen main-narrow" style={{ margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ic">{Icons.trophy()}</span>Leaderboard</h1>
          <p className="page-sub">The neighborhood pacesetters.</p>
        </div>
        <div className="segmented">
          {RANGES.map(([k, label]) => (
            <button key={k} className={'seg' + (range === k ? ' on' : '')} onClick={() => setRange(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {ranked.map((p, i) => {
          const podium = PODIUM[i];
          if (podium) {
            return (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 24px',
                borderRadius: 18, background: podium.bg, border: `1.5px solid ${podium.border}`, boxShadow: podium.shadow }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: podium.circle, color: podium.cText,
                  display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, flexShrink: 0 }}>
                  {i === 0 ? Icons.medal({ width: 24, height: 24 }) : (i + 1)}
                </div>
                <Avatar name={p.name} color={p.color} size={48} ring="rgba(255,255,255,.7)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 19, whiteSpace: 'nowrap' }}>{p.name}{p.isMe && <span style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 700, marginLeft: 8 }}>You</span>}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13.5, fontWeight: 600 }}>{p.runs} run{p.runs>1?'s':''}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, lineHeight: 1 }}>{p[range].toFixed(1)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--muted)', marginTop: 3 }}>MILES</div>
                </div>
              </div>
            );
          }
          return (
            <div key={p.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 22px',
              background: p.isMe ? 'var(--primary-tint-2)' : 'var(--card)',
              border: p.isMe ? '1.5px solid #E6B98E' : '1px solid var(--border)' }}>
              <div style={{ width: 30, textAlign: 'center', fontWeight: 700, fontSize: 15, color: 'var(--muted)' }}>{i + 1}</div>
              <Avatar name={p.name} color={p.color} size={38} />
              <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>{p.name}{p.isMe && <span style={{ color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, marginLeft: 8 }}>You</span>}</div>
              <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{p[range].toFixed(1)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
window.Leaderboard = Leaderboard;
