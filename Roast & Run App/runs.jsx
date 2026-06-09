/* My Runs screen. window.MyRuns */
/* global React, Icons, DateTile, Util */
const { useState: useStateRuns } = React;

function RunRow({ run, onEdit, onDelete }) {
  const [confirm, setConfirm] = useStateRuns(false);
  return (
    <div className="card run-row" style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
      <div style={{ background: 'var(--card-soft)', borderRight: '1px solid var(--border)', display: 'grid', placeItems: 'center', padding: '0 22px' }}>
        <DateTile iso={run.date} size="lg" />
      </div>
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--primary)' }}>{run.miles.toFixed(2)}</span>
            <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 17 }}>miles</span>
            {run.club && <span className="badge badge-club">{Icons.cup({width:11,height:11})}Club Run</span>}
            <span className={'badge ' + (run.source === 'Strava' ? 'badge-strava' : 'badge-manual')}>{run.source}</span>
          </div>
          {run.notes && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>{run.notes}</p>}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {confirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>Delete this run?</span>
              <button className="btn" style={{ padding: '7px 14px', fontSize: 13.5, background: '#B0492A', color: '#fff' }}
                onClick={() => onDelete(run.id)}>Delete</button>
              <button className="btn btn-outline" style={{ padding: '7px 14px', fontSize: 13.5 }} onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <button className="icon-btn" title="Edit" onClick={() => onEdit(run)}>{Icons.edit({ width: 18, height: 18 })}</button>
              <button className="icon-btn" title="Delete" onClick={() => setConfirm(true)}>{Icons.trash({ width: 18, height: 18 })}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MyRuns({ runs, openLog, onEdit, onDelete }) {
  const [filter, setFilter] = useStateRuns('All');
  const sorted = [...runs].sort((a,b)=>b.date.localeCompare(a.date));
  const shown = filter === 'All' ? sorted : sorted.filter(r => r.source === filter);
  const total = runs.reduce((s,r)=>s+r.miles,0);

  return (
    <div className="screen main-narrow" style={{ margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ic">{Icons.history()}</span>Run History</h1>
          <p className="page-sub">All your logged miles in one place — {total.toFixed(1)} mi across {runs.length} runs.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openLog()}>{Icons.shoe()}Log a New Run</button>
      </div>

      <div className="segmented" style={{ marginBottom: 22 }}>
        {['All', 'Manual', 'Strava'].map(f => (
          <button key={f} className={'seg' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {shown.map(r => <RunRow key={r.id} run={r} onEdit={onEdit} onDelete={onDelete} />)}
        {shown.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            No {filter.toLowerCase()} runs yet.
          </div>
        )}
      </div>
    </div>
  );
}
window.MyRuns = MyRuns;
