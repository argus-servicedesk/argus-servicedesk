import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import Layout from './components/Layout/Layout';
import LoginPage from './components/Auth/LoginPage';
const SignupPage = lazy(() => import('./components/Auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./components/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/Auth/ResetPasswordPage'));
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
const AssetDashboard = lazy(() => import('./components/Assets/AssetDashboard'));
const AssetCreate = lazy(() => import('./components/Assets/AssetCreate'));
const AssetDetail = lazy(() => import('./components/Assets/AssetDetail'));
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
const ServerList = lazy(() => import('./components/Inventory/ServerList'));
const VMList = lazy(() => import('./components/Inventory/VMList'));
const NetworkDeviceList = lazy(() => import('./components/Inventory/NetworkDeviceList'));
const FirewallList = lazy(() => import('./components/Inventory/FirewallList'));
const SwitchList = lazy(() => import('./components/Inventory/SwitchList'));
const RouterList = lazy(() => import('./components/Inventory/RouterList'));
const DatabaseList = lazy(() => import('./components/Inventory/DatabaseList'));
const ApplicationList = lazy(() => import('./components/Inventory/ApplicationList'));
const K8sClusterList = lazy(() => import('./components/Inventory/K8sClusterList'));
const StorageList = lazy(() => import('./components/Inventory/StorageList'));
const ContainerList = lazy(() => import('./components/Inventory/ContainerList'));
const LoadBalancerList = lazy(() => import('./components/Inventory/LoadBalancerList'));
const ComputerList = lazy(() => import('./components/Inventory/ComputerList'));
const UPSList = lazy(() => import('./components/Inventory/UPSList'));
const MonitorList = lazy(() => import('./components/Inventory/MonitorList'));
const PhoneList = lazy(() => import('./components/Inventory/PhoneList'));
const PrinterList = lazy(() => import('./components/Inventory/PrinterList'));
const RackInfraList = lazy(() => import('./components/Inventory/RackInfraList'));
const PeripheralList = lazy(() => import('./components/Inventory/PeripheralList'));
const SoftwareList = lazy(() => import('./components/Inventory/SoftwareList'));
const SoftwareDetail = lazy(() => import('./components/Inventory/SoftwareDetail'));
const HardwareMonitoring = lazy(() => import('./components/Hardware/HardwareMonitoring'));
const NotificationCenter = lazy(() => import('./components/Notifications/NotificationCenter'));
const BODEODDashboard = lazy(() => import('./components/BOD/BODEODDashboard'));
const SiteManagement = lazy(() => import('./components/Settings/SiteManagement'));
const ILLBandwidthDashboard = lazy(() => import('./components/ILLBandwidth/ILLBandwidthDashboard'));
const CatalogList = lazy(() => import('./components/Catalog/CatalogList'));
const CatalogItemCreate = lazy(() => import('./components/Catalog/CatalogItemCreate'));
const CatalogItemDetail = lazy(() => import('./components/Catalog/CatalogItemDetail'));
const ServiceRequestList = lazy(() => import('./components/ServiceRequests/ServiceRequestList'));
const ServiceRequestDetail = lazy(() => import('./components/ServiceRequests/ServiceRequestDetail'));
const KBArticleList = lazy(() => import('./components/KnowledgeBase/KBArticleList'));
const KBArticleCreate = lazy(() => import('./components/KnowledgeBase/KBArticleCreate'));
const KBArticleDetail = lazy(() => import('./components/KnowledgeBase/KBArticleDetail'));
const PortalLayout = lazy(() => import('./components/Portal/PortalLayout'));
const PortalHome = lazy(() => import('./components/Portal/PortalHome'));
const PortalCatalog = lazy(() => import('./components/Portal/PortalCatalog'));
const PortalIncidentCreate = lazy(() => import('./components/Portal/PortalIncidentCreate'));
const PortalKnowledgeBase = lazy(() => import('./components/Portal/PortalKnowledgeBase'));
const PortalArticleView = lazy(() => import('./components/Portal/PortalArticleView'));
const PortalMyRequests = lazy(() => import('./components/Portal/PortalMyRequests'));
const VendorList = lazy(() => import('./components/Vendors/VendorList'));

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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><SignupPage /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<div style={{ background: '#fff', minHeight: '100vh' }} />}><ResetPasswordPage /></Suspense>} />
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
        <Route path="/maintenance" element={<Suspense fallback={<LoadingFallback />}><MaintenanceWindowScheduler /></Suspense>} />
        <Route path="/noc" element={<Suspense fallback={<LoadingFallback />}><NOCView /></Suspense>} />
        <Route path="/alerts" element={<Suspense fallback={<LoadingFallback />}><AlertList /></Suspense>} />
        <Route path="/alerts/:id" element={<Suspense fallback={<LoadingFallback />}><AlertDetail /></Suspense>} />
        <Route path="/assets" element={<Suspense fallback={<LoadingFallback />}><AssetDashboard /></Suspense>} />
        <Route path="/assets/create" element={<Suspense fallback={<LoadingFallback />}><AssetCreate /></Suspense>} />
        <Route path="/assets/:id" element={<Suspense fallback={<LoadingFallback />}><AssetDetail /></Suspense>} />
        <Route path="/hardware" element={<Suspense fallback={<LoadingFallback />}><HardwareMonitoring /></Suspense>} />
        {/* ── Inventory: Compute ── */}
        <Route path="/inventory/servers" element={<Suspense fallback={<LoadingFallback />}><ServerList /></Suspense>} />
        <Route path="/inventory/virtual-machines" element={<Suspense fallback={<LoadingFallback />}><VMList /></Suspense>} />
        <Route path="/inventory/kubernetes" element={<Suspense fallback={<LoadingFallback />}><K8sClusterList /></Suspense>} />
        <Route path="/inventory/containers" element={<Suspense fallback={<LoadingFallback />}><ContainerList /></Suspense>} />
        {/* ── Inventory: Network ── */}
        <Route path="/inventory/network-devices" element={<Suspense fallback={<LoadingFallback />}><NetworkDeviceList /></Suspense>} />
        <Route path="/inventory/firewalls" element={<Suspense fallback={<LoadingFallback />}><FirewallList /></Suspense>} />
        <Route path="/inventory/switches" element={<Suspense fallback={<LoadingFallback />}><SwitchList /></Suspense>} />
        <Route path="/inventory/routers" element={<Suspense fallback={<LoadingFallback />}><RouterList /></Suspense>} />
        <Route path="/inventory/load-balancers" element={<Suspense fallback={<LoadingFallback />}><LoadBalancerList /></Suspense>} />
        {/* ── Inventory: Data & Apps ── */}
        <Route path="/inventory/databases" element={<Suspense fallback={<LoadingFallback />}><DatabaseList /></Suspense>} />
        <Route path="/inventory/applications" element={<Suspense fallback={<LoadingFallback />}><ApplicationList /></Suspense>} />
        <Route path="/inventory/storage" element={<Suspense fallback={<LoadingFallback />}><StorageList /></Suspense>} />
        {/* ── Inventory: End-user & Peripherals ── */}
        <Route path="/inventory/computers" element={<Suspense fallback={<LoadingFallback />}><ComputerList /></Suspense>} />
        <Route path="/inventory/monitors" element={<Suspense fallback={<LoadingFallback />}><MonitorList /></Suspense>} />
        <Route path="/inventory/phones" element={<Suspense fallback={<LoadingFallback />}><PhoneList /></Suspense>} />
        <Route path="/inventory/printers" element={<Suspense fallback={<LoadingFallback />}><PrinterList /></Suspense>} />
        <Route path="/inventory/peripherals" element={<Suspense fallback={<LoadingFallback />}><PeripheralList /></Suspense>} />
        {/* ── Inventory: Power & Rack ── */}
        <Route path="/inventory/ups" element={<Suspense fallback={<LoadingFallback />}><UPSList /></Suspense>} />
        <Route path="/inventory/rack-infrastructure" element={<Suspense fallback={<LoadingFallback />}><RackInfraList /></Suspense>} />
        {/* ── Inventory: Software ── */}
        <Route path="/inventory/software" element={<Suspense fallback={<LoadingFallback />}><SoftwareList /></Suspense>} />
        <Route path="/inventory/software/:id" element={<Suspense fallback={<LoadingFallback />}><SoftwareDetail /></Suspense>} />
        <Route path="/network" element={<Suspense fallback={<LoadingFallback />}><NetworkTopology /></Suspense>} />
        <Route path="/metrics" element={<Suspense fallback={<LoadingFallback />}><MetricsDashboard /></Suspense>} />
        <Route path="/ai-insights" element={<Suspense fallback={<LoadingFallback />}><AIInsightsDashboard /></Suspense>} />
        <Route path="/automation" element={<Suspense fallback={<LoadingFallback />}><AutomationDashboard /></Suspense>} />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <Suspense fallback={<LoadingFallback />}><UserList /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/integrations" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Suspense fallback={<LoadingFallback />}><IntegrationHub /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/teams" element={<Suspense fallback={<LoadingFallback />}><TeamList /></Suspense>} />
        <Route path="/reports" element={<Suspense fallback={<LoadingFallback />}><ReportsDashboard /></Suspense>} />
        <Route path="/sms" element={<Suspense fallback={<LoadingFallback />}><SMSDashboard /></Suspense>} />
        <Route path="/voice" element={<Suspense fallback={<LoadingFallback />}><VoiceDashboard /></Suspense>} />
        <Route path="/k8s" element={<Suspense fallback={<LoadingFallback />}><K8sClusterDashboard /></Suspense>} />
        <Route path="/logs" element={<Suspense fallback={<LoadingFallback />}><LogExplorer /></Suspense>} />
        <Route path="/pagerduty" element={<Suspense fallback={<LoadingFallback />}><PagerDutyDashboard /></Suspense>} />
        <Route path="/apm" element={<Suspense fallback={<LoadingFallback />}><APMDashboard /></Suspense>} />
        <Route path="/bod-eod" element={<Suspense fallback={<LoadingFallback />}><BODEODDashboard /></Suspense>} />
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
        <Route path="/service-requests/:id" element={<Suspense fallback={<LoadingFallback />}><ServiceRequestDetail /></Suspense>} />
        {/* ── Knowledge Base (new) ── */}
        <Route path="/vendors" element={<Suspense fallback={<LoadingFallback />}><VendorList /></Suspense>} />
        <Route path="/kb" element={<Suspense fallback={<LoadingFallback />}><KBArticleList /></Suspense>} />
        <Route path="/kb/create" element={<Suspense fallback={<LoadingFallback />}><KBArticleCreate /></Suspense>} />
        <Route path="/kb/:id" element={<Suspense fallback={<LoadingFallback />}><KBArticleDetail /></Suspense>} />
        <Route path="/sla" element={<Suspense fallback={<LoadingFallback />}><SLAPolicyPage /></Suspense>} />
        <Route path="/audit" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <Suspense fallback={<LoadingFallback />}><AuditLogViewer /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={<Suspense fallback={<LoadingFallback />}><NotificationCenter /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<LoadingFallback />}><NotFound /></Suspense>} />
      </Route>

      {/* Self-Service Portal — simplified layout */}
      <Route element={<ErrorBoundary><ProtectedRoute><Suspense fallback={<LoadingFallback />}><PortalLayout /></Suspense></ProtectedRoute></ErrorBoundary>}>
        <Route path="/portal" element={<Suspense fallback={<LoadingFallback />}><PortalHome /></Suspense>} />
        <Route path="/portal/catalog" element={<Suspense fallback={<LoadingFallback />}><PortalCatalog /></Suspense>} />
        <Route path="/portal/report-issue" element={<Suspense fallback={<LoadingFallback />}><PortalIncidentCreate /></Suspense>} />
        <Route path="/portal/knowledge-base" element={<Suspense fallback={<LoadingFallback />}><PortalKnowledgeBase /></Suspense>} />
        <Route path="/portal/knowledge-base/:id" element={<Suspense fallback={<LoadingFallback />}><PortalArticleView /></Suspense>} />
        <Route path="/portal/my-requests" element={<Suspense fallback={<LoadingFallback />}><PortalMyRequests /></Suspense>} />
      </Route>
    </Routes>
  );
}
