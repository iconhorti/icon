/**
 * ICON APP — Role-based Dashboard Router
 *
 * Role → Dashboard mapping:
 *   admin / owner         → AdminDashboard        (full system overview: financials, staff, regional)
 *   office_staff          → OfficeStaffDashboard  (pipeline, DPR queue, onboarding, quick actions)
 *   dealer                → DealerDashboard       (portfolio + farmers + commission)
 *   farmer                → FarmerDashboard       (project tracker)
 *   project_manager       → ManagerDashboard      (PM panel)
 *   bank_officer          → ManagerDashboard      (Bank panel)
 *   agency_officer        → ManagerDashboard      (Agency/inspection panel)
 *   agronomist            → ManagerDashboard      (Crop advisory panel)
 *   structure/drip/bed/plantation _contractor
 *                         → ManagerDashboard      (Contractor panel)
 *   <unrecognised>        → AccessDenied          (never exposes admin data)
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { getProjectStats } from '../api/client';
import AdminDashboard        from '../components/dashboards/AdminDashboard';
import OfficeStaffDashboard  from '../components/dashboards/OfficeStaffDashboard';
import DealerDashboard       from '../components/dashboards/DealerDashboard';
import FarmerDashboard       from '../components/dashboards/FarmerDashboard';
import ManagerDashboard      from '../components/dashboards/ManagerDashboard';
import './Dashboard.css';

// Roles that see the full Admin view (financial portfolio, all staff, regional data)
const PURE_ADMIN_ROLES = new Set(['admin', 'owner']);

// Roles that use ManagerDashboard (each gets its own panel inside)
const MANAGER_ROLES = new Set([
  'project_manager',
  'bank_officer',
  'agency_officer',
  'agronomist',
  'structure_contractor',
  'drip_contractor',
  'bed_contractor',
  'plantation_contractor',
]);

const Dashboard = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Use the reactive AuthContext — never read localStorage directly in components
  const { user } = useAuth();

  useEffect(() => {
    // Don't fetch if not logged in — Layout will redirect
    if (!user) return;
    (async () => {
      try {
        const data = await getProjectStats();
        setStats(data);
      } catch (err) {
        setError('Could not connect to the backend. Please check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Loading your dashboard…</p>
    </div>
  );

  const props = { stats, error, user };

  if (PURE_ADMIN_ROLES.has(user.role))  return <AdminDashboard       {...props} />;
  if (user.role === 'office_staff')     return <OfficeStaffDashboard  {...props} />;
  if (user.role === 'dealer')           return <DealerDashboard       {...props} />;
  if (user.role === 'farmer')           return <FarmerDashboard       {...props} />;
  if (MANAGER_ROLES.has(user.role))     return <ManagerDashboard      {...props} />;

  // Fallback — unknown role gets an access-denied screen, NOT admin data
  return (
    <div className="loading-state" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>🔒</div>
      <h2 style={{ color: 'var(--color-text-main)', margin: 0 }}>Access Denied</h2>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 360, textAlign: 'center' }}>
        Your account role <strong>"{user.role || 'unknown'}"</strong> does not have a dashboard
        assigned. Please contact your administrator.
      </p>
    </div>
  );
};

export default Dashboard;
