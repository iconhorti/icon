import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Users, Tractor, FileText, Landmark,
  Sprout, Hammer, ClipboardList, Eye, EyeOff
} from 'lucide-react';
import './Login.css';

// ── Demo role tiles — all use password "icon123"
//    admin shortcut uses hardcoded "admin" / "icon2026"
const DEMO_ROLES = [
  { label: 'Admin',              role: 'admin',                username: '9888888888',  password: 'icon123', icon: ShieldCheck,   color: '#1a472a' },
  { label: 'Owner',              role: 'owner',                username: '9000000000',  password: 'icon123',  icon: ShieldCheck,   color: '#1a472a' },
  { label: 'Dealer',             role: 'dealer',               username: '9000006001',  password: 'icon123',  icon: Users,         color: '#2563eb' },
  { label: 'Project Manager',    role: 'project_manager',      username: '9000003001',  password: 'icon123',  icon: ClipboardList, color: '#7c3aed' },
  { label: 'Office Staff',       role: 'office_staff',         username: '9100000001',  password: 'icon123',  icon: FileText,      color: '#0891b2' },
  { label: 'Bank Officer',       role: 'bank_officer',         username: '9200000001',  password: 'icon123',  icon: Landmark,      color: '#b45309' },
  { label: 'Agency Officer',     role: 'agency_officer',       username: '9300000001',  password: 'icon123',  icon: Landmark,      color: '#be185d' },
  { label: 'Agronomist',         role: 'agronomist',           username: '9500000001',  password: 'icon123',  icon: Sprout,        color: '#15803d' },
  { label: 'Farmer',             role: 'farmer',               username: '4424554545',  password: 'icon123',  icon: Tractor,       color: '#b45309' },
  { label: 'Contractor',         role: 'structure_contractor', username: '9400000001',  password: 'icon123',  icon: Hammer,        color: '#374151' },
];

const Login = () => {
  const { login: setAuthUser } = useAuth();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [loadingRole, setLoadingRole] = useState(null);
  const navigate = useNavigate();

  const doLogin = async (u, p, roleLabel = null) => {
    if (roleLabel) setLoadingRole(roleLabel);
    else setLoading(true);
    setError(null);
    try {
      const user = await login(u, p);
      setAuthUser(user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Connection failed. Check backend server.');
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin(username, password);
  };

  const handleRoleTile = (tile) => {
    doLogin(tile.username, tile.password, tile.label);
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg-overlay" />

      <div className="login-page-layout animate-fade-in">

        {/* ── Left Panel: Branding ── */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-logo-large">I</div>
            <h1 className="login-brand-title">ICON</h1>
            <p className="login-brand-sub">Greenhouse ERP</p>
            <p className="login-brand-desc">
              Agricultural Project Management System — managing the complete lifecycle
              of subsidized polyhouse and net house projects from lead generation
              to 10-year compliance.
            </p>
            <div className="login-brand-stats">
              <div className="brand-stat"><span className="bs-num">19</span><span className="bs-lbl">Stage Workflow</span></div>
              <div className="brand-stat"><span className="bs-num">13</span><span className="bs-lbl">User Roles</span></div>
              <div className="brand-stat"><span className="bs-num">4</span><span className="bs-lbl">Subsidy Agencies</span></div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Login + Role Tiles ── */}
        <div className="login-right-panel">

          {/* Manual login form */}
          <form className="login-form glass-card" onSubmit={handleSubmit}>
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your ICON account</p>
            </div>

            {error && (
              <div className="login-error-alert">
                <span>⚠️ {error}</span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Phone Number / Username</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 9876543210 or admin"
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="pass-field-wrapper">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass(v => !v)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full login-submit-btn"
              disabled={loading || !username || !password}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo quick-login tiles */}
          <div className="demo-login-section">
            <div className="demo-divider">
              <span>Quick Login — Demo Roles</span>
            </div>
            <div className="role-tiles-grid">
              {DEMO_ROLES.map((tile) => {
                const Icon = tile.icon;
                const isLoading = loadingRole === tile.label;
                return (
                  <button
                    key={tile.role}
                    className="role-tile"
                    onClick={() => handleRoleTile(tile)}
                    disabled={!!loadingRole || loading}
                    style={{ '--tile-color': tile.color }}
                  >
                    <div className="role-tile-icon">
                      <Icon size={20} />
                    </div>
                    <span className="role-tile-label">
                      {isLoading ? '…' : tile.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="demo-hint">All demo accounts use password: <code>icon123</code></p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
