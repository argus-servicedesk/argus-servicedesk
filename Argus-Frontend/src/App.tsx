import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import Layout from './components/Layout/Layout';
import LoginPage from './components/Auth/LoginPage';
const SignupPage = lazy(() => import('./components/Auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./components/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/Auth/ResetPasswordPage'));
const ChangePasswordRequiredPage = lazy(() => import('./components/Auth/ChangePasswordRequiredPage'));
const KeycloakCallbackPage = lazy(() => import('./components/Auth/KeycloakCallbackPage'));
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./components/Dashboard/DashboardOverview'));
const IncidentList = lazy(() => import('./components/Incidents/IncidentList'));
const IncidentCreate = lazy(() => import('./components/Incidents/IncidentCreate'));
const IncidentDetail = lazy(() => import('./components/Incidents/IncidentDetail'));
const ChangeList = lazy(() => import('./components/Changes/ChangeList'));
const ChangeCreate = lazy(() => import('./components/Changes/ChangeCreate'));
const ChangeDetail = lazy(() => import('./components/Changes/ChangeDetail'));
const ProblemList = lazy(() => import('./components/Problems/ProblemList'));
const ProblemCreate = lazy(() => import('./components/Problems/ProblemCreate'));
const ProblemDetail = lazy(() => import('./components/Problems/ProblemDetail'));
const AlertList = lazy(() => import('./components/Alerts/AlertList'));
const AlertDetail = lazy(() => import('./components/Alerts/AlertDetail'));
const IntegrationHub = lazy(() => import('./components/Integrations/IntegrationHub'));
const TeamList = lazy(() => import('./components/Teams/TeamList'));
const ReportsDashboard = lazy(() => import('./components/Reports/ReportsDashboard'));
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage'));
const SMSDashboard = lazy(() => import('./components/SMS/SMSDashboard'));
const VoiceDashboard = lazy(() => import('./components/Voice/VoiceDashboard'));
const NetworkTopology = lazy(() => import('./components/Network/NetworkTopology'));
const MetricsDashboard = lazy(() => import('./components/Metrics/MetricsDashboard'));
const AIInsightsDashboard = lazy(() => import('./components/AI/AIInsightsDashboard'));
const AutomationDashboard = lazy(() => import('./components/Automation/AutomationDashboard'));
const UserList = lazy(() => import('./components/Users/UserList'));
const OnCallDashboard = lazy(() => import('./components/OnCall/OnCallDashboard'));
const OnCallCalendar = lazy(() => import('./components/OnCall/OnCallCalendar'));
const NOCView = lazy(() => import('./components/NOC/NOCView'));
const EscalationPolicyBuilder = lazy(() => import('./components/Escalation/EscalationPolicyBuilder'));
const MaintenanceWindowScheduler = lazy(() => import('./components/Maintenance/MaintenanceWindowScheduler'));
const NotFound = lazy(() => import('./components/NotFound'));
const K8sClusterDashboard = lazy(() => import('./components/K8s/K8sClusterDashboard'));
const PagerDutyDashboard = lazy(() => import('./components/Integrations/PagerDutyDashboard'));
const APMDashboard = lazy(() => import('./components/APM/APMDashboard'));
const DeveloperDocs = lazy(() => import('./components/Docs/DeveloperDocs'));
const StatusPage = lazy(() => import('./components/Status/StatusPage'));
const LogExplorer = lazy(() => import('./components/Logs/LogExplorer'));
const ChangeCalendar = lazy(() => import('./components/Changes/ChangeCalendar'));
const KnowledgeBasePage = lazy(() => import('./components/KnowledgeBase/KnowledgeBasePage'));
const SLAPolicyPage = lazy(() => import('./components/SLA/SLAPolicyPage'));
const AuditLogPage = lazy(() => import('./components/Audit/AuditLogPage'));
const AuditLogViewer = lazy(() => import('./components/Audit/AuditLogViewer'));
const MFASetup = lazy(() => import('./components/Settings/MFASetup'));
const ProfilePage = lazy(() => import('./components/Profile/ProfilePage'));
const LandingPage = lazy(() => import('./components/Landing/LandingPage'));
const NotificationCenter = lazy(() => import('./components/Notifications/NotificationCenter'));
const BODEODDashboard = lazy(() => import('./components/BOD/BODEODDashboard'));
const DomainDashboard = lazy(() => import('./components/Domain/DomainDashboard'));
const EODDashboard = lazy(() => import('./components/EOD/EODDashboard'));
const OMSDashboard = lazy(() => import('./components/OMS/OMSDashboard'));
const SiteManagement = lazy(() => import('./components/Settings/SiteManagement'));
const ILLBandwidthDashboard = lazy(() => import('./components/ILLBandwidth/ILLBandwidthDashboard'));
const CatalogList = lazy(() => import('./components/Catalog/CatalogList'));
const CatalogItemCreate = lazy(() => import('./components/Catalog/CatalogItemCreate'));
const CatalogItemDetail = lazy(() => import('./components/Catalog/CatalogItemDetail'));
const ServiceRequestList = lazy(() => import('./components/ServiceRequests/ServiceRequestList'));
const ServiceRequestCreate = lazy(() => import('./components/ServiceRequests/ServiceRequestCreate'));
const ServiceRequestDetail = lazy(() => import('./components/ServiceRequests/ServiceRequestDetail'));
const KBArticleList = lazy(() => import('./components/KnowledgeBase/KBArticleList'));
const KBArticleCreate = lazy(() => import('./components/KnowledgeBase/KBArticleCreate'));
const KBArticleDetail = lazy(() => import('./components/KnowledgeBase/KBArticleDetail'));
const LearningHub = lazy(() => import('./components/Learning/LearningHub'));
const RoleManagement = lazy(() => import('./components/Admin/RoleManagement'));
const ClientManagement = lazy(() => import('./components/Admin/ClientManagement'));
const ApprovalCenter = lazy(() => import('./components/Auth/ApprovalCenter'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-signal/30 border-t-signal rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-mono">Loading module...</span>
      </div>
    </div>
  );
}

function HomeRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<div style={{ background: '#09090b', minHeight: '100vh' }} />}><LandingPage /></Suspense>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated) {
      checkAuth();
    }
  }, [checkAuth, hasHydrated]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/keycloak/callback" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><KeycloakCallbackPage /></Suspense>} />
      <Route path="/signup" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><SignupPage /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><ResetPasswordPage /></Suspense>} />
      <Route path="/change-password" element={<ProtectedRoute><Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><ChangePasswordRequiredPage /></Suspense></ProtectedRoute>} />
      <Route path="/docs" element={<Suspense fallback={<div style={{ background: '#f8fafc', minHeight: '100vh' }} />}><DeveloperDocs /></Suspense>} />
      <Route path="/status/:orgSlug" element={<Suspense fallback={<div style={{ background: '#f8fafc', minHeight: '100vh' }} />}><StatusPage /></Suspense>} />

      {/* Protected app routes */}
      <Route element={<ErrorBoundary><ProtectedRoute><Layout /></ProtectedRoute></ErrorBoundary>}>
        <Route path="/dashboard" element={<Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>} />
        <Route path="/incidents" element={<Suspense fallback={<LoadingFallback />}><IncidentList /></Suspense>} />
        <Route path="/incidents/create" element={<Suspense fallback={<LoadingFallback />}><IncidentCreate /></Suspense>} />
        <Route path="/incidents/:id" element={<Suspense fallback={<LoadingFallback />}><IncidentDetail /></Suspense>} />
        <Route path="/changes" element={<Suspense fallback={<LoadingFallback />}><ChangeList /></Suspense>} />
        <Route path="/changes/calendar" element={<Suspense fallback={<LoadingFallback />}><ChangeCalendar /></Suspense>} />
        <Route path="/changes/create" element={<Suspense fallback={<LoadingFallback />}><ChangeCreate /></Suspense>} />
        <Route path="/changes/:id" element={<Suspense fallback={<LoadingFallback />}><ChangeDetail /></Suspense>} />
        <Route path="/problems" element={<Suspense fallback={<LoadingFallback />}><ProblemList /></Suspense>} />
        <Route path="/problems/create" element={<Suspense fallback={<LoadingFallback />}><ProblemCreate /></Suspense>} />
        <Route path="/problems/:id" element={<Suspense fallback={<LoadingFallback />}><ProblemDetail /></Suspense>} />
        <Route path="/oncall" element={<Suspense fallback={<LoadingFallback />}><OnCallDashboard /></Suspense>} />
        <Route path="/oncall-calendar" element={<Suspense fallback={<LoadingFallback />}><OnCallCalendar /></Suspense>} />
        <Route path="/escalation" element={<Suspense fallback={<LoadingFallback />}><EscalationPolicyBuilder /></Suspense>} />
        <Route path="/escalations" element={<Suspense fallback={<LoadingFallback />}><EscalationPolicyBuilder /></Suspense>} />
        <Route path="/maintenance" element={<Suspense fallback={<LoadingFallback />}><MaintenanceWindowScheduler /></Suspense>} />
        <Route path="/noc" element={<Suspense fallback={<LoadingFallback />}><NOCView /></Suspense>} />
        <Route path="/alerts" element={<Suspense fallback={<LoadingFallback />}><AlertList /></Suspense>} />
        <Route path="/alerts/:id" element={<Suspense fallback={<LoadingFallback />}><AlertDetail /></Suspense>} />
        <Route path="/network" element={<Suspense fallback={<LoadingFallback />}><NetworkTopology /></Suspense>} />
        <Route path="/metrics" element={<Suspense fallback={<LoadingFallback />}><MetricsDashboard /></Suspense>} />
        <Route path="/ai-insights" element={<Suspense fallback={<LoadingFallback />}><AIInsightsDashboard /></Suspense>} />
        <Route path="/aiops" element={<Suspense fallback={<LoadingFallback />}><AIInsightsDashboard /></Suspense>} />
        <Route path="/automation" element={<Suspense fallback={<LoadingFallback />}><AutomationDashboard /></Suspense>} />
        <Route path="/runbooks" element={<Suspense fallback={<LoadingFallback />}><AutomationDashboard /></Suspense>} />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR']}>
            <Suspense fallback={<LoadingFallback />}><UserList /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/roles" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Suspense fallback={<LoadingFallback />}><RoleManagement /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/approvals" element={
          <Suspense fallback={<LoadingFallback />}><ApprovalCenter /></Suspense>
        } />
        <Route path="/integrations" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Suspense fallback={<LoadingFallback />}><IntegrationHub /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/teams" element={<Suspense fallback={<LoadingFallback />}><TeamList /></Suspense>} />
        <Route path="/clients" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR']}>
            <Suspense fallback={<LoadingFallback />}><ClientManagement /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={<Suspense fallback={<LoadingFallback />}><ReportsDashboard /></Suspense>} />
        <Route path="/sms" element={<Suspense fallback={<LoadingFallback />}><SMSDashboard /></Suspense>} />
        <Route path="/voice" element={<Suspense fallback={<LoadingFallback />}><VoiceDashboard /></Suspense>} />
        <Route path="/k8s" element={<Suspense fallback={<LoadingFallback />}><K8sClusterDashboard /></Suspense>} />
        <Route path="/logs" element={<Suspense fallback={<LoadingFallback />}><LogExplorer /></Suspense>} />
        <Route path="/pagerduty" element={<Suspense fallback={<LoadingFallback />}><PagerDutyDashboard /></Suspense>} />
        <Route path="/apm" element={<Suspense fallback={<LoadingFallback />}><APMDashboard /></Suspense>} />
        <Route path="/bod-eod" element={<Suspense fallback={<LoadingFallback />}><BODEODDashboard /></Suspense>} />
        <Route path="/domain" element={<Suspense fallback={<LoadingFallback />}><DomainDashboard /></Suspense>} />
        <Route path="/eod" element={<Suspense fallback={<LoadingFallback />}><EODDashboard /></Suspense>} />
        <Route path="/oms" element={<Suspense fallback={<LoadingFallback />}><OMSDashboard /></Suspense>} />
        <Route path="/ill-bandwidth" element={<Suspense fallback={<LoadingFallback />}><ILLBandwidthDashboard /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<LoadingFallback />}><SettingsPage /></Suspense>} />
        <Route path="/settings/mfa" element={<Suspense fallback={<LoadingFallback />}><MFASetup /></Suspense>} />
        <Route path="/settings/sites" element={<Suspense fallback={<LoadingFallback />}><SiteManagement /></Suspense>} />
        <Route path="/knowledge-base" element={<Suspense fallback={<LoadingFallback />}><KnowledgeBasePage /></Suspense>} />
        {/* ── Service Catalog ── */}
        <Route path="/catalog" element={<Suspense fallback={<LoadingFallback />}><CatalogList /></Suspense>} />
        <Route path="/catalog/create" element={<Suspense fallback={<LoadingFallback />}><CatalogItemCreate /></Suspense>} />
        <Route path="/catalog/:id" element={<Suspense fallback={<LoadingFallback />}><CatalogItemDetail /></Suspense>} />
        <Route path="/service-requests" element={<Suspense fallback={<LoadingFallback />}><ServiceRequestList /></Suspense>} />
        <Route path="/service-requests/create" element={<Suspense fallback={<LoadingFallback />}><ServiceRequestCreate /></Suspense>} />
        <Route path="/service-requests/:id" element={<Suspense fallback={<LoadingFallback />}><ServiceRequestDetail /></Suspense>} />
        <Route path="/learning" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR', 'ENGINEER']}>
            <Suspense fallback={<LoadingFallback />}><LearningHub /></Suspense>
          </ProtectedRoute>
        } />
        {/* ── Knowledge Base (new) ── */}
        <Route path="/kb" element={<Suspense fallback={<LoadingFallback />}><KBArticleList /></Suspense>} />
        <Route path="/kb/create" element={<Suspense fallback={<LoadingFallback />}><KBArticleCreate /></Suspense>} />
        <Route path="/kb/:id" element={<Suspense fallback={<LoadingFallback />}><KBArticleDetail /></Suspense>} />
        <Route path="/sla" element={<Suspense fallback={<LoadingFallback />}><SLAPolicyPage /></Suspense>} />
        <Route path="/sla-policies" element={<Suspense fallback={<LoadingFallback />}><SLAPolicyPage /></Suspense>} />
        <Route path="/audit" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <Suspense fallback={<LoadingFallback />}><AuditLogViewer /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={<Suspense fallback={<LoadingFallback />}><NotificationCenter /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<LoadingFallback />}><NotFound /></Suspense>} />
      </Route>

      {/* Legacy portal URLs now land in the main app shell. */}
      <Route path="/portal" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
      <Route path="/portal/catalog" element={<ProtectedRoute><Navigate to="/catalog" replace /></ProtectedRoute>} />
      <Route path="/portal/report-issue" element={<ProtectedRoute><Navigate to="/incidents/create" replace /></ProtectedRoute>} />
      <Route path="/portal/knowledge-base" element={<ProtectedRoute><Navigate to="/kb" replace /></ProtectedRoute>} />
      <Route path="/portal/knowledge-base/:id" element={<ProtectedRoute><Navigate to="/kb" replace /></ProtectedRoute>} />
      <Route path="/portal/my-requests" element={<ProtectedRoute><Navigate to="/incidents" replace /></ProtectedRoute>} />
    </Routes>
  );
}
