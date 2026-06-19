import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { VerifySignup } from './pages/VerifySignup';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Endpoints } from './pages/Endpoints';
import { Approvals } from './pages/Approvals';
import { Policies } from './pages/Policies';
import { AiAgentLab } from './pages/AiAgentLab';
import { Audit } from './pages/Audit';
import { MyUsage } from './pages/MyUsage';
import { Forbidden } from './pages/Forbidden';
import { Governance } from './pages/Governance';
import { BusinessPackaging } from './pages/BusinessPackaging';
import { PaymentConfirmation } from './pages/PaymentConfirmation';
import { BusinessOperations } from './pages/BusinessOperations';
import { Profile } from './pages/Profile';
import { useAuth } from './contexts/AuthContext';
import './App.css';

const DASHBOARD_ROLES = ['DepartmentManager', 'SecurityAdmin', 'TenantOwner', 'PlatformAdmin'];
const SECURITY_ROLES = ['SecurityAdmin', 'TenantOwner', 'PlatformAdmin'];
const BUSINESS_ROLES = ['TenantOwner', 'SecurityAdmin', 'PlatformAdmin'];
const PACKAGE_ROLES = ['TenantOwner', 'PlatformAdmin'];
const AI_AGENT_LAB_ROLES = ['SecurityAdmin', 'PlatformAdmin'];
const APPROVAL_ROLES = ['DepartmentManager', 'SecurityAdmin', 'TenantOwner', 'PlatformAdmin'];
const AUDIT_ROLES = ['SecurityAdmin', 'TenantOwner', 'PlatformAdmin'];
const GOVERNANCE_ROLES = ['DepartmentManager', 'SecurityAdmin', 'TenantOwner', 'PlatformAdmin'];

const RoleHomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'Employee') return <Navigate to="/app/my-usage/logs" replace />;
  if (user?.role === 'TenantOwner') {
    return <Navigate to="/app/business/onboarding" replace />;
  }
  if (user?.role === 'PlatformAdmin') {
    return <Navigate to="/app/business/operations" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-signup" element={<VerifySignup />} />

              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<ProtectedRoute allowedRoles={DASHBOARD_ROLES}><Dashboard /></ProtectedRoute>} />
                <Route path="profile" element={<Profile />} />

                {/* Endpoints subroutes */}
                <Route path="endpoints" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/devices" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/custom-settings" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/events" element={<ProtectedRoute allowedRoles={DASHBOARD_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/dlp-events" element={<ProtectedRoute allowedRoles={DASHBOARD_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/telemetry" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/ai-websites" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/agent" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/extension" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />
                <Route path="endpoints/deployment" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Endpoints /></ProtectedRoute>} />

                {/* Approvals subroutes */}
                <Route path="approvals/prompts" element={<ProtectedRoute allowedRoles={APPROVAL_ROLES}><Approvals /></ProtectedRoute>} />
                <Route path="approvals/agents" element={<Navigate to="/app/approvals/prompts" replace />} />
                <Route path="approvals/history" element={<ProtectedRoute allowedRoles={APPROVAL_ROLES}><Approvals /></ProtectedRoute>} />

                {/* Policies subroutes */}
                <Route path="policies/rules" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Policies /></ProtectedRoute>} />
                <Route path="policies/detectors" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Policies /></ProtectedRoute>} />
                <Route path="policies/whitelist-blacklist" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Policies /></ProtectedRoute>} />
                <Route path="policies/versions" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Policies /></ProtectedRoute>} />

                {/* AI Agent is temporarily parked in a dev/test lab */}
                <Route path="dev/ai-agent-lab" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="dev/ai-agent-lab/permissions" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="dev/ai-agent-lab/monitor" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="dev/ai-agent-lab/prompt-injection" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="dev/ai-agent-lab/simulation" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="dev/ai-agent-lab/runtime" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="dev/ai-agent-lab/red-team" element={<ProtectedRoute allowedRoles={AI_AGENT_LAB_ROLES}><AiAgentLab /></ProtectedRoute>} />
                <Route path="agents" element={<Navigate to="/app/dev/ai-agent-lab" replace />} />
                <Route path="agents/permissions" element={<Navigate to="/app/dev/ai-agent-lab/permissions" replace />} />
                <Route path="agents/monitor" element={<Navigate to="/app/dev/ai-agent-lab/monitor" replace />} />
                <Route path="agents/prompt-injection" element={<Navigate to="/app/dev/ai-agent-lab/prompt-injection" replace />} />
                <Route path="agents/simulation" element={<Navigate to="/app/dev/ai-agent-lab/simulation" replace />} />
                <Route path="agents/runtime" element={<Navigate to="/app/dev/ai-agent-lab/runtime" replace />} />
                <Route path="agents/red-team" element={<Navigate to="/app/dev/ai-agent-lab/red-team" replace />} />

                {/* Audit & Blockchain subroutes */}
                <Route path="audit/logs" element={<ProtectedRoute allowedRoles={AUDIT_ROLES}><Audit /></ProtectedRoute>} />
                <Route path="audit/worker" element={<ProtectedRoute allowedRoles={AUDIT_ROLES}><Audit /></ProtectedRoute>} />
                <Route path="blockchain/batches" element={<ProtectedRoute allowedRoles={AUDIT_ROLES}><Audit /></ProtectedRoute>} />

                {/* Security governance */}
                <Route path="governance/health" element={<ProtectedRoute allowedRoles={GOVERNANCE_ROLES}><Governance /></ProtectedRoute>} />
                <Route path="governance/identity" element={<ProtectedRoute allowedRoles={['TenantOwner']}><Governance /></ProtectedRoute>} />
                <Route path="governance/false-positives" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Governance /></ProtectedRoute>} />
                <Route path="governance/incidents" element={<ProtectedRoute allowedRoles={GOVERNANCE_ROLES}><Governance /></ProtectedRoute>} />
                <Route path="governance/rules" element={<ProtectedRoute allowedRoles={SECURITY_ROLES}><Governance /></ProtectedRoute>} />
                <Route path="governance/settings" element={<ProtectedRoute allowedRoles={['TenantOwner']}><Governance /></ProtectedRoute>} />

                {/* Business packaging */}
                <Route path="business/packages" element={<ProtectedRoute allowedRoles={PACKAGE_ROLES}><BusinessPackaging /></ProtectedRoute>} />
                <Route path="business/payment" element={<ProtectedRoute allowedRoles={PACKAGE_ROLES}><PaymentConfirmation /></ProtectedRoute>} />
                <Route path="business/operations" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/orders" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/payments" element={<ProtectedRoute allowedRoles={['TenantOwner', 'PlatformAdmin']}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/licenses" element={<ProtectedRoute allowedRoles={['PlatformAdmin', 'TenantOwner']}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/customers" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/invoices" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/onboarding" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/company" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/quotations" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/support" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />
                <Route path="business/subscriptions" element={<ProtectedRoute allowedRoles={BUSINESS_ROLES}><BusinessOperations /></ProtectedRoute>} />

                {/* My Usage portal subroutes */}
                <Route path="my-usage" element={<MyUsage />} />
                <Route path="my-usage/overview" element={<MyUsage />} />
                <Route path="my-usage/logs" element={<MyUsage />} />
                <Route path="my-usage/approvals" element={<MyUsage />} />
                <Route path="my-usage/summary" element={<MyUsage />} />
                <Route path="my-usage/notifications" element={<MyUsage />} />

                {/* Fallbacks */}
                <Route path="forbidden" element={<Forbidden />} />
                <Route index element={<RoleHomeRedirect />} />
                <Route path="*" element={<RoleHomeRedirect />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
