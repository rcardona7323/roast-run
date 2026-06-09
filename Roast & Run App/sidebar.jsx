/* Sidebar nav. window.Sidebar */
/* global React, Icons, Avatar */
function Sidebar({ route, setRoute, member, totalMiles }) {
  const items = [
    ['dashboard', 'Dashboard', Icons.activity],
    ['log', 'Log a Run', Icons.plus],
    ['runs', 'My Runs', Icons.history],
    ['rewards', 'Rewards', Icons.gift],
    ['leaderboard', 'Leaderboard', Icons.trophy],
    ['profile', 'My Profile', Icons.user],
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">{Icons.cup({ width: 24, height: 24 })}</div>
        <div>
          <div className="brand-name">Roast &amp; Run</div>
          <div className="brand-sub">Café Club</div>
        </div>
      </div>

      <div className="nav-label">MEMBER</div>
      <nav className="nav">
        {items.map(([key, label, Icon]) => (
          <button
            key={key}
            className={'nav-item' + (route === key ? ' active' : '')}
            onClick={() => setRoute(key)}
          >
            {Icon()}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="divider" />
        <div className="user-row">
          <Avatar name={member.name} color={member.color} size={42} />
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{member.name}</div>
            <div className="user-miles">{totalMiles.toFixed(1)} miles</div>
          </div>
        </div>
        <button className="logout">{Icons.logout()}<span>Log Out</span></button>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;
