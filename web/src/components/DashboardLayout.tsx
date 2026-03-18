import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardLayout.css';

const navItems = [
  { path: '/', icon: '📊', label: 'Overview' },
  { path: '/map', icon: '🗺️', label: 'Map' },
  { path: '/reports', icon: '📝', label: 'Reports' },
  { path: '/users', icon: '👥', label: 'Users' },
  { path: '/analytics', icon: '📈', label: 'Analytics' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

const DashboardLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span style={{ fontSize: 24 }}>🌊</span>
          <h2>WaterAlert</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
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
          <h1>{navItems.find(n => isActive(n.path))?.label || 'Dashboard'}</h1>
          <div className="header-right">
            <span className="status-dot" />
            <span style={{ fontSize: 13, color: '#888' }}>System Online</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
