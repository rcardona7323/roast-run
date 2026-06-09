/* Log a Run modal (also handles editing). window.LogRunModal */
/* global React, Icons, Util */
const { useState, useRef, useEffect } = React;

function DateField({ value, onChange }) {
  const ref = useRef(null);
  return (
    <div style={{ position: 'relative' }}>
      <div className="field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => { const el = ref.current; if (el.showPicker) el.showPicker(); else el.focus(); }}>
        <span style={{ fontWeight: 500 }}>{Util.pretty(value)}</span>
        <span style={{ color: 'var(--muted)', display: 'grid' }}>{Icons.calendar({ width: 18, height: 18 })}</span>
      </div>
      <input ref={ref} type="date" value={value} max={window.SEED.today}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}

function LogRunModal({ editing, onClose, onSave }) {
  const [miles, setMiles] = useState(editing ? String(editing.miles) : '');
  const [date, setDate] = useState(editing ? editing.date : window.SEED.today);
  const [notes, setNotes] = useState(editing ? editing.notes : '');
  const [err, setErr] = useState(false);

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const submit = () => {
    const m = parseFloat(miles);
    if (!m || m <= 0) { setErr(true); return; }
    onSave({ id: editing ? editing.id : 'r' + Date.now(), miles: m, date, notes,
      source: editing ? editing.source : 'Manual', club: editing ? editing.club : false });
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>{Icons.x({ width: 18, height: 18 })}</button>
        <div style={{ textAlign: 'center', padding: '34px 0 8px' }}>
          <div style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: '50%',
            background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
            {Icons.shoe({ width: 30, height: 30 })}
          </div>
          <h2 style={{ fontSize: 27, fontWeight: 800 }}>{editing ? 'Edit Run' : 'Log a Run'}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 7 }}>
            {editing ? 'Update the details of this run.' : 'Add miles to track progress towards the next reward.'}
          </p>
        </div>

        <div className="card" style={{ margin: '14px 0 0', padding: 24 }}>
          <label className="flabel">Distance (miles)</label>
          <div className="field" style={{ display: 'flex', alignItems: 'center', padding: 0,
            outline: err ? '2px solid #D9774E' : 'none' }}>
            <input value={miles} autoFocus inputMode="decimal" placeholder="e.g. 3.1"
              onChange={e => { setMiles(e.target.value); setErr(false); }}
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', padding: '13px 16px', fontSize: 15.5 }} />
            <span style={{ color: 'var(--muted)', fontWeight: 600, padding: '0 18px' }}>mi</span>
          </div>
          {err && <div style={{ color: '#B0492A', fontSize: 13, fontWeight: 600, marginTop: 6 }}>Enter a distance greater than zero.</div>}

          <label className="flabel" style={{ marginTop: 20 }}>Date</label>
          <DateField value={date} onChange={setDate} />

          <label className="flabel" style={{ marginTop: 20 }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="How did it feel? What route did you take?"
            className="field" style={{ resize: 'vertical', minHeight: 92, lineHeight: 1.5 }} />
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>Only visible to you.</div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{editing ? 'Save Changes' : 'Log Run'}</button>
        </div>
      </div>
    </div>
  );
}
window.LogRunModal = LogRunModal;
