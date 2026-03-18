import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './DashboardLayout.css';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Overview' },
  { path: '/dashboard/map', icon: '🗺️', label: 'Map' },
  { path: '/dashboard/reports', icon: '📝', label: 'Reports' },
  { path: '/dashboard/users', icon: '👥', label: 'Users' },
  { path: '/dashboard/analytics', icon: '📈', label: 'Analytics' },
  { path: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
];

const DashboardLayout: React.FC = () => {
  const { logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/admin'); };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const currentLabel = navItems.find(n => isActive(n.path))?.label || 'Dashboard';

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="CIVIX" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <h2>CIVIX</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn-sidebar">
            🚪 Logout
          </button>
        </div>
      </aside>
      <div className="main-content">
        <header className="header">
          <h1>{currentLabel}</h1>
          <div className="header-right">
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <span className="status-dot" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Online</span>
          </div>
        </header>
        <main className="content">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
