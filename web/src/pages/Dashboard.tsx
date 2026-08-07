/**
 * ICON APP — Role-based Dashboard Router
 *
 * Role → Dashboard mapping (see lib/roles.ts ROLE_SETS):
 *   admin / owner         → AdminDashboard
 *   office_staff          → OfficeStaffDashboard
 *   dealer                → DealerDashboard
 *   farmer                → FarmerDashboard
 *   project_manager (+ bank/agency/agro/contractors) → ManagerDashboard
 *   <unrecognised>        → AccessDenied
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole, ROLE_SETS, ROLES } from '../lib/roles';
import { useRoleDashboard } from '../hooks/useRoleDashboard';
import AdminDashboard        from '../components/dashboards/AdminDashboard';
import OfficeStaffDashboard  from '../components/dashboards/OfficeStaffDashboard';
import DealerDashboard       from '../components/dashboards/DealerDashboard';
import FarmerDashboard       from '../components/dashboards/FarmerDashboard';
import ManagerDashboard      from '../components/dashboards/ManagerDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, roleKpis, loading, error, kpisLoading } = useRoleDashboard(user?.role);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  const props = { stats, error, user, roleKpis, kpisLoading };

  if (hasRole(user.role, ROLE_SETS.DASHBOARD_ADMIN)) {
    return <AdminDashboard {...props} />;
  }
  if (user.role === ROLES.OFFICE_STAFF) {
    return <OfficeStaffDashboard {...props} />;
  }
  if (user.role === ROLES.DEALER) {
    return <DealerDashboard {...props} />;
  }
  if (user.role === ROLES.FARMER) {
    return <FarmerDashboard {...props} />;
  }
  if (hasRole(user.role, ROLE_SETS.DASHBOARD_MANAGER)) {
    return <ManagerDashboard {...props} />;
  }

  return (
    <div className="loading-state" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>🔒</div>
      <h2 style={{ color: 'var(--color-text-main)', margin: 0 }}>Access Denied</h2>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 360, textAlign: 'center' }}>
        Your account role <strong>&quot;{user.role || 'unknown'}&quot;</strong> does not have a dashboard
        assigned. Please contact your administrator.
      </p>
    </div>
  );
};

export default Dashboard;
