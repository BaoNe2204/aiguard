import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Download, MonitorCheck, RefreshCw, Plus, Search, Copy, X, AlertTriangle, WifiOff, Puzzle, TerminalSquare } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { RiskBadge } from '../components/ui/RiskBadge';
import { DecisionBadge } from '../components/ui/DecisionBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';
import {
  endpointsApi,
  type DeviceResponse,
  type EndpointEventResponse,
  type AiWebsiteResponse,
  type DeploymentTokenResponse,
  type ShadowAiDiscoveryResponse,
  type EndpointTelemetryResponse
} from '../api/endpoints';
import { useLanguage } from '../contexts/LanguageContext';
import { useRealtimeExtension } from '../contexts/RealtimeContext';

type TabType = 'overview' | 'devices' | 'websites' | 'events' | 'agent' | 'extension' | 'deployment';

const endpointTabs: Array<{ key: TabType; path: string; label: string }> = [
  { key: 'overview', path: '/app/endpoints', label: 'Tổng quan' },
  { key: 'devices', path: '/app/endpoints/devices', label: 'Thiết bị đã triển khai' },
  { key: 'websites', path: '/app/endpoints/ai-websites', label: 'Website AI theo dõi' },
  { key: 'events', path: '/app/endpoints/events', label: 'Theo dõi Agent / DLP' },
  { key: 'agent', path: '/app/endpoints/agent', label: 'aiguard-endpoint-agent' },
  { key: 'extension', path: '/app/endpoints/extension', label: 'aiguard-extension' }
];


function isDeviceOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() <= 5 * 60 * 1000;
}

function formatDeviceSeen(value: string, locale: string) {
  const seen = new Date(value);
  const diffMinutes = Math.max(0, Math.round((Date.now() - seen.getTime()) / 60000));
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  return seen.toLocaleString(locale);
}

