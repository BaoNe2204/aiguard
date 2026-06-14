import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, Building2, Database, FileWarning, Gauge,
  HeartPulse, KeyRound, Network, Plus, RefreshCw, Save, ShieldCheck, Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE, getToken } from '../api/client';
import {
  governanceApi,
  type AdminUser,
  type Department,
  type ExactDataMatchRecord,
  type FalsePositive,
  type GovernanceHealth,
  type Incident,
  type Integration,
  type PolicyRule,
  type RetentionPolicy
} from '../api/governance';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type Tab = 'health' | 'identity' | 'false-positives' | 'incidents' | 'rules' | 'settings';

const defaultRetention: RetentionPolicy = {
  endpointEventDays: 90,
  auditLogDays: 365,
  notificationDays: 30,
  incidentDays: 730,
  storeOriginalContent: false,
  encryptSensitivePreview: true
};

export const Governance: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tab = (location.pathname.split('/').pop() || 'health') as Tab;
  const isSystemAdmin = user?.role === 'TenantOwner';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [falsePositives, setFalsePositives] = useState<FalsePositive[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [retention, setRetention] = useState<RetentionPolicy>(defaultRetention);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [exactMatches, setExactMatches] = useState<ExactDataMatchRecord[]>([]);

  const run = async (operation: () => Promise<void>, success?: string) => {
    setError('');
    setMessage('');
    try {
      await operation();
      if (success) setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Yeu cau that bai');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'health') setHealth(await governanceApi.health());
      if (tab === 'identity' && isSystemAdmin) {
        const [userResult, departmentResult] = await Promise.all([
          governanceApi.users({ pageSize: 200 }),
          governanceApi.departments()
        ]);
        setUsers(userResult.items);
        setDepartments(departmentResult);
      }
      if (tab === 'false-positives') {
        setFalsePositives((await governanceApi.falsePositives({ pageSize: 200 })).items);
      }
      if (tab === 'incidents') {
        setIncidents((await governanceApi.incidents({ pageSize: 200 })).items);
      }
      if (tab === 'rules') {
        const [ruleResult, departmentResult, edmResult] = await Promise.all([
          governanceApi.policyRules(),
          isSystemAdmin ? governanceApi.departments() : Promise.resolve([]),
          governanceApi.exactDataMatches()
        ]);
        setRules(ruleResult);
        setExactMatches(edmResult);
        if (departmentResult.length) setDepartments(departmentResult);
      }
      if (tab === 'settings' && isSystemAdmin) {
        const [retentionResult, integrationResult] = await Promise.all([
          governanceApi.retention(),
          governanceApi.integrations()
        ]);
        setRetention(retentionResult);
        setIntegrations(integrationResult);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Khong the tai du lieu');
    } finally {
      setLoading(false);
    }
  }, [tab, isSystemAdmin]);

  useEffect(() => { void load(); }, [load]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; systemOnly?: boolean }[] = [
    { key: 'health', label: 'Suc khoe he thong', icon: <HeartPulse size={16} /> },
    { key: 'identity', label: 'Nguoi dung & phong ban', icon: <Users size={16} />, systemOnly: true },
    { key: 'false-positives', label: 'Chan nham', icon: <FileWarning size={16} /> },
    { key: 'incidents', label: 'Su co', icon: <AlertTriangle size={16} /> },
    { key: 'rules', label: 'Policy Rule Builder', icon: <ShieldCheck size={16} /> },
    { key: 'settings', label: 'Retention & SIEM', icon: <Network size={16} />, systemOnly: true }
  ];

  return (
    <div className="governance-page">
      <div className="page-header">
        <div>
          <h1>Security Governance</h1>
          <p className="subtitle">Van han DLP, xu ly su co, rule, danh tinh va tich hop bao mat.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => void load()}>
          <RefreshCw size={15} /> Lam moi
        </button>
      </div>
      <div className="tabs-container governance-tabs">
        {tabs.filter(item => !item.systemOnly || isSystemAdmin).map(item => (
          <button
            key={item.key}
            className={`tab-btn ${tab === item.key ? 'active' : ''}`}
            onClick={() => navigate(`/app/governance/${item.key}`)}
          >
            {item.icon}{item.label}
          </button>
        ))}
      </div>
      {error && <div className="governance-alert error">{error}</div>}
      {message && <div className="governance-alert success">{message}</div>}
      {loading ? <LoadingSpinner size="lg" text="Dang tai du lieu governance..." /> : (
        <>
          {tab === 'health' && <HealthTab health={health} />}
          {tab === 'identity' && isSystemAdmin && (
            <IdentityTab
              users={users}
              departments={departments}
              refresh={load}
              run={run}
            />
          )}
          {tab === 'false-positives' && (
            <FalsePositiveTab reports={falsePositives} refresh={load} run={run} />
          )}
          {tab === 'incidents' && (
            <IncidentTab incidents={incidents} refresh={load} run={run} />
          )}
          {tab === 'rules' && (
            <RulesTab rules={rules} departments={departments} exactMatches={exactMatches} refresh={load} run={run} />
          )}
          {tab === 'settings' && isSystemAdmin && (
            <SettingsTab
              retention={retention}
              setRetention={setRetention}
              integrations={integrations}
              refresh={load}
              run={run}
            />
          )}
        </>
      )}
    </div>
  );
};

