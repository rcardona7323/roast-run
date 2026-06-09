/* Shared helpers + small components. window.Util, window.Avatar, window.DateTile */
/* global React */
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function parse(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }
function ord(n) { const s=['th','st','nd','rd'], v=n%100; return n + (s[(v-20)%10] || s[v] || s[0]); }

const Util = {
  parse,
  tile: (iso) => { const d = parse(iso); return { mon: MON[d.getMonth()], day: String(d.getDate()), year: String(d.getFullYear()) }; },
  pretty: (iso) => { const d = parse(iso); return `${MONTHF[d.getMonth()]} ${ord(d.getDate())}, ${d.getFullYear()}`; },
  shortPretty: (iso) => { const d = parse(iso); return `${MONTHF[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`; },
  weekday: (iso) => WD[parse(iso).getDay()],
  relative: (iso, todayIso) => {
    const a = parse(iso), b = parse(todayIso);
    const days = Math.round((a - b) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${-days} day${days===-1?'':'s'} ago`;
    return `In ${days} days`;
  },
  inSameWeek: (iso, todayIso) => {
    const b = parse(todayIso); const day = b.getDay();
    const start = new Date(b); start.setDate(b.getDate() - day); // sunday
    const a = parse(iso);
    return a >= start && a <= b;
  },
  inSameMonth: (iso, todayIso) => {
    const a = parse(iso), b = parse(todayIso);
    return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() && a <= b;
  },
  initials: (name) => name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase(),
};

function Avatar({ name, color, size = 40, ring }) {
  const st = {
    width: size, height: size, borderRadius: '50%',
    background: color || '#C8611A', color: '#fff',
    display: 'grid', placeItems: 'center', flexShrink: 0,
    fontFamily: 'var(--font-body)', fontWeight: 700,
    fontSize: size * 0.4, letterSpacing: '.01em',
    boxShadow: ring ? `0 0 0 3px ${ring}` : 'none',
    userSelect: 'none',
  };
  return <div style={st}>{Util.initials(name)}</div>;
}

function DateTile({ iso, size = 'md' }) {
  const t = Util.tile(iso);
  const big = size === 'lg';
  return (
    <div style={{
      width: big ? 84 : 56, padding: big ? '12px 0' : '9px 0', textAlign: 'center',
      background: big ? 'var(--card-soft)' : 'var(--primary-tint-2)',
      border: '1px solid var(--border)', borderRadius: big ? 14 : 12, flexShrink: 0,
    }}>
      <div style={{ fontSize: big ? 13 : 11, fontWeight: 800, letterSpacing: '.08em', color: 'var(--primary)' }}>{t.mon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: big ? 30 : 21, lineHeight: 1.05, color: 'var(--ink)' }}>{t.day}</div>
      {big && <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{t.year}</div>}
    </div>
  );
}

window.Util = Util;
window.Avatar = Avatar;
window.DateTile = DateTile;
