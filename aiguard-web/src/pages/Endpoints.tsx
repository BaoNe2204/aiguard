import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Download, MonitorCheck, RefreshCw, Plus, Search, Copy, X, AlertTriangle, WifiOff, Puzzle, TerminalSquare, ChevronDown } from 'lucide-react';
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
  type EndpointTelemetryResponse,
  type DeviceAiWebsiteOverrideDto
} from '../api/endpoints';
import { policiesApi, type SecurityPolicyResponse } from '../api/policies';
import { useLanguage } from '../contexts/LanguageContext';
import { useRealtimeExtension } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'overview' | 'devices' | 'custom-settings' | 'websites' | 'dlp-events' | 'telemetry' | 'agent' | 'extension' | 'deployment';

const endpointTabs: Array<{ key: TabType; path: string; label: string }> = [
  { key: 'overview', path: '/app/endpoints', label: 'Tổng quan' },
  { key: 'devices', path: '/app/endpoints/devices', label: 'Thiết bị đã triển khai' },
  { key: 'custom-settings', path: '/app/endpoints/custom-settings', label: 'Cài đặt riêng' },
  { key: 'websites', path: '/app/endpoints/ai-websites', label: 'Website AI theo dõi' },
  { key: 'dlp-events', path: '/app/endpoints/dlp-events', label: 'Nhật ký DLP' },
  { key: 'telemetry', path: '/app/endpoints/telemetry', label: 'Telemetry Agent' },
  { key: 'agent', path: '/app/endpoints/agent', label: 'Desktop Agent' },
  { key: 'extension', path: '/app/endpoints/extension', label: 'Browser Extension' }
];

function isDeviceOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  const normalized = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z';
  return Date.now() - new Date(normalized).getTime() <= 45 * 1000;
}

function formatDeviceSeen(value: string, locale: string) {
  const normalized = value.endsWith('Z') ? value : value + 'Z';
  const seen = new Date(normalized);
  const diffMinutes = Math.max(0, Math.round((Date.now() - seen.getTime()) / 60000));
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  return seen.toLocaleString(locale);
}