const HealthTab = ({ health }: { health: GovernanceHealth | null }) => {
  if (!health) return <div className="card glass p-6">Khong co du lieu.</div>;
  const cards = [
    ['Endpoint online', health.onlineDevices, 'ok'],
    ['Endpoint offline', health.offlineDevices, health.offlineDevices ? 'warn' : 'ok'],
    ['Dang quarantine', health.quarantinedDevices, health.quarantinedDevices ? 'danger' : 'ok'],
    ['Extension bi tat', health.extensionDisabledDevices, health.extensionDisabledDevices ? 'danger' : 'ok'],
    ['Policy chua dong bo', health.stalePolicyDevices, health.stalePolicyDevices ? 'warn' : 'ok'],
    ['Approval dang cho', health.pendingApprovals, health.pendingApprovals ? 'warn' : 'ok'],
    ['Approval het han', health.expiredApprovals, health.expiredApprovals ? 'danger' : 'ok'],
    ['Incident dang mo', health.openIncidents, health.openIncidents ? 'danger' : 'ok'],
    ['Bao cao chan nham', health.pendingFalsePositives, health.pendingFalsePositives ? 'warn' : 'ok'],
    ['Integration loi', health.failedIntegrations, health.failedIntegrations ? 'danger' : 'ok']
  ];
  const healthChecks = [
    {
      name: 'API latency',
      status: 'Can instrumentation',
      detail: 'Backend health hien chua tra p50/p95 latency. Can them metrics middleware de do chinh xac.',
      tone: 'warn'
    },
    {
      name: 'Detector runtime',
      status: health.pendingFalsePositives > 5 ? 'Can review' : 'Stable',
      detail: `${health.pendingFalsePositives} false-positive dang cho xu ly. Day la tin hieu chat luong detector.`,
      tone: health.pendingFalsePositives > 5 ? 'warn' : 'ok'
    },
    {
      name: 'Approval queue',
      status: health.pendingApprovals > 0 ? 'Backlog' : 'Clear',
      detail: `${health.pendingApprovals} dang cho, ${health.expiredApprovals} het han.`,
      tone: health.expiredApprovals > 0 ? 'danger' : health.pendingApprovals > 0 ? 'warn' : 'ok'
    },
    {
      name: 'Extension fleet',
      status: health.extensionDisabledDevices > 0 ? 'Attention' : 'Healthy',
      detail: `${health.extensionDisabledDevices} thiet bi extension tat/go, ${health.stalePolicyDevices} chua dong bo policy.`,
      tone: health.extensionDisabledDevices > 0 ? 'danger' : health.stalePolicyDevices > 0 ? 'warn' : 'ok'
    }
  ];
  return (
    <>
      <div className="governance-health-grid">
        {cards.map(([label, value, tone]) => (
          <div className={`card glass governance-health-card ${tone}`} key={String(label)}>
            <Activity size={18} /><span>{label}</span><strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="card glass p-6 governance-note">
        <div>
          API uptime: <strong>{Math.floor(health.apiUptimeSeconds / 60)} phút</strong>.
          Endpoint được xem là offline nếu không heartbeat trong 5 phút.
        </div>
        <div className="row-actions">
          <button className="btn-secondary" onClick={() => void governanceApi.downloadEndpointReport('xlsx')}>
            Xuất Excel 30 ngày
          </button>
          <button className="btn-secondary" onClick={() => void governanceApi.downloadEndpointReport('pdf')}>
            Xuất PDF 30 ngày
          </button>
        </div>
      </div>
      <section className="card glass governance-section mt-4">
        <h2><Gauge size={18} /> Health Dashboard chi tiet</h2>
        <div className="governance-metric-grid">
          {healthChecks.map(item => (
            <div className={`governance-metric-card ${item.tone}`} key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.detail}</span>
              </div>
              <b>{item.status}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

interface AsyncActions {
  refresh: () => Promise<void>;
  run: (operation: () => Promise<void>, success?: string) => Promise<void>;
}

const IdentityTab = ({
  users, departments, refresh, run
}: { users: AdminUser[]; departments: Department[] } & AsyncActions) => {
  const [userForm, setUserForm] = useState({
    fullName: '', email: '', password: '', role: 'Employee',
    departmentId: '', mfaRequired: false, authProvider: 'Local'
  });
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '' });

  const importUsers = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE}/admin/users/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || 'Import that bai');
  };

  return (
    <div className="governance-split">
      <section className="card glass governance-section">
        <h2><Users size={18} /> Nguoi dung</h2>
        <form className="governance-form grid-2" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            await governanceApi.createUser({
              ...userForm,
              departmentId: userForm.departmentId || null,
              isActive: true
            });
            setUserForm({ fullName: '', email: '', password: '', role: 'Employee', departmentId: '', mfaRequired: false, authProvider: 'Local' });
            await refresh();
          }, 'Da tao nguoi dung.');
        }}>
          <input required placeholder="Ho ten" value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} />
          <input required type="email" placeholder="Email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
          <input required type="password" placeholder="Mat khau tam" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
          <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
            {['Employee', 'DepartmentManager', 'SecurityAdmin', 'TenantOwner', 'PlatformAdmin'].map(role => <option key={role}>{role}</option>)}
          </select>
          <select value={userForm.departmentId} onChange={e => setUserForm({ ...userForm, departmentId: e.target.value })}>
            <option value="">Khong gan phong ban</option>
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select value={userForm.authProvider} onChange={e => setUserForm({ ...userForm, authProvider: e.target.value })}>
            {['Local', 'Microsoft Entra ID', 'Google Workspace'].map(provider => <option key={provider}>{provider}</option>)}
          </select>
          <label className="governance-check"><input type="checkbox" checked={userForm.mfaRequired} onChange={e => setUserForm({ ...userForm, mfaRequired: e.target.checked })} /> Bat buoc MFA</label>
          <button className="btn-primary" type="submit"><Plus size={14} /> Tao user</button>
          <label className="btn-secondary governance-file">
            Import CSV/XLSX
            <input type="file" accept=".csv,.xlsx" onChange={event => {
              const file = event.target.files?.[0];
              if (file) void run(async () => { await importUsers(file); await refresh(); }, 'Import thanh cong.');
            }} />
          </label>
        </form>
        <div className="governance-table-wrap">
          <table className="governance-table"><thead><tr><th>Nguoi dung</th><th>Role</th><th>Phong ban</th><th>Auth</th><th>MFA</th><th>Trang thai</th><th></th></tr></thead>
            <tbody>{users.map(item => <tr key={item.id}>
              <td><strong>{item.fullName}</strong><small>{item.email}</small></td>
              <td>{item.role}</td><td>{item.departmentName || '-'}</td><td>{item.authProvider}</td>
              <td>{item.mfaRequired ? (item.mfaEnabled ? 'Required + Enrolled' : 'Required, chua setup') : (item.mfaEnabled ? 'Enrolled' : 'Khong')}</td>
              <td>{item.isActive ? 'Active' : 'Disabled'}</td>
              <td><button className="table-action danger" disabled={!item.isActive} onClick={() => void run(async () => {
                await governanceApi.disableUser(item.id); await refresh();
              }, 'Da khoa tai khoan.')}>Khoa</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="card glass governance-section">
        <h2><Building2 size={18} /> Phong ban</h2>
        <form className="governance-form" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            await governanceApi.createDepartment(departmentForm);
            setDepartmentForm({ name: '', code: '' });
            await refresh();
          }, 'Da tao phong ban.');
        }}>
          <input required placeholder="Ten phong ban" value={departmentForm.name} onChange={e => setDepartmentForm({ ...departmentForm, name: e.target.value })} />
          <input required placeholder="Ma phong ban" value={departmentForm.code} onChange={e => setDepartmentForm({ ...departmentForm, code: e.target.value.toUpperCase() })} />
          <button className="btn-primary" type="submit"><Plus size={14} /> Tao phong ban</button>
        </form>
        <div className="governance-list">{departments.map(item => (
          <div className="governance-list-item" key={item.id}>
            <div><strong>{item.name}</strong><small>{item.code}</small></div>
            <span>{item.userCount} users / {item.deviceCount} devices</span>
          </div>
        ))}</div>
        <SsoMfaReadiness users={users} />
      </section>
    </div>
  );
};

