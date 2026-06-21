import React, { Suspense, type ReactNode } from 'react';

// ─── Error boundary — catches ChunkLoadError during rolling deploys ───────────
interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.error('[ICON] Unhandled render error:', err); }
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
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import { RequireRole } from './components/RequireRole';
import { ROLE_SETS, type Role } from './lib/roles';

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

// ─── Role-gated route — thin alias over the shared <RequireRole> guard ─────────
const ProtectedRoute = ({ element, allowedRoles }: { element: ReactNode; allowedRoles: readonly Role[] }) => (
  <RequireRole allowed={allowedRoles}>{element}</RequireRole>
);

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
              <Route path="projects"          element={<ProtectedRoute element={<ProjectList />}  allowedRoles={ROLE_SETS.PROJECT_VIEW}   />} />
              <Route path="projects/new"      element={<ProtectedRoute element={<ProjectForm />}  allowedRoles={ROLE_SETS.PROJECT_CREATE} />} />
              <Route path="projects/:id/edit" element={<ProtectedRoute element={<ProjectForm />}  allowedRoles={ROLE_SETS.PROJECT_EDIT}   />} />
              <Route path="projects/:id"      element={<ProtectedRoute element={<ProjectDetail />} allowedRoles={ROLE_SETS.PROJECT_VIEW}  />} />

              {/* Farmers */}
              <Route path="farmers"           element={<ProtectedRoute element={<FarmerManagement />} allowedRoles={ROLE_SETS.FARMER_VIEW}   />} />
              <Route path="farmers/new"       element={<ProtectedRoute element={<FarmerForm />}       allowedRoles={ROLE_SETS.FARMER_CREATE} />} />
              <Route path="farmers/:id/edit"  element={<ProtectedRoute element={<FarmerForm />}       allowedRoles={ROLE_SETS.FARMER_CREATE} />} />

              {/* People management */}
              <Route path="dealers"      element={<ProtectedRoute element={<DealersManagement />}    allowedRoles={ROLE_SETS.INTERNAL_STAFF}  />} />
              <Route path="contractors"  element={<ProtectedRoute element={<ContractorsManagement />} allowedRoles={ROLE_SETS.EXTENDED_STAFF} />} />
              <Route path="agronomists"  element={<ProtectedRoute element={<AgronomistsManagement />} allowedRoles={ROLE_SETS.INTERNAL_STAFF} />} />
              <Route path="staff"        element={<ProtectedRoute element={<OfficeStaff />}           allowedRoles={ROLE_SETS.INTERNAL_STAFF} />} />
              <Route path="users"        element={<ProtectedRoute element={<UserManagement />}        allowedRoles={ROLE_SETS.ADMIN_ONLY}     />} />

              {/* Reference data — admin & owner only */}
              <Route path="masters"  element={<ProtectedRoute element={<Masters />}  allowedRoles={ROLE_SETS.ADMIN_OWNER} />} />

              {/* System settings — admin & owner only */}
              <Route path="settings" element={<ProtectedRoute element={<Settings />} allowedRoles={ROLE_SETS.ADMIN_OWNER} />} />

              {/* Reports & Documents */}
              <Route path="reports"   element={<ProtectedRoute element={<Reports />}   allowedRoles={ROLE_SETS.REPORTS}   />} />
              <Route path="documents" element={<ProtectedRoute element={<Documents />} allowedRoles={ROLE_SETS.DOCUMENTS} />} />

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
