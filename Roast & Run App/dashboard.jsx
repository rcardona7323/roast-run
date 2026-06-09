/* Dashboard screen. window.Dashboard */
/* global React, Icons, Util, DateTile */
function StatCard({ icon, label, children, accent, foot, onClick }) {
  return (
    <div className="card" onClick={onClick} style={{
      padding: '20px 22px',
      background: accent ? 'linear-gradient(150deg, #D2691E 0%, #B95513 100%)' : 'var(--card)',
      border: accent ? 'none' : '1px solid var(--border)',
      boxShadow: accent ? '0 14px 30px -14px rgba(200,97,26,.6)' : 'var(--shadow)',
      color: accent ? '#fff' : 'var(--ink)',
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex', flexDirection: 'column', gap: 12, minHeight: 142,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 600,
        color: accent ? 'rgba(255,255,255,.92)' : 'var(--muted)' }}>
        <span style={{ color: accent ? 'rgba(255,255,255,.95)' : 'var(--primary)', display: 'grid' }}>
          {icon({ width: 18, height: 18 })}
        </span>
        {label}
      </div>
      <div style={{ marginTop: 'auto' }}>{children}</div>
      {foot && <div style={{ fontSize: 13, fontWeight: 600,
        color: accent ? 'rgba(255,255,255,.85)' : 'var(--muted)' }}>{foot}</div>}
    </div>
  );
}

function Dashboard({ member, runs, today, totalMiles, tiers, redemptions, events, setRoute, openLog }) {
  const thisMonth = runs.filter(r => Util.inSameMonth(r.date, today)).reduce((s,r)=>s+r.miles,0);
  const thisWeek = runs.filter(r => Util.inSameWeek(r.date, today)).reduce((s,r)=>s+r.miles,0);
  const nextTier = tiers.find(t => t.miles > totalMiles);
  const goal = nextTier ? nextTier.miles : tiers[tiers.length-1].miles;
  const prevGoal = 0;
  const pct = Math.min(100, ((totalMiles - prevGoal) / (goal - prevGoal)) * 100);
  const toNext = nextTier ? (nextTier.miles - totalMiles) : 0;
  const pending = redemptions.filter(r => r.status === 'pending').length;
  const earned = redemptions.length;
  const recent = [...runs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  const nextEvent = [...events].filter(e => e.date >= today).sort((a,b)=>a.date.localeCompare(b.date))[0];

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Your Dashboard</h1>
          <p className="page-sub">Welcome back, {member.first}. Let&rsquo;s get moving.</p>
        </div>
        <button className="btn btn-primary" onClick={openLog}>{Icons.shoe()}Log a Run</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        <StatCard icon={Icons.activity} label="Total Miles" accent foot={`${runs.length} total runs logged`}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, lineHeight: .9 }}>
            {totalMiles.toFixed(1)}
          </div>
        </StatCard>
        <StatCard icon={Icons.flame} label="This Month" foot={`${thisWeek.toFixed(1)} miles this week`}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 46, lineHeight: .9 }}>
            {thisMonth.toFixed(1)} <span style={{ fontSize: 22, color: 'var(--muted)', fontWeight: 700 }}>mi</span>
          </div>
        </StatCard>
        <StatCard icon={Icons.cup} label="Earned Rewards" onClick={() => setRoute('rewards')}
          foot={pending ? <span style={{ color: 'var(--primary)' }}>{pending} pending redemption{pending>1?'s':''}</span> : 'View your rewards'}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 46, lineHeight: .9 }}>{earned}</div>
        </StatCard>
      </div>

      {/* Next reward */}
      <div className="card" style={{ padding: '24px 26px', marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ color: 'var(--green)', display: 'grid' }}>{Icons.ribbon({ width: 22, height: 22 })}</span>
          <h3 style={{ fontSize: 19, fontWeight: 700 }}>Next Reward</h3>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 20 }}>
          {nextTier
            ? <>{toNext.toFixed(1)} miles left until you unlock: <strong style={{ color: 'var(--ink)' }}>{nextTier.name}</strong></>
            : 'You\u2019ve unlocked every reward tier — incredible.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 9, whiteSpace: 'nowrap', gap: 12 }}>
          <span>Current: {totalMiles.toFixed(1)} mi</span>
          <span>Goal: {goal} mi</span>
        </div>
        <div style={{ height: 13, borderRadius: 99, background: '#EDE6DB', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', borderRadius: 99,
            background: 'linear-gradient(90deg, #D2691E, #B95513)', transition: 'width .8s cubic-bezier(.2,.7,.3,1)' }} />
        </div>
      </div>

      {/* Recent runs + next club run */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, marginTop: 30, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 21, fontWeight: 800 }}>Recent Runs</h3>
            <button className="btn btn-ghost" style={{ padding: '6px 4px', fontSize: 14.5 }} onClick={() => setRoute('runs')}>
              View all {Icons.arrowRight({ width: 16, height: 16 })}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recent.map(r => (
              <div key={r.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
                <DateTile iso={r.date} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{r.miles.toFixed(2)}</span>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>mi</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
                  {r.club && <span className="badge badge-club">{Icons.cup({width:11,height:11})}Club Run</span>}
                  <span className={'badge ' + (r.source === 'Strava' ? 'badge-strava' : 'badge-manual')}>{r.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 16 }}>Next Club Run</h3>
          {nextEvent ? (
            <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(60,90,67,.10), transparent 70%)' }} />
              <span className="badge" style={{ background: 'var(--green)', color: '#fff', marginBottom: 14 }}>
                {Util.relative(nextEvent.date, today)}
              </span>
              <h4 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{nextEvent.name}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                {Icons.calendar({ width: 15, height: 15 })}
                {Util.weekday(nextEvent.date)}, {Util.shortPretty(nextEvent.date)}
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{nextEvent.desc}</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 20, color: 'var(--muted)' }}>No upcoming club runs scheduled.</div>
          )}
        </div>
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
