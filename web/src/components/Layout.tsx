import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, WifiOff } from 'lucide-react';
import Sidebar from './Sidebar';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useNotificationsStream } from '../hooks/useNotificationsStream';

const Layout = () => {
  const navigate = useNavigate();
  const { user: userStr } = useAuth();
  const online = useOnlineStatus();
  useNotificationsStream(); // live notification refresh (falls back to polling)
  
  // Theme state
  const [isDark, setIsDark] = useState(() => localStorage.getItem('icon_theme') === 'dark');
  
  // Language switcher (i18n not yet implemented — placeholder removed from UI)

  // Apply theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('icon_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('icon_theme', 'light');
    }
  }, [isDark]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K → focus the browser's native find-in-page (no stub alert)
      // Shift+D → jump to dashboard
      if (e.shiftKey && e.key === 'D') {
        e.preventDefault();
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!userStr) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Global Action Header */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          padding: '0.75rem 2rem', 
          background: 'var(--color-bg-card)', 
          borderBottom: '1px solid var(--glass-border)',
          gap: '1rem',
          zIndex: 10
        }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')} title="Go to Projects (search from there)">
            <Search size={16} /> Search
          </button>

          <button
            onClick={() => setIsDark(!isDark)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--color-text-main)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '50%'
            }}
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {/* Offline banner — first slice of offline resilience */}
        {!online && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#fffbeb', color: '#92400e', borderBottom: '1px solid #fde68a',
            padding: '0.4rem 1rem', fontSize: '0.82rem', fontWeight: 600,
          }}>
            <WifiOff size={15} /> You're offline — changes can't be saved until the connection returns.
          </div>
        )}

        <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
