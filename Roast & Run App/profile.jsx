/* My Profile. window.Profile */
/* global React, Icons, Avatar */
const { useState: useStatePf } = React;

function Field({ label, icon, value, onChange, hint, type = 'text' }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="flabel" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon && <span style={{ color: 'var(--primary)', display: 'grid' }}>{icon({ width: 15, height: 15 })}</span>}
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="field" />
      {hint && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function Profile({ member, totalMiles, runCount, onSave, strava, onStrava }) {
  const [form, setForm] = useStatePf({ ...member });
  const [saved, setSaved] = useStatePf(false);
  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };
  const dirty = JSON.stringify(form) !== JSON.stringify(member);

  return (
    <div className="screen main-narrow" style={{ margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <h1 className="page-title"><span className="ic">{Icons.user()}</span>My Profile</h1>
          <p className="page-sub">Update your contact details and emergency info.</p>
        </div>
      </div>

      <div className="divider" style={{ margin: '0 0 24px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Avatar name={member.name} color={member.color} size={62} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23 }}>{member.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 14.5 }}>{totalMiles.toFixed(1)} miles logged · {runCount} runs · member since {member.joined}</div>
        </div>
      </div>

      {/* Basic info */}
      <div className="card" style={{ padding: 26, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
          <span style={{ color: 'var(--primary)', display: 'grid' }}>{Icons.user({ width: 19, height: 19 })}</span>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Basic Info</h3>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Your name as it appears on the leaderboard.</p>
        <Field label="Display Name" value={form.name} onChange={set('name')} />
        <Field label="Email" icon={Icons.mail} value={form.email} onChange={set('email')} hint="Used for reward approval notifications." type="email" />
        <Field label="Phone Number" icon={Icons.phone} value={form.phone} onChange={set('phone')} type="tel" />
      </div>

      {/* Emergency contact */}
      <div className="card" style={{ padding: 26, marginBottom: 20, borderLeft: '4px solid var(--gold)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
          <span style={{ color: 'var(--gold)', display: 'grid' }}>{Icons.phoneCall({ width: 19, height: 19 })}</span>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Emergency Contact</h3>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Who should we call in case of an emergency during a run?</p>
        <Field label="Contact Name" value={form.emergencyName} onChange={set('emergencyName')} />
        <Field label="Contact Phone" value={form.emergencyPhone} onChange={set('emergencyPhone')} type="tel" />
      </div>

      {/* Strava */}
      <div className="card" style={{ padding: 26, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: strava ? '#FCEAE0' : 'var(--card-soft)',
          color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid var(--border-2)' }}>
          {Icons.link({ width: 22, height: 22 })}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Strava{strava && <span className="badge badge-strava" style={{ marginLeft: 10, verticalAlign: 'middle' }}>{Icons.check({width:11,height:11})}Connected</span>}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 3 }}>
            {strava ? 'New activities sync automatically. Re-syncing never creates duplicates.' : 'Connect your account so runs sync automatically — no manual entry needed.'}
          </p>
        </div>
        {strava
          ? <button className="btn btn-outline" onClick={() => onStrava(false)}>Disconnect</button>
          : <button className="btn btn-primary" onClick={() => onStrava(true)}>{Icons.link()}Connect Strava</button>}
      </div>

      <div className="divider" style={{ margin: '0 0 22px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
        {saved && <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.check({width:16,height:16})}Profile saved</span>}
        <button className="btn btn-primary" disabled={!dirty} style={{ opacity: dirty ? 1 : .5 }}
          onClick={() => { onSave(form); setSaved(true); }}>{Icons.save()}Save Profile</button>
      </div>
    </div>
  );
}
window.Profile = Profile;
