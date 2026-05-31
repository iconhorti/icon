import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUnreadCount } from '../api/client';
import {
  LayoutDashboard, Users, Tractor, Landmark,
  Settings, LogOut, BarChart2,
  Building2, Wrench, Leaf, Banknote, ClipboardCheck,
  Handshake, UserCog, Database, HardHat, Compass,
  BriefcaseBusiness, ShieldCheck, Bell, FileText,
} from 'lucide-react';
import './Sidebar.css';

// ─── Role → nav items ────────────────────────────────────────────────────────
// Rules:
//  • /masters  → admin & owner only   (reference data management)
//  • /users    → admin only           (user account management)
//  • /settings → admin & owner only   (system settings)
//  • /reports  → admin, owner, office_staff, project_manager, bank_officer, agency_officer, agronomist
//  • Subsidy Calculator removed entirely
// ─────────────────────────────────────────────────────────────────────────────
const NAV_BY_ROLE = {

  // ── Admin: full access ──────────────────────────────────────────────────────
  admin: [
    { to: '/',                           icon: LayoutDashboard,   label: 'Dashboard' },
    { to: '/projects',                   icon: Tractor,           label: 'All Projects' },
    { to: '/farmers',                    icon: Users,             label: 'Farmers' },
    { to: '/dealers',                    icon: Handshake,         label: 'Dealers' },
    { to: '/staff',                      icon: UserCog,           label: 'Office Staff' },
    { to: '/staff?role=project_manager', icon: Compass,           label: 'Project Managers' },
    { to: '/staff?role=bank_officer',    icon: BriefcaseBusiness, label: 'Bank Officers' },
    { to: '/staff?role=agency_officer',  icon: ShieldCheck,       label: 'Agency Officers' },
    { to: '/contractors',                icon: HardHat,           label: 'Contractors' },
    { to: '/agronomists',                icon: Leaf,              label: 'Agronomists' },
    { to: '/users',                      icon: Users,             label: 'All Users' },
    { to: '/reports',                    icon: BarChart2,         label: 'Reports' },
    { to: '/documents',                  icon: FileText,          label: 'Documents' },
    { to: '/masters',                    icon: Database,          label: 'Masters' },
    { to: '/notifications',              icon: Bell,              label: 'Notifications' },
  ],

  // ── Owner: same as admin minus user-account management ─────────────────────
  owner: [
    { to: '/',                           icon: LayoutDashboard,   label: 'Dashboard' },
    { to: '/projects',                   icon: Tractor,           label: 'All Projects' },
    { to: '/farmers',                    icon: Users,             label: 'Farmers' },
    { to: '/dealers',                    icon: Handshake,         label: 'Dealers' },
    { to: '/staff',                      icon: UserCog,           label: 'Office Staff' },
    { to: '/staff?role=project_manager', icon: Compass,           label: 'Project Managers' },
    { to: '/staff?role=bank_officer',    icon: BriefcaseBusiness, label: 'Bank Officers' },
    { to: '/staff?role=agency_officer',  icon: ShieldCheck,       label: 'Agency Officers' },
    { to: '/contractors',                icon: HardHat,           label: 'Contractors' },
    { to: '/agronomists',                icon: Leaf,              label: 'Agronomists' },
    { to: '/reports',                    icon: BarChart2,         label: 'Reports' },
    { to: '/documents',                  icon: FileText,          label: 'Documents' },
    { to: '/masters',                    icon: Database,          label: 'Masters' },
    { to: '/notifications',              icon: Bell,              label: 'Notifications' },
  ],

  // ── Office Staff: operational access — NO masters, NO user management ──────
  office_staff: [
    { to: '/',                           icon: LayoutDashboard,   label: 'Dashboard' },
    { to: '/projects',                   icon: Tractor,           label: 'Projects' },
    { to: '/farmers',                    icon: Users,             label: 'Farmers' },
    { to: '/dealers',                    icon: Handshake,         label: 'Dealers' },
    { to: '/staff',                      icon: UserCog,           label: 'Office Staff' },
    { to: '/staff?role=project_manager', icon: Compass,           label: 'Project Managers' },
    { to: '/staff?role=bank_officer',    icon: BriefcaseBusiness, label: 'Bank Officers' },
    { to: '/staff?role=agency_officer',  icon: ShieldCheck,       label: 'Agency Officers' },
    { to: '/contractors',                icon: HardHat,           label: 'Contractors' },
    { to: '/agronomists',                icon: Leaf,              label: 'Agronomists' },
    { to: '/documents',                  icon: FileText,          label: 'Documents' },
    { to: '/reports',                    icon: BarChart2,         label: 'Reports' },
    { to: '/notifications',              icon: Bell,              label: 'Notifications' },
  ],

  // ── Project Manager: own projects + contractors + reports ──────────────────
  project_manager: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Tractor,         label: 'My Projects' },
    { to: '/farmers',       icon: Users,           label: 'Farmers' },
    { to: '/contractors',   icon: HardHat,         label: 'Contractors' },
    { to: '/documents',     icon: FileText,        label: 'Documents' },
    { to: '/reports',       icon: ClipboardCheck,  label: 'Site Reports' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],

  // ── Dealer: own portfolio only ─────────────────────────────────────────────
  dealer: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Tractor,         label: 'My Projects' },
    { to: '/farmers',       icon: Users,           label: 'My Farmers' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],

  // ── Bank Officer: loan applications + reports only ─────────────────────────
  bank_officer: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Banknote,        label: 'Loan Applications' },
    { to: '/documents',     icon: FileText,        label: 'Documents' },
    { to: '/reports',       icon: BarChart2,       label: 'Reports' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],

  // ── Agency Officer: inspections + subsidy pipeline ────────────────────────
  agency_officer: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Landmark,        label: 'Inspections' },
    { to: '/documents',     icon: FileText,        label: 'Documents' },
    { to: '/reports',       icon: BarChart2,       label: 'Reports' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],

  // ── Agronomist: farms under advisory ──────────────────────────────────────
  agronomist: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Leaf,            label: 'My Farms' },
    { to: '/documents',     icon: FileText,        label: 'Documents' },
    { to: '/reports',       icon: ClipboardCheck,  label: 'Crop Reports' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],

  // ── Contractors: own active sites only ─────────────────────────────────────
  structure_contractor: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Building2,       label: 'My Sites (M1–M4)' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],
  drip_contractor: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Wrench,          label: 'My Sites (M5)' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],
  bed_contractor: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Wrench,          label: 'My Sites (M6)' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],
  plantation_contractor: [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',      icon: Leaf,            label: 'My Sites (M7)' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],

  // ── Farmer: personal project tracker only ─────────────────────────────────
  farmer: [
    { to: '/',              icon: LayoutDashboard, label: 'My Dashboard' },
    { to: '/projects',      icon: Tractor,         label: 'My Project' },
    { to: '/documents',     icon: FileText,        label: 'My Documents' },
    { to: '/notifications', icon: Bell,            label: 'Notifications' },
  ],
};

