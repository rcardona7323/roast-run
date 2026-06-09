/* App root. Wires state + screens. window.App */
/* global React, SEED, Util, Sidebar, Dashboard, MyRuns, Rewards, Leaderboard, Profile, LogRunModal, Icons */
const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [route, setRoute] = useStateApp('dashboard');
  const [runs, setRuns] = useStateApp(SEED.runs);
  const [member, setMember] = useStateApp(SEED.member);
  const [redemptions, setRedemptions] = useStateApp(SEED.redemptions);
  const [strava, setStrava] = useStateApp(SEED.member.strava);
  const [log, setLog] = useStateApp(null); // null | {editing}
  const [toast, setToast] = useStateApp(null);

  const totalMiles = runs.reduce((s, r) => s + r.miles, 0);

  useEffectApp(() => { window.scrollTo(0, 0); }, [route]);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const openLog = (editing = null) => setLog({ editing });
  const saveRun = (run) => {
    setRuns(prev => prev.some(r => r.id === run.id)
      ? prev.map(r => r.id === run.id ? run : r)
      : [run, ...prev]);
    setLog(null);
    showToast(log && log.editing ? 'Run updated.' : `Logged ${run.miles.toFixed(2)} mi — nice work!`);
  };
  const deleteRun = (id) => { setRuns(prev => prev.filter(r => r.id !== id)); showToast('Run deleted.'); };

  const redeem = (tier) => {
    if (redemptions.some(r => r.tierId === tier.id)) return;
    setRedemptions(prev => [...prev, { id: 'rd' + Date.now(), tierId: tier.id, tier: tier.name,
      miles: tier.miles, date: SEED.today, status: 'pending' }]);
    showToast(`${tier.name} requested — we\u2019ll review it shortly!`);
  };

  // live leaderboard: reflect Rick's current miles
  const myWeek = runs.filter(r => Util.inSameWeek(r.date, SEED.today)).reduce((s,r)=>s+r.miles,0);
  const myMonth = runs.filter(r => Util.inSameMonth(r.date, SEED.today)).reduce((s,r)=>s+r.miles,0);
  const leaderboard = SEED.leaderboard.map(p => p.isMe
    ? { ...p, name: member.name, all: totalMiles, month: myMonth, week: myWeek, runs: runs.length } : p);

  const liveMember = { ...member, color: SEED.member.color, initials: Util.initials(member.name) };

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} member={liveMember} totalMiles={totalMiles} />
      <main className="main">
        {route === 'dashboard' && <Dashboard member={member} runs={runs} today={SEED.today} totalMiles={totalMiles}
          tiers={SEED.tiers} redemptions={redemptions} events={SEED.events} setRoute={setRoute} openLog={() => openLog()} />}
        {route === 'log' && <LogPage openLog={() => openLog()} setRoute={setRoute} />}
        {route === 'runs' && <MyRuns runs={runs} openLog={openLog} onEdit={(r) => openLog(r)} onDelete={deleteRun} />}
        {route === 'rewards' && <Rewards tiers={SEED.tiers} totalMiles={totalMiles} redemptions={redemptions} onRedeem={redeem} />}
        {route === 'leaderboard' && <Leaderboard data={leaderboard} />}
        {route === 'profile' && <Profile member={member} totalMiles={totalMiles} runCount={runs.length}
          onSave={setMember} strava={strava} onStrava={(v) => { setStrava(v); showToast(v ? 'Strava connected.' : 'Strava disconnected.'); }} />}
      </main>

      {log && <LogRunModal editing={log.editing} onClose={() => setLog(null)} onSave={saveRun} />}

      {toast && (
        <div className="toast">
          <span style={{ color: 'var(--green)', display: 'grid' }}>{Icons.check({ width: 18, height: 18 })}</span>
          {toast}
        </div>
      )}
    </div>
  );
}

// "Log a Run" nav route lands on a focused page that opens the modal
function LogPage({ openLog, setRoute }) {
  React.useEffect(() => { openLog(); setRoute('dashboard'); }, []);
  return null;
}

window.App = App;
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
