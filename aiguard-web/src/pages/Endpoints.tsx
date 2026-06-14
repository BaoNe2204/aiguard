import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, RefreshCw, Plus, Search, Copy, X, AlertTriangle } from 'lucide-react';
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

type TabType = 'overview' | 'devices' | 'websites' | 'events' | 'deployment';

export const Endpoints: React.FC = () => {
  const location = useLocation();
  const { t, locale } = useLanguage();
  const activeTab: TabType = location.pathname.endsWith('/devices') ? 'devices'
    : location.pathname.endsWith('/events') ? 'events'
    : location.pathname.endsWith('/ai-websites') ? 'websites'
    : location.pathname.endsWith('/deployment') ? 'deployment'
    : 'overview';

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
  const [copiedCommand, setCopiedCommand] = useState<'agent' | 'extension' | 'url' | null>(null);

  // ── Overview stats (reuse from devices) ──
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewStats, setOverviewStats] = useState({ total: 0, active: 0, synced: 0 });

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
      const result = await endpointsApi.getDevices({ page: 1, pageSize: 1 });
      const wsResult = await endpointsApi.getAiWebsites();
      setOverviewStats({ total: result.totalCount, active: result.totalCount, synced: result.totalCount });
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
    else if (activeTab === 'deployment') fetchDeployment();
  }, [activeTab, fetchDevices, fetchEvents, fetchWebsites, fetchDeployment, fetchOverview]);

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

  const handleRotateToken = async () => {
    try {
      const result = await endpointsApi.rotateDeploymentToken();
      setDeployToken(result);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (kind: 'agent' | 'extension' | 'url', value?: string) => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopiedCommand(kind);
      setTimeout(() => setCopiedCommand(null), 2000);
    }
  };

  return (
    <div className="endpoints-page">
      <div className="page-header">
        <div>
          <h1>{t('Endpoint Protection Console', 'Bảng điều khiển bảo vệ thiết bị')}</h1>
          <p className="subtitle">{t('Manage and monitor browser extensions and Windows agents installed on company devices', 'Quản lý và giám sát tiện ích trình duyệt cùng Windows Agent trên thiết bị công ty')}</p>
        </div>
      </div>

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
            <div className="card-header">
              <h2>{t('Registered Endpoint Devices', 'Thiết bị đầu cuối đã đăng ký')}</h2>
              <div className="flex gap-2">
                <div className="input-with-icon">
                  <Search size={14} className="input-icon" />
                  <input type="text" placeholder={t('Search devices...', 'Tìm thiết bị...')} className="text-sm px-2 py-1" value={devicesSearch} onChange={e => { setDevicesSearch(e.target.value); setDevicesPage(1); }} />
                </div>
              </div>
            </div>
            {devicesLoading ? <LoadingSpinner text={t('Loading devices...', 'Đang tải thiết bị...')} /> : (
              <>
                <DataTable
                  data={devices}
                  columns={[
                    { header: t('Hostname', 'Tên máy'), accessor: 'hostname' },
                    { header: t('User Email', 'Email người dùng'), accessor: 'userEmail' },
                    { header: t('Department', 'Phòng ban'), accessor: 'departmentName' },
                    { header: t('Agent Ver', 'Phiên bản Agent'), accessor: (item) => item.agentVersion || '—', width: '110px' },
                    { header: t('Extension', 'Tiện ích'), accessor: (item) => (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md ${item.extensionActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {item.extensionActive ? t('Active', 'Hoạt động') : t('Inactive', 'Không hoạt động')}
                      </span>
                    ), width: '100px' },
                    { header: t('Policy', 'Chính sách'), accessor: 'policyVersion', width: '110px' },
                    { header: t('Health', 'Sức khỏe'), accessor: (item) => <RiskBadge level={item.riskStatus === 'Safe' ? 'Low' : item.riskStatus === 'Warning' ? 'Medium' : 'Critical'} />, width: '90px' },
                    { header: t('Actions', 'Thao tác'), accessor: (item) => (
                      <div className="flex gap-1">
                        <button className="btn-action text-xs" onClick={() => triggerSync(item.id)}>{t('Sync', 'Đồng bộ')}</button>
                        <button className="btn-action text-xs" onClick={() => handleRotateKey(item.id)}>{t('Rotate', 'Tạo lại khóa')}</button>
                        <button className="btn-action text-xs text-rose-400" onClick={() => handleRevokeKey(item.id)}>{t('Revoke', 'Thu hồi')}</button>
                      </div>
                    ), width: '210px' }
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

        {activeTab === 'deployment' && (
          deployLoading ? <LoadingSpinner text={t('Loading deployment info...', 'Đang tải thông tin triển khai...')} /> : (
            <div className="deployment-tab grid grid-cols-2 gap-6">
              <div className="card glass p-6">
                <h2 className="mb-4">{t('1. Download Installer Bundles', '1. Tải bộ cài đặt')}</h2>
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">Windows Desktop Agent (.MSI)</h3>
                      <p className="text-xs text-zinc-400">{t('For Registry and Clipboard control', 'Kiểm soát Registry và Clipboard')}</p>
                    </div>
                    <button className="btn-action flex items-center gap-1.5"><Download size={14} /> {t('Download', 'Tải xuống')}</button>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">Chrome / Edge Extension (.CRX)</h3>
                      <p className="text-xs text-zinc-400">{t('For Textbox monitoring and submit interception', 'Giám sát ô nhập liệu và chặn thao tác gửi')}</p>
                    </div>
                    <button className="btn-action flex items-center gap-1.5"><Download size={14} /> {t('Download', 'Tải xuống')}</button>
                  </div>
                </div>
                {deployToken && (
                  <div className="mt-4 p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white">{t('Enrollment Token', 'Mã đăng ký thiết bị')}</h3>
                      <button className="btn-action text-xs flex items-center gap-1" onClick={handleRotateToken}>
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