const SsoMfaReadiness = ({ users }: { users: AdminUser[] }) => {
  const providers = [
    {
      name: 'Microsoft Entra ID',
      status: users.some(user => user.authProvider === 'Microsoft Entra ID') ? 'Users mapped' : 'Not configured',
      detail: 'Can OIDC/SAML callback, tenant app registration va conditional access backend de login that.'
    },
    {
      name: 'Google Workspace',
      status: users.some(user => user.authProvider === 'Google Workspace') ? 'Users mapped' : 'Not configured',
      detail: 'Can OAuth client, domain verification va callback backend de login that.'
    },
    {
      name: 'Admin MFA',
      status: `${users.filter(user => user.mfaRequired).length}/${users.length} required`,
      detail: `${users.filter(user => user.mfaEnabled).length} user da enroll TOTP. MFA backend that da hoat dong.`
    }
  ];
  return (
    <div className="governance-readiness">
      <h2><KeyRound size={18} /> SSO & MFA readiness</h2>
      {providers.map(provider => (
        <div className="governance-readiness-item" key={provider.name}>
          <div><strong>{provider.name}</strong><small>{provider.detail}</small></div>
          <span>{provider.status}</span>
        </div>
      ))}
    </div>
  );
};

const FalsePositiveTab = ({ reports, refresh, run }: { reports: FalsePositive[] } & AsyncActions) => {
  const approved = reports.filter(report => report.status === 'Approved').length;
  const pending = reports.filter(report => report.status === 'Pending').length;
  const rejected = reports.filter(report => report.status === 'Rejected').length;
  const byDetector = Object.values(reports.reduce<Record<string, {
    detector: string; total: number; approved: number; pending: number; rejected: number;
  }>>((acc, report) => {
    const key = report.detectorName || 'Unknown';
    acc[key] ??= { detector: key, total: 0, approved: 0, pending: 0, rejected: 0 };
    acc[key].total += 1;
    if (report.status === 'Approved') acc[key].approved += 1;
    if (report.status === 'Pending') acc[key].pending += 1;
    if (report.status === 'Rejected') acc[key].rejected += 1;
    return acc;
  }, {})).sort((left, right) => right.total - left.total);

  return (
    <div className="governance-stack">
      <section className="card glass governance-section">
        <h2><BarChart3 size={18} /> False-positive analytics</h2>
        <div className="governance-metric-grid">
          <div className="governance-metric-card"><div><strong>{reports.length}</strong><span>Tong bao cao</span></div><b>All</b></div>
          <div className="governance-metric-card warn"><div><strong>{pending}</strong><span>Dang cho security admin</span></div><b>Pending</b></div>
          <div className="governance-metric-card ok"><div><strong>{approved}</strong><span>Da xac nhan chan nham</span></div><b>{reports.length ? Math.round(approved / reports.length * 100) : 0}%</b></div>
          <div className="governance-metric-card danger"><div><strong>{rejected}</strong><span>Detector dung, bao cao bi tu choi</span></div><b>Rejected</b></div>
        </div>
        <div className="governance-table-wrap mt-4"><table className="governance-table">
          <thead><tr><th>Detector</th><th>Total</th><th>Approved</th><th>Pending</th><th>False-positive rate</th></tr></thead>
          <tbody>{byDetector.map(item => <tr key={item.detector}>
            <td><strong>{item.detector}</strong></td>
            <td>{item.total}</td><td>{item.approved}</td><td>{item.pending}</td>
            <td>{item.total ? Math.round(item.approved / item.total * 100) : 0}%</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <section className="card glass governance-section">
        <h2><FileWarning size={18} /> Bao cao nhan dien sai</h2>
        <div className="governance-table-wrap"><table className="governance-table">
          <thead><tr><th>Thoi gian</th><th>Nguoi bao cao</th><th>Detector</th><th>Ly do</th><th>Trang thai</th><th>Xu ly</th></tr></thead>
          <tbody>{reports.map(report => <tr key={report.id}>
            <td>{new Date(report.createdAt).toLocaleString()}</td><td>{report.reportedByEmail}</td>
            <td>{report.detectorName}</td><td>{report.reason}</td><td>{report.status}</td>
            <td>{report.status === 'Pending' ? <div className="row-actions">
              <button className="table-action safe" onClick={() => void run(async () => {
                await governanceApi.reviewFalsePositive(report.id, {
                  action: 'Approve', note: 'Approved by Security Admin',
                  createWhitelist: true, whitelistDurationDays: 30
                }); await refresh();
              }, 'Da duyet va tao whitelist 30 ngay.')}>Duyet</button>
              <button className="table-action danger" onClick={() => void run(async () => {
                await governanceApi.reviewFalsePositive(report.id, { action: 'Reject', note: 'Detection is valid' });
                await refresh();
              }, 'Da tu choi bao cao.')}>Tu choi</button>
            </div> : report.reviewNote || '-'}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
};

const IncidentTab = ({ incidents, refresh, run }: { incidents: Incident[] } & AsyncActions) => {
  const [form, setForm] = useState({ title: '', severity: 'High', summary: '' });
  return <section className="card glass governance-section">
    <h2><AlertTriangle size={18} /> Incident Management</h2>
    <form className="governance-form grid-2" onSubmit={event => {
      event.preventDefault();
      void run(async () => {
        await governanceApi.createIncident({ ...form, sourceType: 'Manual' });
        setForm({ title: '', severity: 'High', summary: '' }); await refresh();
      }, 'Da tao incident.');
    }}>
      <input required placeholder="Tieu de su co" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
        {['Low', 'Medium', 'High', 'Critical'].map(value => <option key={value}>{value}</option>)}
      </select>
      <textarea placeholder="Tom tat dieu tra" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
      <button className="btn-primary" type="submit"><Plus size={14} /> Tao incident</button>
    </form>
    <div className="governance-table-wrap"><table className="governance-table">
      <thead><tr><th>Ma</th><th>Tieu de</th><th>Severity</th><th>Status</th><th>Cap nhat</th></tr></thead>
      <tbody>{incidents.map(item => <tr key={item.id}>
        <td>{item.incidentNumber}</td><td><strong>{item.title}</strong><small>{item.summary || '-'}</small></td>
        <td>{item.severity}</td><td>{item.status}</td><td><div className="row-actions">
          <button className="table-action" onClick={() => void run(async () => {
            await governanceApi.updateIncident(item.id, { status: 'Investigating' }); await refresh();
          })}>Dieu tra</button>
          <button className="table-action safe" onClick={() => void run(async () => {
            await governanceApi.updateIncident(item.id, { status: 'Resolved', resolution: 'Resolved from Control Tower' }); await refresh();
          })}>Dong</button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
  </section>;
};

const RulesTab = ({
  rules, departments, exactMatches, refresh, run
}: { rules: PolicyRule[]; departments: Department[]; exactMatches: ExactDataMatchRecord[] } & AsyncActions) => {
  const [form, setForm] = useState({
    name: '', priority: 100, departmentId: '', dataType: '', websitePattern: '*',
    userEmail: '', hostname: '', activeFrom: '', activeTo: '', action: 'Block', isEnabled: true
  });
  const [simulation, setSimulation] = useState({ departmentCode: '', dataType: '', website: 'chatgpt.com', userEmail: '', hostname: '' });
  const [simulationResult, setSimulationResult] = useState('');
  const [edm, setEdm] = useState({ dataType: 'CustomerId', values: '', label: '' });
  return <div className="governance-stack">
    <section className="card glass governance-section">
      <h2><ShieldCheck size={18} /> Policy Rule Builder</h2>
      <p className="governance-help">IF department/data type/website/user/device/time match THEN Allow, Mask, PendingApproval hoac Block.</p>
      <form className="governance-form grid-3" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          await governanceApi.createPolicyRule({
            ...form,
            departmentId: form.departmentId || null,
            activeFrom: form.activeFrom || null,
            activeTo: form.activeTo || null
          });
          setForm({ name: '', priority: 100, departmentId: '', dataType: '', websitePattern: '*', userEmail: '', hostname: '', activeFrom: '', activeTo: '', action: 'Block', isEnabled: true });
          await refresh();
        }, 'Da luu rule o trang thai Draft.');
      }}>
        <input required placeholder="Ten rule" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input type="number" min="0" placeholder="Priority" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
        <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
          <option value="">Tat ca phong ban</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input placeholder="Data type: CCCD, Source Code..." value={form.dataType} onChange={e => setForm({ ...form, dataType: e.target.value })} />
        <input placeholder="Website pattern" value={form.websitePattern} onChange={e => setForm({ ...form, websitePattern: e.target.value })} />
        <input placeholder="User email (optional)" value={form.userEmail} onChange={e => setForm({ ...form, userEmail: e.target.value })} />
        <input placeholder="Hostname (optional)" value={form.hostname} onChange={e => setForm({ ...form, hostname: e.target.value })} />
        <input type="time" title="Active from" value={form.activeFrom} onChange={e => setForm({ ...form, activeFrom: e.target.value })} />
        <input type="time" title="Active to" value={form.activeTo} onChange={e => setForm({ ...form, activeTo: e.target.value })} />
        <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
          {['Allow', 'Mask', 'PendingApproval', 'Block'].map(value => <option key={value}>{value}</option>)}
        </select>
        <button className="btn-primary" type="submit"><Save size={14} /> Luu Draft</button>
      </form>
      <div className="governance-table-wrap"><table className="governance-table">
        <thead><tr><th>Priority</th><th>Rule</th><th>Dieu kien</th><th>Action</th><th>Status</th><th></th></tr></thead>
        <tbody>{rules.map(rule => <tr key={rule.id}>
          <td>{rule.priority}</td><td><strong>{rule.name}</strong><small>{rule.version}</small></td>
          <td>{[rule.departmentName, rule.dataType, rule.websitePattern, rule.userEmail, rule.hostname, rule.activeFrom && `${rule.activeFrom}-${rule.activeTo || '24:00'}`].filter(Boolean).join(' / ') || 'Tat ca'}</td>
          <td>{rule.action}</td><td>{rule.status}</td>
          <td>{rule.status === 'Draft' && <button className="table-action safe" onClick={() => void run(async () => {
            await governanceApi.publishPolicyRule(rule.id); await refresh();
          }, 'Da publish policy rule.')}>Publish</button>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <div className="governance-split">
      <section className="card glass governance-section">
        <h2><Activity size={18} /> Policy Simulation</h2>
        <form className="governance-form" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            const result = await governanceApi.simulatePolicy(simulation);
            setSimulationResult(`${result.decision}${result.ruleName ? ` - ${result.ruleName}` : ''}`);
          });
        }}>
          {Object.entries(simulation).map(([key, value]) => <input key={key} placeholder={key} value={value} onChange={e => setSimulation({ ...simulation, [key]: e.target.value })} />)}
          <button className="btn-primary" type="submit">Chay mo phong</button>
        </form>
        {simulationResult && <div className="governance-result">{simulationResult}</div>}
      </section>
      <section className="card glass governance-section">
        <h2><Database size={18} /> Exact Data Match</h2>
        <form className="governance-form" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            const values = edm.values.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
            await governanceApi.importExactDataMatch({ dataType: edm.dataType, values, label: edm.label });
            setEdm({ ...edm, values: '' });
          }, 'Đã băm SHA-256 và import dữ liệu EDM.');
        }}>
          <input required placeholder="Loai du lieu" value={edm.dataType} onChange={e => setEdm({ ...edm, dataType: e.target.value })} />
          <input placeholder="Nhan du lieu" value={edm.label} onChange={e => setEdm({ ...edm, label: e.target.value })} />
          <textarea required placeholder="Moi gia tri mot dong. Server chi luu SHA-256." value={edm.values} onChange={e => setEdm({ ...edm, values: e.target.value })} />
          <button className="btn-primary" type="submit">Import EDM</button>
        </form>
        <div className="governance-table-wrap"><table className="governance-table">
          <thead><tr><th>Loai du lieu</th><th>Nhan</th><th>Phong ban</th><th>Het han</th><th></th></tr></thead>
          <tbody>{exactMatches.map(record => <tr key={record.id}>
            <td><strong>{record.dataType}</strong><small>{record.isActive ? 'Active' : 'Inactive'}</small></td>
            <td>{record.label || '-'}</td><td>{record.departmentName || 'Tat ca'}</td>
            <td>{record.expiresAt ? new Date(record.expiresAt).toLocaleDateString() : 'Khong'}</td>
            <td><button className="table-action danger" onClick={() => void run(async () => {
              await governanceApi.deleteExactDataMatch(record.id);
              await refresh();
            }, 'Da xoa EDM record.')}>Xoa</button></td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  </div>;
};

const SettingsTab = ({
  retention, setRetention, integrations, refresh, run
}: {
  retention: RetentionPolicy;
  setRetention: React.Dispatch<React.SetStateAction<RetentionPolicy>>;
  integrations: Integration[];
} & AsyncActions) => {
  const [integration, setIntegration] = useState({ name: '', type: 'Webhook', endpoint: '', secret: '', isEnabled: true });
  return <div className="governance-split">
    <section className="card glass governance-section">
      <h2><Database size={18} /> Retention & Privacy</h2>
      <form className="governance-form grid-2" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          setRetention(await governanceApi.updateRetention(retention));
        }, 'Da cap nhat retention policy.');
      }}>
        {([
          ['endpointEventDays', 'Endpoint event (ngay)'],
          ['auditLogDays', 'Audit log (ngay)'],
          ['notificationDays', 'Notification (ngay)'],
          ['incidentDays', 'Incident (ngay)']
        ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="1" max="3650" value={retention[key]} onChange={e => setRetention({ ...retention, [key]: Number(e.target.value) })} /></label>)}
        <label className="governance-check"><input type="checkbox" checked={retention.storeOriginalContent} onChange={e => setRetention({ ...retention, storeOriginalContent: e.target.checked })} /> Luu noi dung goc</label>
        <label className="governance-check"><input type="checkbox" checked={retention.encryptSensitivePreview} onChange={e => setRetention({ ...retention, encryptSensitivePreview: e.target.checked })} /> Ma hoa preview</label>
        <button className="btn-primary" type="submit"><Save size={14} /> Luu retention</button>
      </form>
    </section>
    <section className="card glass governance-section">
      <h2><Network size={18} /> SIEM & Notification Channels</h2>
      <form className="governance-form" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          await governanceApi.createIntegration(integration);
          setIntegration({ name: '', type: 'Webhook', endpoint: '', secret: '', isEnabled: true });
          await refresh();
        }, 'Da them integration.');
      }}>
        <input required placeholder="Ten integration" value={integration.name} onChange={e => setIntegration({ ...integration, name: e.target.value })} />
        <select value={integration.type} onChange={e => setIntegration({ ...integration, type: e.target.value })}>
          {['Webhook', 'Syslog', 'Splunk', 'Sentinel', 'Teams', 'Slack', 'Email'].map(value => <option key={value}>{value}</option>)}
        </select>
        <input required placeholder="Endpoint / webhook URL" value={integration.endpoint} onChange={e => setIntegration({ ...integration, endpoint: e.target.value })} />
        <input type="password" placeholder="Secret / token" value={integration.secret} onChange={e => setIntegration({ ...integration, secret: e.target.value })} />
        <button className="btn-primary" type="submit"><Plus size={14} /> Them integration</button>
      </form>
      <div className="governance-list">{integrations.map(item => <div className="governance-list-item" key={item.id}>
        <div><strong>{item.name}</strong><small>{item.type} - {item.endpoint}</small></div>
        <button className="table-action danger" onClick={() => void run(async () => {
          await governanceApi.deleteIntegration(item.id); await refresh();
        })}>Xoa</button>
      </div>)}</div>
    </section>
  </div>;
};

export default Governance;
