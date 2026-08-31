import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSurvey } from '../context/SurveyContext';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Punjab Survey',
  '/surveys':    'My Surveys',
  '/surveys/new':'New Survey',
  '/sync':       'Sync Data',
  '/supervisor': 'Approval Queue',
  '/admin':      'User Management',
};

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const { pendingCount, isOnline } = useSurvey();
  const navigate = useNavigate();
  const location = useLocation();

  const title = Object.entries(PAGE_TITLES).find(([k]) =>
    location.pathname.startsWith(k) && k !== '/dashboard'
      ? location.pathname.startsWith(k)
      : location.pathname === k || location.pathname === '/'
  )?.[1] ?? 'Punjab Survey';

  const tabs = [
    { to: '/dashboard', icon: '⊞',   label: 'Home'    },
    { to: '/surveys',   icon: '◧',   label: 'Surveys' },
    { to: '/sync',      icon: '↻',   label: 'Sync',   badge: pendingCount },
    ...(hasPermission('UNIT_APPROVE') ? [{ to: '/supervisor', icon: '✓', label: 'Review' }] : []),
    ...(hasPermission('USER_MANAGE')  ? [{ to: '/admin',      icon: '⚙', label: 'Admin'  }] : []),
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>

      {/* Material Top App Bar */}
      <div className="app-bar">
        <span className="app-bar-title">{title}</span>
        <div className="app-bar-actions">
          {/* Online/offline indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 999, padding: '3px 8px', marginRight: 4
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: isOnline ? '#69F0AE' : '#FF5252'
            }} />
            <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {/* Avatar + logout */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}
            onClick={() => { if(confirm('Sign out?')) { logout(); navigate('/login'); } }}
          >
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>
      </div>

      {/* Page content — no visible scrollbar */}
      <div className="page-scroll">
        <Outlet />
      </div>

      {/* Android bottom nav */}
      <nav className="bottom-nav">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {(tab as any).badge > 0 && (
              <span className="nav-badge">
                {(tab as any).badge > 9 ? '9+' : (tab as any).badge}
              </span>
            )}
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
