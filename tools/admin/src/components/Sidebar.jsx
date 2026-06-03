const NAV = [
  { key: 'photos',       icon: '🖼',  label: 'Photos' },
  { key: 'scores',       icon: '📊',  label: 'Score Overrides' },
  { key: 'participants', icon: '👥',  label: 'Participants' },
];

export default function Sidebar({ page, onNavigate, onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">⚡ Marathon Admin</div>
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button onClick={onLogout}>Sign out</button>
      </div>
    </aside>
  );
}
