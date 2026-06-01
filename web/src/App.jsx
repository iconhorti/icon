import React, { Suspense } from 'react';

// ─── Error boundary — catches ChunkLoadError during rolling deploys ───────────
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('[ICON] Unhandled render error:', err); }
  render() {
    if (this.state.hasError) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:'1rem', color:'var(--color-text-main)' }}>
        <div style={{ fontSize:'2.5rem' }}>⚠️</div>
        <h2 style={{ margin:0 }}>Something went wrong</h2>
        <p style={{ color:'var(--color-text-muted)', maxWidth:360, textAlign:'center' }}>
          The page failed to load — this can happen during an update. Please refresh.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
    return this.props.children;
  }
}
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

// ─── Lazy loaded pages ────────────────────────────────────────────────────────
const Dashboard             = React.lazy(() => import('./pages/Dashboard'));
const ProjectList           = React.lazy(() => import('./pages/ProjectList'));
const ProjectDetail         = React.lazy(() => import('./pages/ProjectDetail'));
const ProjectForm           = React.lazy(() => import('./pages/ProjectForm'));
const FarmerManagement      = React.lazy(() => import('./pages/FarmerManagement'));
const FarmerForm            = React.lazy(() => import('./pages/FarmerForm'));
const Reports               = React.lazy(() => import('./pages/Reports'));
const Notifications         = React.lazy(() => import('./pages/Notifications'));
const Settings              = React.lazy(() => import('./pages/Settings'));
const UserManagement        = React.lazy(() => import('./pages/UserManagement'));
const Documents             = React.lazy(() => import('./pages/Documents'));
const DealersManagement     = React.lazy(() => import('./pages/DealersManagement'));
const ContractorsManagement = React.lazy(() => import('./pages/ContractorsManagement'));
const AgronomistsManagement = React.lazy(() => import('./pages/AgronomistsManagement'));
const OfficeStaff           = React.lazy(() => import('./pages/OfficeStaff'));
const Masters               = React.lazy(() => import('./pages/Masters'));

// ─── Role-gated route ─────────────────────────────────────────────────────────
const ProtectedRoute = ({ element, allowedRoles }) => {
  const { user } = useAuth();
  if (!user?.role) return <Navigate to="/login" replace />;
  return allowedRoles.includes(user.role) ? element : <Navigate to="/" replace />;
};

// ─── Role sets (mirrors sidebar access rules) ─────────────────────────────────
const ADMIN_ONLY         = ['admin'];
const ADMIN_OWNER        = ['admin', 'owner'];
const INTERNAL_STAFF     = ['admin', 'owner', 'office_staff'];
const EXTENDED_STAFF     = ['admin', 'owner', 'office_staff', 'project_manager'];
const FARMER_CREATE_ROLES = ['admin', 'owner', 'office_staff', 'dealer'];
const FARMER_VIEW_ROLES  = ['admin', 'owner', 'office_staff', 'project_manager', 'dealer'];
const PROJECT_CREATE_ROLES = ['admin', 'owner', 'office_staff', 'dealer'];
const PROJECT_EDIT_ROLES = ['admin', 'owner', 'office_staff'];
const REPORTS_ROLES      = ['admin', 'owner', 'office_staff', 'project_manager', 'bank_officer', 'agency_officer', 'agronomist'];
const DOCUMENTS_ROLES    = ['admin', 'owner', 'office_staff', 'project_manager', 'bank_officer', 'agency_officer', 'agronomist', 'farmer'];
// Project list + detail: all staff + contractor roles (backend already filters by role).
// Farmer role is excluded — they view their single project via the Dashboard.
const PROJECT_VIEW_ROLES = ['admin', 'owner', 'office_staff', 'project_manager',
                            'bank_officer', 'agency_officer', 'agronomist', 'dealer',
                            'structure_contractor', 'drip_contractor', 'bed_contractor', 'plantation_contractor'];

const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-primary)' }}>
    Loading...
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              {/* Dashboard — all authenticated users */}
              <Route index element={<Dashboard />} />

              {/* Projects — role-gated (backend also filters; farmer excluded from list) */}
              <Route path="projects"          element={<ProtectedRoute element={<ProjectList />}  allowedRoles={PROJECT_VIEW_ROLES}   />} />
              <Route path="projects/new"      element={<ProtectedRoute element={<ProjectForm />}  allowedRoles={PROJECT_CREATE_ROLES} />} />
              <Route path="projects/:id/edit" element={<ProtectedRoute element={<ProjectForm />}  allowedRoles={PROJECT_EDIT_ROLES}   />} />
              <Route path="projects/:id"      element={<ProtectedRoute element={<ProjectDetail />} allowedRoles={PROJECT_VIEW_ROLES}  />} />

              {/* Farmers */}
              <Route path="farmers"           element={<ProtectedRoute element={<FarmerManagement />} allowedRoles={FARMER_VIEW_ROLES}   />} />
              <Route path="farmers/new"       element={<ProtectedRoute element={<FarmerForm />}       allowedRoles={FARMER_CREATE_ROLES} />} />
              <Route path="farmers/:id/edit"  element={<ProtectedRoute element={<FarmerForm />}       allowedRoles={FARMER_CREATE_ROLES} />} />

              {/* People management */}
              <Route path="dealers"      element={<ProtectedRoute element={<DealersManagement />}    allowedRoles={INTERNAL_STAFF}  />} />
              <Route path="contractors"  element={<ProtectedRoute element={<ContractorsManagement />} allowedRoles={EXTENDED_STAFF} />} />
              <Route path="agronomists"  element={<ProtectedRoute element={<AgronomistsManagement />} allowedRoles={INTERNAL_STAFF} />} />
              <Route path="staff"        element={<ProtectedRoute element={<OfficeStaff />}           allowedRoles={INTERNAL_STAFF} />} />
              <Route path="users"        element={<ProtectedRoute element={<UserManagement />}        allowedRoles={ADMIN_ONLY}     />} />

              {/* Reference data — admin & owner only */}
              <Route path="masters"  element={<ProtectedRoute element={<Masters />}  allowedRoles={ADMIN_OWNER} />} />

              {/* System settings — admin & owner only */}
              <Route path="settings" element={<ProtectedRoute element={<Settings />} allowedRoles={ADMIN_OWNER} />} />

              {/* Reports & Documents */}
              <Route path="reports"   element={<ProtectedRoute element={<Reports />}   allowedRoles={REPORTS_ROLES}   />} />
              <Route path="documents" element={<ProtectedRoute element={<Documents />} allowedRoles={DOCUMENTS_ROLES} />} />

              {/* Notifications — all authenticated users */}
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