export const Endpoints: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceResponse | null>(null);

  const ActionDropdown = ({ item, onSync, onRotate, onDelete, t }: any) => {
    const [open, setOpen] = useState(false);
    return (
      <div
        className="relative inline-block text-left"
        tabIndex={-1}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <button
          type="button"
          className="btn-action flex items-center gap-1 px-3 py-1.5 text-xs"
          onClick={() => setOpen(!open)}
          style={{ minWidth: '95px', justifyContent: 'space-between' }}
        >
          {t('Actions', 'Thao tác')} <ChevronDown size={14} />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-36 origin-top-right glass shadow-xl z-50 p-1.5 flex flex-col gap-1">
            <button
              className="btn-action w-full text-left text-xs"
              style={{ border: 'none', background: 'transparent' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); setSelectedDevice(item); }}
            >
              {t('View Details', 'Xem chi tiết')}
            </button>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '2px 0' }}></div>
            <button
              className="btn-action w-full text-left text-xs"
              style={{ border: 'none', background: 'transparent' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onSync(item.id); }}
            >
              {t('Sync Policy', 'Đồng bộ')}
            </button>
            <button
              className="btn-action w-full text-left text-xs"
              style={{ border: 'none', background: 'transparent' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onRotate(item); }}
            >
              {t('Rotate Key', 'Tạo lại khóa')}
            </button>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '2px 0' }}></div>
            <button
              className="btn-action w-full text-left text-xs text-rose-400"
              style={{ border: 'none', background: 'transparent', color: '#f87171' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onDelete(item); }}
            >
              {t('Delete Device', 'Xóa thiết bị')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const location = useLocation();
  const { t, locale } = useLanguage();
  const { user } = useAuth();

  const getSetupValue = (value?: string) => {
    if (!value) return '';
    let res = value;
    if (user?.email) {
      res = res.replace(/<employee@company\.com>/g, user.email);
    }
    if (user?.departmentName) {
      res = res.replace(/<department>/g, user.departmentName);
    } else {
      res = res.replace(/<department>/g, 'Default');
    }
    res = res.replace(/<extension-id>/g, 'extension-id');
    return res;
  };

  const activeTab: TabType = location.pathname.endsWith('/devices') ? 'devices'
    : location.pathname.endsWith('/custom-settings') ? 'custom-settings'
    : location.pathname.endsWith('/events') || location.pathname.endsWith('/dlp-events') ? 'dlp-events'
      : location.pathname.endsWith('/telemetry') ? 'telemetry'
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
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});
  const [deviceActionStatus, setDeviceActionStatus] = useState<Record<string, string>>({});
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [rotateKeyModal, setRotateKeyModal] = useState<DeviceResponse | null>(null);
  const [deleteDeviceModal, setDeleteDeviceModal] = useState<DeviceResponse | null>(null);

  // ── Custom Settings states ──
  const [customSettingsDevice, setCustomSettingsDevice] = useState<DeviceResponse | null>(null);
  const [availablePolicies, setAvailablePolicies] = useState<SecurityPolicyResponse[]>([]);
  const [customSettingsLoading, setCustomSettingsLoading] = useState(false);
  const [customPolicyId, setCustomPolicyId] = useState<string | null>(null);
  const [websiteOverrides, setWebsiteOverrides] = useState<DeviceAiWebsiteOverrideDto[]>([]);
  const [savingCustomSettings, setSavingCustomSettings] = useState(false);

  // ── Selected DLP Event Details state ──
  const [selectedEvent, setSelectedEvent] = useState<EndpointEventResponse | null>(null);

  // ── Events state ──
  const [events, setEvents] = useState<EndpointEventResponse[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotalCount, setEventsTotalCount] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(false);

  // ── Telemetry state ──
  const [telemetry, setTelemetry] = useState<EndpointTelemetryResponse[]>([]);
  const [telemetryPage, setTelemetryPage] = useState(1);
  const [telemetryTotalPages, setTelemetryTotalPages] = useState(1);
  const [telemetryTotalCount, setTelemetryTotalCount] = useState(0);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

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
      const result = await endpointsApi.getDevices({ page: devicesPage, pageSize: 10, search: devicesSearch });
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
      const result = await endpointsApi.getEvents({ page: eventsPage, pageSize: 10 });
      setEvents(result.items);
      setEventsTotalPages(result.totalPages);
      setEventsTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, [eventsPage]);

  // ── Fetch Telemetry ──
  const fetchTelemetry = useCallback(async () => {
    setTelemetryLoading(true);
    try {
      const result = await endpointsApi.getTelemetry({ page: telemetryPage, pageSize: 10 });
      setTelemetry(result.items);
      setTelemetryTotalPages(result.totalPages);
      setTelemetryTotalCount(result.totalCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTelemetryLoading(false);
    }
  }, [telemetryPage]);

  // ── Open Custom Settings Modal ──
  const openCustomSettingsModal = async (device: DeviceResponse) => {
    setCustomSettingsDevice(device);
    setCustomSettingsLoading(true);
    try {
      const policies = await policiesApi.getDepartmentPolicies();
      setAvailablePolicies(policies);

      const settings = await endpointsApi.getDeviceCustomSettings(device.id);
      setCustomPolicyId(settings.customSecurityPolicyId);
      setWebsiteOverrides(settings.aiWebsiteOverrides);
    } catch (err: any) {
      setError(err.message || 'Không thể tải cấu hình riêng của thiết bị.');
    } finally {
      setCustomSettingsLoading(false);
    }
  };

  const handleOverrideChange = (aiWebsiteId: string, value: string) => {
    setWebsiteOverrides(prev =>
      prev.map(item =>
        item.aiWebsiteId === aiWebsiteId
          ? { ...item, overrideMode: value }
          : item
      )
    );
  };

  const handleSaveCustomSettings = async () => {
    if (!customSettingsDevice) return;
    setSavingCustomSettings(true);
    try {
      await endpointsApi.updateDeviceCustomSettings(customSettingsDevice.id, {
        customSecurityPolicyId: customPolicyId,
        aiWebsiteOverrides: websiteOverrides
      });
      try {
        await endpointsApi.refreshPolicy(customSettingsDevice.id);
      } catch (e) {
        console.error("Failed to trigger policy refresh", e);
      }
      setCustomSettingsDevice(null);
      await fetchDevices();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu cấu hình riêng.');
    } finally {
      setSavingCustomSettings(false);
    }
  };

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
    else if (activeTab === 'devices' || activeTab === 'custom-settings') {
      fetchDevices();
      const interval = setInterval(fetchDevices, 30000);
      return () => clearInterval(interval);
    }
    else if (activeTab === 'dlp-events') fetchEvents();
    else if (activeTab === 'telemetry') fetchTelemetry();
    else if (activeTab === 'websites') fetchWebsites();
    else if (activeTab === 'agent' || activeTab === 'extension') {
      fetchDeployment();
      fetchDevices();
    }
    else if (activeTab === 'deployment') fetchDeployment();
  }, [activeTab, fetchDevices, fetchEvents, fetchTelemetry, fetchWebsites, fetchDeployment, fetchOverview]);

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
    try {
      const result = await endpointsApi.rotateEndpointKey(id);
      setRotatedKey(result.endpointKey);
      setDeviceActionStatus(prev => ({ ...prev, [id]: t('New key created', 'Đã tạo khóa mới') }));
      await fetchDevices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Key rotation failed');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      await endpointsApi.deleteDevice(id);
      setDeviceActionStatus(prev => ({ ...prev, [id]: t('Device deleted', 'Đã xóa thiết bị') }));
      await fetchDevices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
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
    if (device.endpointKeyRevoked || device.isRemoteDisabled) return false;
    const s = extensionStatus.get(device.id);
    if (s) return s.connected;
    return isDeviceOnline(device.lastSeen);
  };

  const getExtensionActiveRealtime = (device: DeviceResponse) => {
    if (device.endpointKeyRevoked || device.isRemoteDisabled) return false;
    const s = extensionStatus.get(device.id);
    if (s && s.connected) return true;
    return device.extensionActive;
  };

  const deviceStats = {
    total: overviewStats.total > 0 ? overviewStats.total : (devicesTotalCount || devices.length),
    online: overviewStats.active > 0 ? overviewStats.active : devices.filter(device => getDeviceOnlineRealtime(device)).length,
    offline: overviewStats.offline > 0 ? overviewStats.offline : devices.filter(device => !getDeviceOnlineRealtime(device)).length,
    extensionActive: overviewStats.extensionActive > 0 ? overviewStats.extensionActive : devices.filter(device => getExtensionActiveRealtime(device)).length
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
                    { header: t('Hostname', 'Tên máy'), accessor: 'hostname', width: '20%' },
                    { header: t('User Email', 'Email người dùng'), accessor: 'userEmail' },
                    { header: t('Department', 'Phòng ban'), accessor: 'departmentName', width: '12%' },
                    {
                      header: t('Agent Status', 'Trạng thái Agent'), accessor: (item) => {
                        if (item.endpointKeyRevoked) {
                          return (
                            <span className="device-live-pill revoked">
                              <WifiOff size={13} />
                              {t('Revoked', 'Đã thu hồi')}
                            </span>
                          );
                        }
                        const isOnline = getDeviceOnlineRealtime(item);
                        return (
                          <span className={`device-live-pill ${isOnline ? 'online' : 'offline'}`}>
                            {isOnline ? <Activity size={13} /> : <WifiOff size={13} />}
                            {isOnline ? t('Online', 'Đang hoạt động') : t('Offline', 'Không hoạt động')}
                          </span>
                        );
                      }, width: '160px', align: 'center'
                    },
                    {
                      header: t('Extension Status', 'Trạng thái Tiện ích'), accessor: (item) => {
                        const isExtActive = getExtensionActiveRealtime(item);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md ${isExtActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {isExtActive ? t('Active', 'Hoạt động') : t('Inactive', 'Không hoạt động')}
                          </span>
                        );
                      }, width: '180px'
                    },
                    { header: t('Last seen', 'Lần cuối hoạt động'), accessor: (item) => formatDeviceSeen(item.lastSeen, locale), width: '15%' },
                    {
                      header: t('Actions', 'Thao tác'), accessor: (item) => (
                        <div className="flex flex-col items-end gap-1">
                          <ActionDropdown item={item} onSync={triggerSync} onRotate={setRotateKeyModal} onDelete={setDeleteDeviceModal} t={t} />
                          {syncStatus[item.id] && <span className="text-emerald-400 text-[11px] font-medium whitespace-nowrap">{syncStatus[item.id]}</span>}
                          {deviceActionStatus[item.id] && <span className="text-sky-300 text-[11px] font-medium whitespace-nowrap">{deviceActionStatus[item.id]}</span>}
                        </div>
                      ), width: '120px'
                    }
                  ]}
                />
                <Pagination page={devicesPage} totalPages={devicesTotalPages} totalCount={devicesTotalCount} pageSize={10} onPageChange={setDevicesPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'custom-settings' && (
          <div className="custom-settings-tab card glass">
            <div className="endpoint-section-head">
              <div>
                <span className="endpoint-eyebrow">{t('Custom settings', 'Cài đặt riêng')}</span>
                <h2>{t('Custom Settings for Accounts & Devices', 'Cài đặt riêng cho từng thiết bị')}</h2>
                <p>{t('Override default policy and configure custom AI websites or protection modes for each account.', 'Cấu hình chính sách bảo mật và chế độ bảo vệ AI website riêng cho từng tài khoản và thiết bị.')}</p>
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
            {devicesLoading ? <LoadingSpinner text={t('Loading devices...', 'Đang tải thiết bị...')} /> : (
              <>
                <DataTable
                  data={devices}
                  columns={[
                    { header: t('Hostname', 'Tên máy'), accessor: 'hostname', width: '25%' },
                    { header: t('User Email', 'Email người dùng'), accessor: 'userEmail' },
                    { header: t('Department', 'Phòng ban'), accessor: 'departmentName', width: '20%' },
                    { header: t('Policy version', 'Phiên bản chính sách'), accessor: 'policyVersion', width: '20%' },
                    {
                      header: t('Actions', 'Thao tác'), accessor: (item) => (
                        <button
                          className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          onClick={() => openCustomSettingsModal(item)}
                        >
                          {t('Settings', 'Cài đặt')}
                        </button>
                      ), width: '120px'
                    }
                  ]}
                />
                <Pagination page={devicesPage} totalPages={devicesTotalPages} totalCount={devicesTotalCount} pageSize={10} onPageChange={setDevicesPage} />
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
                    {
                      header: t('Status', 'Trạng thái'), accessor: (item) => (
                        <label className="switch">
                          <input type="checkbox" checked={item.isActive} onChange={() => handleToggleWebsite(item.id, item.isActive)} />
                          <span className="slider round"></span>
                        </label>
                      ), width: '100px'
                    },
                    {
                      header: t('Action', 'Thao tác'), accessor: (item) => (
                        <button className="btn-action text-xs text-rose-400" onClick={() => handleDeleteWebsite(item.id)}>{t('Delete', 'Xóa')}</button>
                      ), width: '80px'
                    }
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

        {activeTab === 'dlp-events' && (
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
                    { 
                      header: t('Masked Preview', 'Nội dung đã che'), 
                      accessor: (item) => item.maskedContentPreview ? (item.maskedContentPreview.length > 40 ? item.maskedContentPreview.substring(0, 40) + '...' : item.maskedContentPreview) : '—' 
                    },
                    { header: t('Decision', 'Quyết định'), accessor: (item) => <DecisionBadge decision={item.decision as any} />, width: '150px' },
                    {
                      header: t('Action', 'Thao tác'), accessor: (item) => (
                        <button className="btn-action text-xs flex items-center gap-1" onClick={() => setSelectedEvent(item)}>
                          {t('View Details', 'Xem chi tiết')}
                        </button>
                      ), width: '120px'
                    }
                  ]}
                />
                <Pagination page={eventsPage} totalPages={eventsTotalPages} totalCount={eventsTotalCount} pageSize={10} onPageChange={setEventsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="telemetry-tab card glass">
            <div className="card-header">
              <h2>Desktop Agent Telemetry</h2>
              <p className="subtitle">Metadata USB, network share, RDP, email client và dịch vụ in. Không thu nội dung clipboard hoặc tài liệu.</p>
            </div>
            {telemetryLoading ? <LoadingSpinner text={t('Loading telemetry...', 'Đang tải dữ liệu...')} /> : (
              <>
                <DataTable
                  data={telemetry}
                  columns={[
                    { header: 'Thời gian', accessor: (item) => new Date(item.occurredAt).toLocaleString(locale), width: '170px' },
                    { header: 'Thiết bị', accessor: 'hostname' },
                    { header: 'Người dùng', accessor: 'userEmail' },
                    { header: 'Nhóm', accessor: 'category' },
                    { header: 'Sự kiện', accessor: 'eventType' },
                    { header: 'Chi tiết', accessor: (item) => item.detail || '-' },
                    {
                      header: 'Mức độ', accessor: (item) => <RiskBadge level={
                        item.severity === 'Critical' || item.severity === 'High' || item.severity === 'Medium'
                          ? item.severity
                          : 'Low'
                      } />, width: '110px'
                    }
                  ]}
                />
                <Pagination page={telemetryPage} totalPages={telemetryTotalPages} totalCount={telemetryTotalCount} pageSize={10} onPageChange={setTelemetryPage} />
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
                  <div className="flex items-center gap-2">
                    <strong className="break-all flex-1">{deployToken?.token ? deployToken.token : 'Token chỉ hiển thị khi tạo lại'}</strong>
                    <button
                      className="btn-action text-xs flex items-center gap-1"
                      type="button"
                      onClick={() => copyToClipboard('agent', deployToken?.token || undefined)}
                      title={t('Copy key', 'Sao chép key')}
                      disabled={!deployToken?.token}
                    >
                      {copiedCommand === 'agent' ? 'Đã copy' : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
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

              <section className="card glass endpoint-agent-brief">
                <div className="endpoint-manager-title">
                  <span><Activity size={20} /></span>
                  <div>
                    <h2>Năng lực Desktop Agent</h2>
                    <p>Giám sát endpoint Windows, phát hiện AI coding app và bảo vệ workspace có source code hoặc developer secrets.</p>
                  </div>
                </div>
                <div className="endpoint-agent-capabilities">
                  <div>
                    <strong>Enroll & policy sync</strong>
                    <span>Đăng ký bằng enrollment token, lưu endpoint key an toàn, heartbeat định kỳ và đồng bộ security policy.</span>
                  </div>
                  <div>
                    <strong>AI coding app protection</strong>
                    <span>Phát hiện Cursor, Copilot, VS Code AI, Claude Desktop, Codex, Windsurf, Trae, Tabnine khi chạy trong workspace nhạy cảm.</span>
                  </div>
                  <div>
                    <strong>Developer secret detection</strong>
                    <span>Nhận diện .env, private key, appsettings production, certificate, source workspace và chấm risk score.</span>
                  </div>
                  <div>
                    <strong>DLP & telemetry</strong>
                    <span>Scan prompt/file qua DLP API, gửi telemetry USB, network share, RDP, email client, print spooler và trạng thái AI coding app.</span>
                  </div>
                </div>
              </section>

              <section className="card glass endpoint-agent-limits">
                <div className="endpoint-manager-title">
                  <span><AlertTriangle size={20} /></span>
                  <div>
                    <h2>Giới hạn Desktop Agent</h2>
                    <p>Một số tác vụ cần helper ký số, driver, GPO hoặc Intune để chặn ở mức hệ điều hành.</p>
                  </div>
                </div>
                <div className="endpoint-limit-list">
                  <div className="blocked"><b>Không chặn clipboard interactive</b><span>Cần helper ký số hoặc driver để can thiệp sâu.</span></div>
                  <div className="blocked"><b>Không chặn USB/print ở kernel level</b><span>Cần GPO, Intune hoặc driver chuyên dụng.</span></div>
                  <div className="allowed"><b>Giám sát và gửi telemetry</b><span>Admin xem log, nhận cảnh báo và quyết định hành động phù hợp.</span></div>
                </div>
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
                    <p>Quản lý extension Chrome/Edge, chỉ hiển thị key để nhân viên nhập trực tiếp.</p>
                  </div>
                </div>
                <div className="endpoint-manager-actions">
                  <a href="/aiguard-extension.zip" download="aiguard-extension.zip" className="btn-primary">
                    <Download size={14} /> Tải extension ZIP
                  </a>
                  <button className="btn-secondary" type="button" onClick={() => void handleRotateToken('extension')} disabled={rotatingKeyFor === 'extension'}>
                    <RefreshCw size={14} /> {rotatingKeyFor === 'extension' ? 'Đang reset...' : 'Reset Extension Key'}
                  </button>
                </div>
                <div className={`endpoint-token-card ${lastRotatedKeyFor === 'extension' ? 'fresh' : ''}`}>
                  <div className="flex items-center gap-2">
                    <strong className="break-all flex-1">{deployToken?.token ? deployToken.token : 'Token chỉ hiển thị khi reset Extension Key'}</strong>
                    <button
                      className="btn-action text-xs flex items-center gap-1"
                      type="button"
                      onClick={() => copyToClipboard('extension', deployToken?.token || undefined)}
                      title={t('Copy key', 'Sao chép key')}
                      disabled={!deployToken?.token}
                    >
                      {copiedCommand === 'extension' ? 'Đã copy' : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
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
                        onClick={() => copyToClipboard('agent', getSetupValue(deployToken?.installCommand))}
                        title={t('Copy command', 'Sao chép lệnh')}
                      >
                        {copiedCommand === 'agent' ? t('Copied!', 'Đã sao chép!') : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <div className="p-4 rounded bg-zinc-900 border border-zinc-700">
                      <code className="block whitespace-pre-wrap text-xs text-indigo-400 font-mono select-all">
                        {getSetupValue(deployToken?.installCommand) || 'Rotate token to generate Desktop Agent install command'}
                      </code>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">Browser Extension</h3>
                    </div>
                    <div className="p-4 rounded bg-zinc-900 border border-zinc-700">
                      <code className="block whitespace-pre-wrap text-xs text-emerald-400 font-mono select-all">
                        {t('Open the Extension page and use the displayed key only.', 'Mở trang Extension và chỉ dùng key hiển thị ở đó.')}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl w-full glass">
            <div className="modal-header">
              <h2>{t('Device Details', 'Chi tiết thiết bị')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setSelectedDevice(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Hostname', 'Tên máy')}</span>
                  <strong className="text-white text-base">{selectedDevice.hostname}</strong>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('User Email', 'Email người dùng')}</span>
                  <span className="text-white text-base">{selectedDevice.userEmail}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Department', 'Phòng ban')}</span>
                  <span className="text-white">{selectedDevice.departmentName || '—'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Agent Version', 'Phiên bản Agent')}</span>
                  <span className="text-white">{selectedDevice.agentVersion || '—'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Applied Policy', 'Chính sách áp dụng')}</span>
                  <span className="text-white font-mono">{selectedDevice.policyVersion || '—'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Health Status', 'Sức khỏe thiết bị')}</span>
                  <RiskBadge level={selectedDevice.riskStatus === 'Safe' ? 'Low' : selectedDevice.riskStatus === 'Warning' ? 'Medium' : 'Critical'} />
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Desktop Agent Status', 'Trạng thái Desktop Agent')}</span>
                  <span className={`device-live-pill ${getDeviceOnlineRealtime(selectedDevice) ? 'online' : 'offline'} !w-auto !min-w-0 !px-2 !py-0.5`}>
                    {getDeviceOnlineRealtime(selectedDevice) ? <Activity size={12} /> : <WifiOff size={12} />}
                    {getDeviceOnlineRealtime(selectedDevice) ? t('Online', 'Đang hoạt động') : t('Offline', 'Không hoạt động')}
                  </span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Browser Extension Status', 'Trạng thái Tiện ích')}</span>
                  <span className={`device-live-pill ${getExtensionActiveRealtime(selectedDevice) ? 'online' : 'offline'} !w-auto !min-w-0 !px-2 !py-0.5`}>
                    {getExtensionActiveRealtime(selectedDevice) ? <Activity size={12} /> : <WifiOff size={12} />}
                    {getExtensionActiveRealtime(selectedDevice) ? t('Active', 'Đang hoạt động') : t('Inactive', 'Không hoạt động')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Last Seen', 'Lần cuối kết nối')}</span>
                  <span className="text-white">{new Date(selectedDevice.lastSeen.endsWith('Z') ? selectedDevice.lastSeen : selectedDevice.lastSeen + 'Z').toLocaleString(locale)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setSelectedDevice(null)}>{t('Close', 'Đóng')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Website Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card w-full glass" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>{t('Add Website Domain', 'Thêm tên miền Website')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('Website Name', 'Tên website')}</label>
                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded" placeholder="ChatGPT" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Domain Pattern', 'Mẫu tên miền')}</label>
                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded" placeholder="chatgpt.com" value={newRule.domainPattern} onChange={e => setNewRule({ ...newRule, domainPattern: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Mode', 'Chế độ')}</label>
                <select className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded" value={newRule.mode} onChange={e => setNewRule({ ...newRule, mode: e.target.value })}>
                  <option value="Mask">{t('Mask (Anonymize Data)', 'Che giấu (Ẩn danh dữ liệu)')}</option>
                  <option value="Block">{t('Block (Prevent Access)', 'Chặn (Ngăn cập)')}</option>
                  <option value="Allow">{t('Allow (Monitor Only)', 'Cho phép (Chỉ giám sát)')}</option>
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

      {/* Rotate Key Modal */}
      {rotateKeyModal && (
        <div className="modal-overlay">
          <div className="modal-card w-full glass" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>{t('Rotate Key', 'Tạo lại khóa')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setRotateKeyModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="mb-4 text-sm text-zinc-300">
                {t('Which key do you want to rotate for ', 'Bạn muốn tạo lại khóa nào cho ')} <strong>{rotateKeyModal.hostname}</strong>?
              </p>
              <div className="flex flex-col gap-3">
                <button className="btn-primary py-2.5" onClick={() => { handleRotateKey(rotateKeyModal.id); setRotateKeyModal(null); }}>
                  {t('Desktop Agent Key', 'Khóa Desktop Agent')}
                </button>
                <button className="btn-primary py-2.5" onClick={() => { handleRotateKey(rotateKeyModal.id); setRotateKeyModal(null); }}>
                  {t('Browser Extension Key', 'Khóa Tiện ích trình duyệt')}
                </button>
              </div>
            </div>
            <div className="modal-footer flex justify-end gap-2 mt-4">
              <button className="btn-action px-4 py-2" onClick={() => setRotateKeyModal(null)}>
                {t('Cancel', 'Hủy')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Device Modal */}
      {deleteDeviceModal && (
        <div className="modal-overlay">
          <div className="modal-card w-full glass" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="text-rose-400">{t('Delete Device', 'Xóa thiết bị')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setDeleteDeviceModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="mb-4 text-sm text-zinc-300">
                {t('Are you sure you want to delete the device ', 'Bạn có chắc chắn muốn xóa thiết bị ')} <strong>{deleteDeviceModal.hostname}</strong>?
                {t(' This action cannot be undone.', ' Hành động này không thể hoàn tác.')}
              </p>
            </div>
            <div className="modal-footer flex justify-end gap-2 mt-4">
              <button className="btn-action px-4 py-2" onClick={() => setDeleteDeviceModal(null)}>{t('Cancel', 'Hủy')}</button>
              <button className="btn-primary px-4 py-2 !bg-rose-500/20 !text-rose-400 !border-rose-500/30" onClick={() => { handleDeleteDevice(deleteDeviceModal.id); setDeleteDeviceModal(null); }}>
                {t('Delete', 'Xóa')}
              </button>
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

      {/* DLP Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl w-full glass">
            <div className="modal-header">
              <h2>{t('DLP Event Details', 'Chi tiết sự kiện DLP')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setSelectedEvent(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Time', 'Thời gian')}</span>
                  <strong className="text-white">{new Date(selectedEvent.createdAt).toLocaleString(locale)}</strong>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('User Email', 'Email người dùng')}</span>
                  <span className="text-white">{selectedEvent.userEmail}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Hostname', 'Tên máy')}</span>
                  <span className="text-white">{selectedEvent.hostname}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('AI Platform', 'Nền tảng AI')}</span>
                  <span className="text-white">{selectedEvent.websiteAi}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Browser', 'Trình duyệt')}</span>
                  <span className="text-white">{selectedEvent.browser || 'Extension'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Matched Data', 'Dữ liệu phát hiện')}</span>
                  <span className="text-amber-400 font-semibold">{selectedEvent.dataTypeMatched || '—'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Risk Score / Level', 'Điểm rủi ro / Mức độ')}</span>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={selectedEvent.riskLevel as any} />
                    <span className="text-white font-mono">({selectedEvent.riskScore}/100)</span>
                  </div>
                </div>
                <div>
                  <span className="block text-zinc-400 text-xs font-semibold mb-1">{t('Decision', 'Quyết định')}</span>
                  <DecisionBadge decision={selectedEvent.decision as any} />
                </div>
                <div className="col-span-2">
                  <span className="block text-zinc-400 text-xs font-semibold mb-2">{t('Masked Preview', 'Nội dung đã che')}</span>
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded font-mono text-xs text-zinc-300 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                    {selectedEvent.maskedContentPreview || t('No preview available', 'Không có bản xem trước')}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer flex justify-end gap-3 mt-4">
              <button className="btn-secondary" onClick={() => setSelectedEvent(null)}>{t('Close', 'Đóng')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Settings Modal */}
      {customSettingsDevice && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl w-full glass">
            <div className="modal-header">
              <h2>{t('Custom Device Settings', 'Cấu hình riêng cho thiết bị')} - {customSettingsDevice.hostname}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setCustomSettingsDevice(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {customSettingsLoading ? (
                <LoadingSpinner text={t('Loading custom settings...', 'Đang tải cấu hình...')} />
              ) : (
                <div className="space-y-6">
                  {/* Select Custom Security Policy */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">
                      {t('Custom Security Policy', 'Chính sách bảo mật áp dụng')}
                    </label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-700 text-white p-2.5 rounded text-sm focus:outline-none focus:border-indigo-500"
                      value={customPolicyId || ''}
                      onChange={(e) => setCustomPolicyId(e.target.value || null)}
                    >
                      <option value="">{t('Default (Use department policy)', 'Mặc định (Dùng chính sách phòng ban)')}</option>
                      {availablePolicies.map((policy) => (
                        <option key={policy.id} value={policy.id}>
                          {policy.name} {policy.departmentName ? `(${policy.departmentName})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1.5">
                      {t('Select a custom security policy for this device. If none selected, the default department policy will be used.', 'Chọn một chính sách bảo mật riêng cho thiết bị này. Nếu bỏ trống, thiết bị sẽ kế thừa chính sách của phòng ban.')}
                    </p>
                  </div>

                  {/* AI Websites Overrides */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-3">
                      {t('AI Website Protection Overrides', 'Ghi đè chế độ bảo vệ AI website')}
                    </label>
                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold">
                            <th className="p-3">{t('AI Website', 'Website AI')}</th>
                            <th className="p-3">{t('Global Mode', 'Mặc định hệ thống')}</th>
                            <th className="p-3">{t('Override Mode', 'Chế độ ghi đè')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {websiteOverrides.map((override) => (
                            <tr key={override.aiWebsiteId} className="hover:bg-zinc-900/30">
                              <td className="p-3 font-semibold text-white">{override.name}</td>
                              <td className="p-3 text-zinc-400">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  override.globalMode === 'Block' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  override.globalMode === 'Mask' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {override.globalMode}
                                </span>
                              </td>
                              <td className="p-3">
                                <select
                                  className="bg-zinc-900 border border-zinc-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-indigo-500"
                                  value={override.overrideMode}
                                  onChange={(e) => handleOverrideChange(override.aiWebsiteId, e.target.value)}
                                >
                                  <option value="Inherit">{t('Inherit (Use Global)', 'Kế thừa (Mặc định)')}</option>
                                  <option value="Block">{t('Block', 'Chặn')}</option>
                                  <option value="Mask">{t('Mask', 'Che giấu')}</option>
                                  <option value="Allow">{t('Allow', 'Cho phép')}</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                          {websiteOverrides.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-zinc-500">
                                {t('No AI website rules configured.', 'Chưa có quy tắc website AI nào.')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer flex justify-end gap-2 mt-6 border-t border-zinc-800 pt-4">
              <button className="btn-action px-4 py-2" onClick={() => setCustomSettingsDevice(null)} disabled={savingCustomSettings}>
                {t('Cancel', 'Hủy')}
              </button>
              <button className="btn-primary px-4 py-2" onClick={handleSaveCustomSettings} disabled={savingCustomSettings || customSettingsLoading}>
                {savingCustomSettings ? t('Saving...', 'Đang lưu...') : t('Save Settings', 'Lưu cấu hình')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Endpoints;
