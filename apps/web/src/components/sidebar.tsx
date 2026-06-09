import { useLocation, Link } from "wouter";
import { signOut } from "../lib/auth";
import { trpc } from "../lib/trpc";

const navItems = [
  { href: "/", label: "Dashboard", icon: ActivityIcon },
  { href: "/runs", label: "My Runs", icon: HistoryIcon },
  { href: "/rewards", label: "Rewards", icon: GiftIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/profile", label: "My Profile", icon: UserIcon },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { data: member } = trpc.members.me.useQuery();

  const initials = member?.displayName
    ? member.displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <CupIcon />
        </div>
        <div>
          <div className="brand-name">Roast &amp; Run</div>
          <div className="brand-sub">Café Club</div>
        </div>
      </div>

      <div className="nav-label">MEMBER</div>
      <nav className="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <button className={`nav-item${location === href ? " active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </button>
          </Link>
        ))}
      </nav>

      {member?.isAdmin && (
        <>
          <div className="nav-label" style={{ marginTop: 16 }}>ADMIN</div>
          <nav className="sidebar-nav">
            <Link href="/admin">
              <button className={`nav-item${location === "/admin" ? " active" : ""}`}>
                <ShieldIcon />
                <span>Club Admin</span>
              </button>
            </Link>
          </nav>
        </>
      )}

      <div className="sidebar-foot">
        <div className="divider" />
        <div className="user-row">
          <div className="avatar-circle" style={{ width: 42, height: 42, fontSize: 15 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{member?.displayName ?? "—"}</div>
            <div className="user-miles">{(member?.totalMiles ?? 0).toFixed(1)} miles</div>
          </div>
        </div>
        <button className="logout-btn" onClick={() => signOut()}>
          <LogoutIcon />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

function CupIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><polyline points="12 7 12 12 15 15"/>
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