const DEFAULT_NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: Tractor,         label: 'Projects' },
];

// ─── Role display metadata ────────────────────────────────────────────────────
const ROLE_META = {
  owner:                 { label: 'Owner',                emoji: '👑' },
  admin:                 { label: 'Administrator',        emoji: '🛡️' },
  office_staff:          { label: 'Office Staff',         emoji: '📋' },
  project_manager:       { label: 'Project Manager',      emoji: '🧭' },
  dealer:                { label: 'Dealer',               emoji: '🤝' },
  bank_officer:          { label: 'Bank Officer',         emoji: '🏦' },
  agency_officer:        { label: 'Agency Officer',       emoji: '🏛️' },
  agronomist:            { label: 'Agronomist',           emoji: '🌿' },
  structure_contractor:  { label: 'Structure Contractor', emoji: '🏗️' },
  drip_contractor:       { label: 'Drip Contractor',      emoji: '💧' },
  bed_contractor:        { label: 'Bed Contractor',       emoji: '🌱' },
  plantation_contractor: { label: 'Plantation Contractor',emoji: '🪴' },
  farmer:                { label: 'Farmer',               emoji: '👨‍🌾' },
};

// Roles that see Settings in the footer
const SETTINGS_ROLES = new Set(['admin', 'owner']);

// ─── Component ────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const navItems  = NAV_BY_ROLE[user.role] ?? DEFAULT_NAV;
  const meta      = ROLE_META[user.role]   ?? { label: user.role, emoji: '👤' };

  // ── Live unread notification count (poll every 60 s) ─────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const data = await getUnreadCount();
        if (!cancelled) setUnreadCount(data.unread_count ?? 0);
      } catch { /* silently ignore — sidebar badge is non-critical */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="logo-icon">I</div>
        <div>
          <h2 className="brand-name">ICON</h2>
          <p className="brand-subtitle">Greenhouse ERP</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="role-banner">
        <span className="role-emoji">{meta.emoji}</span>
        <span className="role-label">{meta.label}</span>
      </div>

      {/* Nav Items */}
      <nav className="sidebar-nav">
        <p className="nav-label">MENU</p>
        {navItems.map(({ to, icon: Icon, label }) => {
          // Query-param links (e.g. /staff?role=project_manager) need manual active detection
          const hasQuery = to.includes('?');
          if (hasQuery) {
            const [, qs] = to.split('?');
            return (
              <NavLink
                key={to + label}
                to={to}
                className={() => {
                  const isRoleMatch = window.location.search.includes(qs);
                  return `nav-item ${isRoleMatch ? 'active' : ''}`;
                }}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={to + label}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
              {to === '/notifications' && unreadCount > 0 && (
                <span className="notif-badge-pill">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="sidebar-user">
        <div className="user-avatar">{(user.first_name?.[0] ?? 'U').toUpperCase()}</div>
        <div className="user-info">
          <p className="user-name">{user.first_name ?? 'User'}</p>
          <p className="user-role">{meta.label}</p>
        </div>
      </div>

      {/* Footer — Settings only for admin/owner */}
      <div className="sidebar-footer">
        {SETTINGS_ROLES.has(user.role) && (
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        )}
        <button onClick={handleLogout} className="nav-item logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