export const Endpoints: React.FC = () => {
  const location = useLocation();
  const { t, locale } = useLanguage();
  const activeTab: TabType = location.pathname.endsWith('/devices') ? 'devices'
    : location.pathname.endsWith('/events') ? 'events'
    : location.pathname.endsWith('/ai-websites') ? 'websites'
    : location.pathname.endsWith('/agent') ? 'agent'
    : location.pathname.endsWith('/extension') ? 'extension'
    : location.pathname.endsWith('/deployment') ? 'deployment'
    : 'overview';

  const { extensionEvents, extensionStatus } = useRealtimeExtension();

  // ── Devices state ──
  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [devicesPage, setDevicesPage] = useState(1);
  const [devicesTotalPages, setDevicesTotalPages] = useState(1);
  const [devicesTotalCount, setDevicesTotalCount] = useState(0);
  const [devicesSearch, setDevicesSearch] = useState('');
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [, setSyncStatus] = useState<Record<string, string>>({});
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);

  // ── Events state ──
  const [events, setEvents] = useState<EndpointEventResponse[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotalCount, setEventsTotalCount] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<EndpointTelemetryResponse[]>([]);

  // ── Websites state ──
  const [websites, setWebsites] = useState<AiWebsiteResponse[]>([]);
  const [websitesLoading, setWebsitesLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', domainPattern: '', mode: 'Block' });
  const [shadowDiscoveries, setShadowDiscoveries] = useState<ShadowAiDiscoveryResponse[]>([]);

  // ── Deployment state ──
  const [deployToken, setDeployToken] = useState<DeploymentTokenResponse | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [rotatingKeyFor, setRotatingKeyFor] = useState<'agent' | 'extension' | null>(null);
  const [lastRotatedKeyFor, setLastRotatedKeyFor] = useState<'agent' | 'extension' | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<'agent' | 'extension' | 'url' | null>(null);

  // ── Overview stats (reuse from devices) ──
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewStats, setOverviewStats] = useState({ total: 0, active: 0, offline: 0, extensionActive: 0 });

  const [error, setError] = useState('');

  // ── Fetch Devices ──
  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const result = await endpointsApi.getDevices({ page: devicesPage, pageSize: 20, search: devicesSearch });
      setDevices(result.items);
      setDevicesTotalPages(result.totalPages);
      setDevicesTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDevicesLoading(false);
    }
  }, [devicesPage, devicesSearch]);

  // ── Fetch Events ──
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const [result, telemetryResult] = await Promise.all([
        endpointsApi.getEvents({ page: eventsPage, pageSize: 20 }),
        endpointsApi.getTelemetry({ pageSize: 50 })
      ]);
      setEvents(result.items);
      setTelemetry(telemetryResult.items);
      setEventsTotalPages(result.totalPages);
      setEventsTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, [eventsPage]);

  // ── Fetch Websites ──
  const fetchWebsites = useCallback(async () => {
    setWebsitesLoading(true);
    try {
      const [result, discoveries] = await Promise.all([
        endpointsApi.getAiWebsites(),
        endpointsApi.getShadowAiDiscoveries({ pageSize: 100 })
      ]);
      setWebsites(result);
      setShadowDiscoveries(discoveries.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setWebsitesLoading(false);
    }
  }, []);

  // ── Fetch Deployment ──
  const fetchDeployment = useCallback(async () => {
    setDeployLoading(true);
    try {
      const result = await endpointsApi.getDeploymentToken();
      setDeployToken(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeployLoading(false);
    }
  }, []);

  // ── Fetch Overview ──
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const result = await endpointsApi.getDevices({ page: 1, pageSize: 100 });
      const wsResult = await endpointsApi.getAiWebsites();
      const active = result.items.filter(device => isDeviceOnline(device.lastSeen)).length;
      const extensionActive = result.items.filter(device => device.extensionActive).length;
      setOverviewStats({
        total: result.totalCount,
        active,
        offline: Math.max(result.totalCount - active, 0),
        extensionActive
      });
      setWebsites(wsResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    else if (activeTab === 'devices') fetchDevices();
    else if (activeTab === 'events') fetchEvents();
    else if (activeTab === 'websites') fetchWebsites();
    else if (activeTab === 'agent' || activeTab === 'extension') {
      fetchDeployment();
      fetchDevices();
    }
    else if (activeTab === 'deployment') fetchDeployment();
  }, [activeTab, fetchDevices, fetchEvents, fetchWebsites, fetchDeployment, fetchOverview]);

  // Prepend real-time DLP events to the log view
  useEffect(() => {
    if (extensionEvents.length === 0) return;
    const latestEvent = extensionEvents[0];
    setEvents(prev => {
      const mappedEvent: EndpointEventResponse = {
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userEmail: latestEvent.userEmail,
        hostname: latestEvent.hostname,
        browser: 'Extension',
        websiteAi: latestEvent.websiteAi,
        eventType: latestEvent.eventType,
        riskScore: latestEvent.riskScore,
        riskLevel: latestEvent.riskLevel,
        decision: latestEvent.decision,
        dataTypeMatched: latestEvent.dataTypeMatched,
        maskedContentPreview: null,
        originalHash: '',
        policyVersion: 'real-time',
        createdAt: latestEvent.createdAt
      };
      if (prev.length > 0 && prev[0].createdAt === mappedEvent.createdAt && prev[0].hostname === mappedEvent.hostname) {
        return prev;
      }
      return [mappedEvent, ...prev].slice(0, 50);
    });
  }, [extensionEvents]);

  const triggerSync = async (id: string) => {
    setSyncStatus(prev => ({ ...prev, [id]: 'syncing' }));
    try {
      await endpointsApi.syncPolicy(id);
      setSyncStatus(prev => ({ ...prev, [id]: 'success' }));
    } catch {
      setSyncStatus(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  const handleAddWebsite = async () => {
    if (!newRule.name || !newRule.domainPattern) return;
    try {
      await endpointsApi.createAiWebsiteRule(newRule);
      setShowAddModal(false);
      setNewRule({ name: '', domainPattern: '', mode: 'Block' });
      fetchWebsites();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleWebsite = async (id: string, isActive: boolean) => {
    try {
      await endpointsApi.updateAiWebsite(id, { isActive: !isActive });
      fetchWebsites();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    if (!window.confirm(t('Delete this AI website rule?', 'Xóa quy tắc website AI này?'))) return;
    try {
      await endpointsApi.deleteAiWebsite(id);
      await fetchWebsites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleRotateKey = async (id: string) => {
    if (!window.confirm(t('Rotate this endpoint key? The current key will stop working immediately.', 'Tạo lại khóa thiết bị này? Khóa hiện tại sẽ ngừng hoạt động ngay lập tức.'))) return;
    try {
      const result = await endpointsApi.rotateEndpointKey(id);
      setRotatedKey(result.endpointKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Key rotation failed');
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm(t('Revoke this endpoint key? The device will be disconnected.', 'Thu hồi khóa thiết bị này? Thiết bị sẽ bị ngắt kết nối.'))) return;
    try {
      await endpointsApi.revokeEndpointKey(id);
      await fetchDevices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Key revocation failed');
    }
  };

  const handleRotateToken = async (target: 'agent' | 'extension' = 'agent') => {
    setRotatingKeyFor(target);
    try {
      const result = await endpointsApi.rotateDeploymentToken(deployToken?.tenantCode);
      setDeployToken(result);
      setLastRotatedKeyFor(target);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRotatingKeyFor(null);
    }
  };

  const copyToClipboard = (kind: 'agent' | 'extension' | 'url', value?: string) => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopiedCommand(kind);
      setTimeout(() => setCopiedCommand(null), 2000);
    }
  };

  const getDeviceOnlineRealtime = (device: DeviceResponse) => {
    const s = extensionStatus.get(device.id);
    if (s) return s.connected;
    return isDeviceOnline(device.lastSeen);
  };

  const getExtensionActiveRealtime = (device: DeviceResponse) => {
    const s = extensionStatus.get(device.id);
    if (s && s.connected) return true;
    return device.extensionActive;
  };

  const deviceStats = {
    total: devicesTotalCount || devices.length,
    online: devices.filter(device => getDeviceOnlineRealtime(device)).length,
    offline: devices.filter(device => !getDeviceOnlineRealtime(device)).length,
    extensionActive: devices.filter(device => getExtensionActiveRealtime(device)).length
  };

  return (
    <div className="endpoints-page">
      <div className="endpoint-hero glass">
        <div>
          <span className="endpoint-eyebrow">{t('Endpoint Protection', 'Bảo vệ thiết bị')}</span>
          <h1>{t('Endpoint Protection Console', 'Bảng điều khiển bảo vệ thiết bị')}</h1>
          <p>{t('Track where the agent is deployed, which devices are still online, and whether browser protection is active.', 'Theo dõi agent đã cài trên thiết bị nào, máy nào còn hoạt động và tiện ích trình duyệt có đang bật hay không.')}</p>
        </div>
        <div className="endpoint-hero-stats">
          <div><strong>{overviewStats.total || deviceStats.total}</strong><span>{t('Deployed', 'Đã triển khai')}</span></div>
          <div><strong>{overviewStats.active || deviceStats.online}</strong><span>{t('Online', 'Đang hoạt động')}</span></div>
        </div>
      </div>

      <nav className="endpoint-tab-menu" aria-label="Endpoint management">
        {endpointTabs.map(tab => (
          <Link key={tab.key} to={tab.path} className={activeTab === tab.key ? 'active' : ''}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {error && (
        <div className="card glass p-3 mb-4 flex items-center gap-2 border border-rose-500/20 bg-rose-500/5">
          <AlertTriangle size={16} className="text-rose-400" />
          <span className="text-rose-400 text-sm">{error}</span>
          <button className="ml-auto text-zinc-400 hover:text-white" onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
{/* Tab Contents */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          overviewLoading ? <LoadingSpinner text={t('Loading overview...', 'Đang tải tổng quan...')} /> : (
            <div className="overview-tab">
              <div className="kpi-grid">
                <div className="kpi-card glass"><span className="kpi-title">{t('Protected Devices', 'Thiết bị được bảo vệ')}</span><span className="kpi-value">{overviewStats.total}</span><span className="kpi-desc">{t('Registered hostnames', 'Máy đã đăng ký')}</span></div>
                <div className="kpi-card glass"><span className="kpi-title">{t('Online agents', 'Agent đang hoạt động')}</span><span className="kpi-value">{overviewStats.active}</span><span className="kpi-desc">{t('Heartbeat within 5 minutes', 'Heartbeat trong 5 phút')}</span></div>
                <div className="kpi-card glass"><span className="kpi-title">{t('Offline devices', 'Thiết bị offline')}</span><span className="kpi-value">{overviewStats.offline}</span><span className="kpi-desc">{t('Need attention', 'Cần kiểm tra')}</span></div>
                <div className="kpi-card glass"><span className="kpi-title">{t('Extension active', 'Extension đang bật')}</span><span className="kpi-value">{overviewStats.extensionActive}</span><span className="kpi-desc">{t('Browser protection', 'Bảo vệ trình duyệt')}</span></div>
                <div className="kpi-card glass"><span className="kpi-title">{t('AI Websites Monitored', 'Website AI được giám sát')}</span><span className="kpi-value">{websites.length}</span><span className="kpi-desc">{t('Controlled AI platforms', 'Nền tảng AI được kiểm soát')}</span></div>
              </div>
              {websites.length > 0 && (
                <div className="card glass mt-6">
                  <div className="card-header"><h2>{t('Protected Platforms', 'Nền tảng được bảo vệ')}</h2></div>
                  <div className="grid grid-cols-4 gap-4 p-4 text-center">
                    {websites.slice(0, 4).map(ws => (
                      <div key={ws.id} className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                        <h3 className="text-xl font-bold text-white mb-1">{ws.name}</h3>
                        <p className={`font-semibold ${ws.mode === 'Block' ? 'text-rose-400' : ws.mode === 'Mask' ? 'text-sky-400' : 'text-orange-400'}`}>{t('Mode', 'Chế độ')}: {ws.mode}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'devices' && (
          <div className="devices-tab card glass">
            <div className="endpoint-section-head">
              <div>
                <span className="endpoint-eyebrow">{t('Deployment inventory', 'Kiểm kê triển khai')}</span>
                <h2>{t('Deployed endpoint devices', 'Thiết bị đã triển khai agent')}</h2>
                <p>{t('Review which hostnames have installed protection and whether they are still active.', 'Xem máy nào đã cài agent bảo vệ và máy nào còn đang hoạt động.')}</p>
              </div>
              <div className="endpoint-search-actions">
                <div className="input-with-icon">
                  <Search size={14} className="input-icon" />
                  <input type="text" placeholder={t('Search devices...', 'Tìm thiết bị...')} value={devicesSearch} onChange={e => { setDevicesSearch(e.target.value); setDevicesPage(1); }} />
                </div>
                <button className="btn-secondary" type="button" onClick={() => void fetchDevices()}>
                  <RefreshCw size={14} /> {t('Refresh', 'Tải lại')}
                </button>
              </div>
            </div>
            <div className="deployed-device-kpis">
              <div><MonitorCheck size={18} /><strong>{deviceStats.total}</strong><span>{t('Installed devices', 'Thiết bị đã cài')}</span></div>
              <div className="ok"><Activity size={18} /><strong>{deviceStats.online}</strong><span>{t('Online now', 'Đang hoạt động')}</span></div>
              <div className="warn"><WifiOff size={18} /><strong>{deviceStats.offline}</strong><span>{t('Offline/stale', 'Offline hoặc mất heartbeat')}</span></div>
              <div><MonitorCheck size={18} /><strong>{deviceStats.extensionActive}</strong><span>{t('Extension active', 'Extension đang bật')}</span></div>
            </div>
            {devicesLoading ? <LoadingSpinner text={t('Loading devices...', 'Đang tải thiết bị...')} /> : (
              <>
                <DataTable
                  data={devices}
                  columns={[
                    { header: t('Hostname', 'Tên máy'), accessor: 'hostname', width: '150px' },
                    { header: t('User Email', 'Email người dùng'), accessor: 'userEmail', width: '240px' },
                    { header: t('Department', 'Phòng ban'), accessor: 'departmentName', width: '190px' },
                    { header: t('Activity', 'Hoạt động'), accessor: (item) => {
                      const isOnline = getDeviceOnlineRealtime(item);
                      return (
                        <span className={`device-live-pill ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? <Activity size={13} /> : <WifiOff size={13} />}
                          {isOnline ? t('Online', 'Đang hoạt động') : t('Offline', 'Không hoạt động')}
                        </span>
                      );
                    }, width: '145px' },
                    { header: t('Agent Ver', 'Phiên bản Agent'), accessor: (item) => item.agentVersion || '—', width: '130px' },
                    { header: t('Extension', 'Tiện ích'), accessor: (item) => {
                      const isExtActive = getExtensionActiveRealtime(item);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md ${isExtActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {isExtActive ? t('Active', 'Hoạt động') : t('Inactive', 'Không hoạt động')}
                        </span>
                      );
                    }, width: '170px' },
                    { header: t('Policy', 'Chính sách'), accessor: 'policyVersion', width: '170px' },
                    { header: t('Last seen', 'Lần cuối hoạt động'), accessor: (item) => formatDeviceSeen(item.lastSeen, locale), width: '165px' },
                    { header: t('Health', 'Sức khỏe'), accessor: (item) => <RiskBadge level={item.riskStatus === 'Safe' ? 'Low' : item.riskStatus === 'Warning' ? 'Medium' : 'Critical'} />, width: '140px' },
                    { header: t('Actions', 'Thao tác'), accessor: (item) => (
                      <div className="device-row-actions">
                        <button className="btn-action text-xs" onClick={() => triggerSync(item.id)}>{t('Sync', 'Đồng bộ')}</button>
                        <button className="btn-action text-xs" onClick={() => handleRotateKey(item.id)}>{t('Rotate', 'Tạo lại khóa')}</button>
                        <button className="btn-action text-xs text-rose-400" onClick={() => handleRevokeKey(item.id)}>{t('Revoke', 'Thu hồi')}</button>
                      </div>
                    ), width: '280px' }
                  ]}
                />
                <Pagination page={devicesPage} totalPages={devicesTotalPages} totalCount={devicesTotalCount} pageSize={20} onPageChange={setDevicesPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'websites' && (
          <div className="websites-tab card glass">
            <div className="card-header">
              <h2>{t('Controlled AI Websites & Protection Modes', 'Website AI được kiểm soát và chế độ bảo vệ')}</h2>
              <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> {t('Add Domain', 'Thêm tên miền')}
              </button>
            </div>
            {websitesLoading ? <LoadingSpinner text={t('Loading websites...', 'Đang tải website...')} /> : (
              <>
              <DataTable
                data={websites}
                columns={[
                  { header: t('AI Platform', 'Nền tảng AI'), accessor: 'name' },
                  { header: t('Domain Matches', 'Tên miền khớp'), accessor: 'domainPattern' },
                  { header: t('Protection Mode', 'Chế độ bảo vệ'), accessor: (item) => <DecisionBadge decision={item.mode === 'RequireApproval' ? 'PendingApproval' : item.mode as any} /> },
                  { header: t('Last Updated', 'Cập nhật lần cuối'), accessor: (item) => new Date(item.lastUpdated).toLocaleDateString(locale), width: '150px' },
                  { header: t('Status', 'Trạng thái'), accessor: (item) => (
                    <label className="switch">
                      <input type="checkbox" checked={item.isActive} onChange={() => handleToggleWebsite(item.id, item.isActive)} />
                      <span className="slider round"></span>
                    </label>
                  ), width: '100px' },
                  { header: t('Action', 'Thao tác'), accessor: (item) => (
                    <button className="btn-action text-xs text-rose-400" onClick={() => handleDeleteWebsite(item.id)}>{t('Delete', 'Xóa')}</button>
                  ), width: '80px' }
                ]}
              />
              <div className="shadow-ai-section">
                <div className="card-header mt-6">
                  <div>
                    <h2>Shadow AI Discovery</h2>
                    <p className="subtitle">Website AI được phát hiện từ thiết bị, kể cả nền tảng chưa có trong allowlist.</p>
                  </div>
                  <span className="counter">{shadowDiscoveries.filter(item => !item.isApproved).length} chưa được phép</span>
                </div>
                <DataTable
                  data={shadowDiscoveries}
                  columns={[
                    { header: 'Tên miền', accessor: 'domain' },
                    { header: 'Người dùng', accessor: 'userEmail' },
                    { header: 'Thiết bị', accessor: 'hostname' },
                    { header: 'Số lượt', accessor: (item) => item.visitCount, width: '80px' },
                    { header: 'Lần cuối', accessor: (item) => new Date(item.lastSeenAt).toLocaleString(locale), width: '170px' },
                    { header: 'Quyết định', accessor: (item) => <DecisionBadge decision={item.decision as any} />, width: '140px' },
                    { header: 'Trạng thái', accessor: (item) => item.isApproved ? 'Đã quản lý' : 'Shadow AI', width: '120px' }
                  ]}
                />
              </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-tab card glass">
            <div className="card-header">
              <h2>{t('Endpoint DLP Logs', 'Nhật ký DLP thiết bị')}</h2>
            </div>
            {eventsLoading ? <LoadingSpinner text={t('Loading events...', 'Đang tải sự kiện...')} /> : (
              <>
                <DataTable
                  data={events}
                  columns={[
                    { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                    { header: t('User', 'Người dùng'), accessor: 'userEmail' },
                    { header: t('Hostname', 'Tên máy'), accessor: 'hostname', width: '120px' },
                    { header: t('Platform', 'Nền tảng'), accessor: 'websiteAi', width: '120px' },
                    { header: t('Matched data', 'Dữ liệu phát hiện'), accessor: 'dataTypeMatched' },
                    { header: t('Masked Preview', 'Nội dung đã che'), accessor: (item) => item.maskedContentPreview || '—' },
                    { header: t('Decision', 'Quyết định'), accessor: (item) => <DecisionBadge decision={item.decision as any} />, width: '150px' }
                  ]}
                />
                <Pagination page={eventsPage} totalPages={eventsTotalPages} totalCount={eventsTotalCount} pageSize={20} onPageChange={setEventsPage} />
                <div className="shadow-ai-section">
                  <div className="card-header mt-6">
                    <div>
                      <h2>Desktop Agent Telemetry</h2>
                      <p className="subtitle">Metadata USB, network share, RDP, email client và dịch vụ in. Không thu nội dung clipboard hoặc tài liệu.</p>
                    </div>
                  </div>
                  <DataTable
                    data={telemetry}
                    columns={[
                      { header: 'Thời gian', accessor: (item) => new Date(item.occurredAt).toLocaleString(locale), width: '170px' },
                      { header: 'Thiết bị', accessor: 'hostname' },
                      { header: 'Người dùng', accessor: 'userEmail' },
                      { header: 'Nhóm', accessor: 'category' },
                      { header: 'Sự kiện', accessor: 'eventType' },
                      { header: 'Chi tiết', accessor: (item) => item.detail || '-' },
                      { header: 'Mức độ', accessor: (item) => <RiskBadge level={
                        item.severity === 'Critical' || item.severity === 'High' || item.severity === 'Medium'
                          ? item.severity
                          : 'Low'
                      } />, width: '110px' }
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'agent' && (
          deployLoading ? <LoadingSpinner text={t('Loading deployment info...', 'Đang tải thông tin triển khai...')} /> : (
            <div className="endpoint-manager-grid">
              <section className="card glass endpoint-manager-card">
                <div className="endpoint-manager-title">
                  <span><TerminalSquare size={20} /></span>
                  <div>
                    <h2>aiguard-endpoint-agent</h2>
                    <p>Quản lý bộ cài Desktop Agent, token đăng ký và lệnh cài đặt cho máy Windows.</p>
                  </div>
                </div>
                <div className="endpoint-manager-actions">
                  <a href="/aiguard-endpoint-agent.exe" download="aiguard-endpoint-agent.exe" className="btn-primary">
                    <Download size={14} /> Tải agent EXE
                  </a>
                  <button className="btn-secondary" type="button" onClick={() => void handleRotateToken('agent')} disabled={rotatingKeyFor === 'agent'}>
                    <RefreshCw size={14} /> {rotatingKeyFor === 'agent' ? 'Đang reset...' : 'Reset Agent Key'}
                  </button>
                </div>
                <div className={`endpoint-token-card ${lastRotatedKeyFor === 'agent' ? 'fresh' : ''}`}>
                  <span>Agent enrollment key</span>
                  <strong>{deployToken?.token ? deployToken.token : 'Token chỉ hiển thị khi tạo lại'}</strong>
                  <small>Reset riêng cho Desktop Agent · Tenant: {deployToken?.tenantCode || '-'} · Hết hạn: {deployToken?.expiresAt ? new Date(deployToken.expiresAt).toLocaleDateString(locale) : '-'}</small>
                </div>
                <div className="endpoint-command-box">
                  <div>
                    <strong>Lệnh cài Desktop Agent</strong>
                    <button className="btn-action text-xs" type="button" onClick={() => copyToClipboard('agent', deployToken?.installCommand)}>
                      {copiedCommand === 'agent' ? 'Đã copy' : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                  <code>{deployToken?.installCommand || 'Tạo lại token để sinh lệnh cài đặt Desktop Agent.'}</code>
                </div>
              </section>

              <section className="card glass endpoint-manager-card">
                <div className="endpoint-manager-title">
                  <span><MonitorCheck size={20} /></span>
                  <div>
                    <h2>Trạng thái Desktop Agent</h2>
                    <p>Xem nhanh máy nào đã cài agent và còn gửi heartbeat trong 5 phút gần nhất.</p>
                  </div>
                </div>
                <div className="deployed-device-kpis compact">
                  <div><MonitorCheck size={18} /><strong>{deviceStats.total}</strong><span>Thiết bị đã cài</span></div>
                  <div className="ok"><Activity size={18} /><strong>{deviceStats.online}</strong><span>Agent online</span></div>
                  <div className="warn"><WifiOff size={18} /><strong>{deviceStats.offline}</strong><span>Mất heartbeat</span></div>
                </div>
                <Link className="btn-secondary endpoint-wide-link" to="/app/endpoints/devices">
                  Xem danh sách thiết bị đã triển khai
                </Link>
              </section>
            </div>
          )
        )}

        {activeTab === 'extension' && (
          deployLoading ? <LoadingSpinner text={t('Loading deployment info...', 'Đang tải thông tin triển khai...')} /> : (
            <div className="endpoint-manager-grid">
              <section className="card glass endpoint-manager-card">
                <div className="endpoint-manager-title">
                  <span><Puzzle size={20} /></span>
                  <div>
                    <h2>aiguard-extension</h2>
                    <p>Quản lý extension Chrome/Edge, link setup và lệnh cấu hình cho trình duyệt.</p>
                  </div>
                </div>
                <div className="endpoint-manager-actions">
                  <a href="/aiguard-extension.zip" download="aiguard-extension.zip" className="btn-primary">
                    <Download size={14} /> Tải extension ZIP
                  </a>
                  <button className="btn-secondary" type="button" onClick={() => void handleRotateToken('extension')} disabled={rotatingKeyFor === 'extension'}>
                    <RefreshCw size={14} /> {rotatingKeyFor === 'extension' ? 'Đang reset...' : 'Reset Extension Key'}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => copyToClipboard('url', deployToken?.extensionSetupUrl)}>
                    {copiedCommand === 'url' ? 'Đã copy URL' : <><Copy size={14} /> Copy setup URL</>}
                  </button>
                </div>
                <div className={`endpoint-token-card ${lastRotatedKeyFor === 'extension' ? 'fresh' : ''}`}>
                  <span>Extension enrollment key</span>
                  <strong>{deployToken?.token ? deployToken.token : 'Token chỉ hiển thị khi reset Extension Key'}</strong>
                  <small>Reset riêng cho Browser Extension · Tenant: {deployToken?.tenantCode || '-'} · Hết hạn: {deployToken?.expiresAt ? new Date(deployToken.expiresAt).toLocaleDateString(locale) : '-'}</small>
                </div>
                <div className="endpoint-command-box">
                  <div>
                    <strong>Lệnh setup Browser Extension</strong>
                    <button className="btn-action text-xs" type="button" onClick={() => copyToClipboard('extension', deployToken?.extensionSetupCommand)}>
                      {copiedCommand === 'extension' ? 'Đã copy' : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                  <code>{deployToken?.extensionSetupCommand || 'Tạo lại token để sinh lệnh setup Browser Extension.'}</code>
                </div>
                <div className="endpoint-command-box">
                  <div><strong>Setup URL</strong></div>
                  <code>{deployToken?.extensionSetupUrl || 'Chưa có setup URL.'}</code>
                </div>
              </section>

              <section className="card glass endpoint-manager-card">
                <div className="endpoint-manager-title">
                  <span><Activity size={20} /></span>
                  <div>
                    <h2>Theo dõi extension realtime</h2>
                    <p>Extension gửi heartbeat và DLP event về giao diện quản trị.</p>
                  </div>
                </div>
                <div className="deployed-device-kpis compact">
                  <div className="ok"><Puzzle size={18} /><strong>{deviceStats.extensionActive}</strong><span>Extension đang bật</span></div>
                  <div><Activity size={18} /><strong>{extensionEvents.length}</strong><span>Sự kiện realtime</span></div>
                  <div><MonitorCheck size={18} /><strong>{extensionStatus.size}</strong><span>Thiết bị realtime</span></div>
                </div>
                <div className="extension-event-list">
                  {extensionEvents.slice(0, 5).map((event, index) => (
                    <div key={`${event.createdAt}-${index}`}>
                      <strong>{event.hostname}</strong>
                      <span>{event.websiteAi} · {event.decision} · {new Date(event.createdAt).toLocaleTimeString(locale)}</span>
                    </div>
                  ))}
                  {extensionEvents.length === 0 && <p>Chưa có sự kiện realtime từ extension.</p>}
                </div>
                <Link className="btn-secondary endpoint-wide-link" to="/app/endpoints/events">
                  Xem nhật ký DLP / extension
                </Link>
              </section>
            </div>
          )
        )}

        {activeTab === 'deployment' && (
          deployLoading ? <LoadingSpinner text={t('Loading deployment info...', 'Đang tải thông tin triển khai...')} /> : (
            <div className="deployment-tab grid grid-cols-2 gap-6">
              <div className="card glass p-6">
                <h2 className="mb-4">{t('1. Download Installer Bundles', '1. Tải bộ cài đặt')}</h2>
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">Windows Desktop Agent (.EXE)</h3>
                      <p className="text-xs text-zinc-400">{t('For Registry and Clipboard control', 'Kiểm soát Registry và Clipboard')}</p>
                    </div>
                    <a href="/aiguard-endpoint-agent.exe" download="aiguard-endpoint-agent.exe" className="btn-action flex items-center gap-1.5">
                      <Download size={14} /> {t('Download', 'Tải xuống')}
                    </a>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">Chrome / Edge Extension (.ZIP)</h3>
                      <p className="text-xs text-zinc-400">{t('For Textbox monitoring and submit interception', 'Giám sát ô nhập liệu và chặn thao tác gửi')}</p>
                    </div>
                    <a href="/aiguard-extension.zip" download="aiguard-extension.zip" className="btn-action flex items-center gap-1.5">
                      <Download size={14} /> {t('Download', 'Tải xuống')}
                    </a>
                  </div>
                </div>
                {deployToken && (
                  <div className="mt-4 p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white">{t('Enrollment Token', 'Mã đăng ký thiết bị')}</h3>
                      <button className="btn-action text-xs flex items-center gap-1" onClick={() => void handleRotateToken('agent')}>
                        <RefreshCw size={12} /> {t('Rotate Token', 'Tạo lại mã')}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">Tenant: {deployToken.tenantCode} · {t('Expires', 'Hết hạn')}: {new Date(deployToken.expiresAt).toLocaleDateString(locale)}</p>
                  </div>
                )}
              </div>

              <div className="card glass p-6">
                <h2 className="mb-2">{t('2. Deployment commands', '2. Lệnh triển khai')}</h2>
                <p className="text-sm text-zinc-400 mb-4">{t('Copy the correct command for Desktop Agent or Browser Extension deployment.', 'Sao chép lệnh phù hợp để triển khai Desktop Agent hoặc Browser Extension.')}</p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">Desktop Agent</h3>
                      <button
                        className="btn-action text-xs flex items-center gap-1"
                        onClick={() => copyToClipboard('agent', deployToken?.installCommand)}
                        title={t('Copy command', 'Sao chép lệnh')}
                      >
                        {copiedCommand === 'agent' ? t('Copied!', 'Đã sao chép!') : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <div className="p-4 rounded bg-zinc-900 border border-zinc-700">
                      <code className="block whitespace-pre-wrap text-xs text-indigo-400 font-mono select-all">
                        {deployToken?.installCommand || 'Rotate token to generate Desktop Agent install command'}
                      </code>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">Browser Extension</h3>
                      <button
                        className="btn-action text-xs flex items-center gap-1"
                        onClick={() => copyToClipboard('extension', deployToken?.extensionSetupCommand)}
                        title={t('Copy extension setup', 'Sao chép lệnh setup extension')}
                      >
                        {copiedCommand === 'extension' ? t('Copied!', 'Đã sao chép!') : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <div className="p-4 rounded bg-zinc-900 border border-zinc-700">
                      <code className="block whitespace-pre-wrap text-xs text-emerald-400 font-mono select-all">
                        {deployToken?.extensionSetupCommand || 'Rotate token to generate Browser Extension setup command'}
                      </code>
                    </div>
                    {deployToken?.extensionSetupUrl && (
                      <button
                        className="btn-action text-xs mt-2 flex items-center gap-1"
                        onClick={() => copyToClipboard('url', deployToken.extensionSetupUrl)}
                      >
                        {copiedCommand === 'url' ? t('Copied setup URL!', 'Đã sao chép setup URL!') : <><Copy size={13} /> Copy setup URL</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Add Website Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-lg w-full glass">
            <div className="modal-header">
              <h2>{t('Add AI Website Rule', 'Thêm quy tắc website AI')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body flex flex-col gap-4 text-sm">
              <div className="form-group">
                <label className="block text-zinc-400 font-semibold mb-1">{t('Platform Name', 'Tên nền tảng')}</label>
                <input type="text" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="e.g. DeepSeek" className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded w-full" />
              </div>
              <div className="form-group">
                <label className="block text-zinc-400 font-semibold mb-1">{t('Domain Pattern', 'Mẫu tên miền')}</label>
                <input type="text" value={newRule.domainPattern} onChange={e => setNewRule(p => ({ ...p, domainPattern: e.target.value }))} placeholder="e.g. *.deepseek.com" className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded w-full" />
              </div>
              <div className="form-group">
                <label className="block text-zinc-400 font-semibold mb-1">{t('Protection Mode', 'Chế độ bảo vệ')}</label>
                <select value={newRule.mode} onChange={e => setNewRule(p => ({ ...p, mode: e.target.value }))} className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded w-full">
                  <option value="Block">{t('Block', 'Chặn')}</option>
                  <option value="Mask">{t('Mask', 'Che dữ liệu')}</option>
                  <option value="PendingApproval">{t('Require Approval', 'Yêu cầu phê duyệt')}</option>
                  <option value="Allow">{t('Allow (Monitor)', 'Cho phép (giám sát)')}</option>
                </select>
              </div>
            </div>
            <div className="modal-footer flex justify-end gap-2 mt-4">
              <button className="btn-action px-3 py-1.5" onClick={() => setShowAddModal(false)}>{t('Cancel', 'Hủy')}</button>
              <button className="btn-primary px-3 py-1.5" onClick={handleAddWebsite}>{t('Create Rule', 'Tạo quy tắc')}</button>
            </div>
          </div>
        </div>
      )}
      {rotatedKey && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xl w-full glass">
            <div className="modal-header"><h2>{t('New Endpoint Key', 'Khóa thiết bị mới')}</h2></div>
            <div className="modal-body">
              <p className="text-sm text-amber-400 mb-3">{t('This key is shown once. Update the endpoint immediately.', 'Khóa chỉ hiển thị một lần. Hãy cập nhật thiết bị ngay.')}</p>
              <code className="block p-3 bg-zinc-900 border border-zinc-700 rounded break-all">{rotatedKey}</code>
            </div>
            <div className="modal-footer mt-4 flex justify-end">
              <button className="btn-primary px-3 py-1.5" onClick={() => setRotatedKey(null)}>{t('I saved the key', 'Tôi đã lưu khóa')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Endpoints;
