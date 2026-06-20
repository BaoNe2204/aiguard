import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Save, X, RotateCcw, Search, Shield, ShieldAlert, CheckCircle, AlertTriangle, Trash2, Upload, Download, AlertCircle, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { policiesApi, type SecurityPolicyResponse, type PolicyVersionResponse, type WhitelistBlacklistResponse } from '../api/policies';
import { dlpApi, type AiSecurityHealthResult, type DlpScanResponse } from '../api/dlp';
import { useLanguage } from '../contexts/LanguageContext';

export const Policies: React.FC = () => {
  const location = useLocation();
  const { t, locale } = useLanguage();
  const activeTab = location.pathname.endsWith('/detectors') ? 'detectors'
    : location.pathname.endsWith('/whitelist-blacklist') ? 'whitelist'
      : location.pathname.endsWith('/versions') ? 'versions'
        : 'departments';

  // Department policies
  const [policies, setPolicies] = useState<SecurityPolicyResponse[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policyEdits, setPolicyEdits] = useState<Record<string, Partial<SecurityPolicyResponse>>>({});
  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  // Versions
  const [versions, setVersions] = useState<PolicyVersionResponse[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Whitelist/Blacklist
  const [wbData, setWbData] = useState<WhitelistBlacklistResponse>({ whitelist: [], blacklist: [] });
  const [wbLoading, setWbLoading] = useState(false);
  const [newWhitelistItem, setNewWhitelistItem] = useState('');
  const [newBlacklistItem, setNewBlacklistItem] = useState('');
  const [whitelistSearch, setWhitelistSearch] = useState('');
  const [blacklistSearch, setBlacklistSearch] = useState('');

  // Redesign state additions
  const [importMode, setImportMode] = useState<'none' | 'whitelist' | 'blacklist'>('none');
  const [bulkInput, setBulkInput] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // AI Security health/test
  const [aiHealth, setAiHealth] = useState<AiSecurityHealthResult | null>(null);
  const [scanContent, setScanContent] = useState('Đây là API key test sk-proj-abc1234567890abcdef1234567890 và email khachhang@example.com');
  const [scanResult, setScanResult] = useState<DlpScanResponse | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  const filteredWhitelist = (wbData.whitelist || []).filter(item =>
    item.toLowerCase().includes(whitelistSearch.toLowerCase())
  );
  const filteredBlacklist = (wbData.blacklist || []).filter(item =>
    item.toLowerCase().includes(blacklistSearch.toLowerCase())
  );

  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      const result = await policiesApi.getDepartmentPolicies();
      setPolicies(result);
    } catch { } finally { setPoliciesLoading(false); }
  }, []);

  const fetchVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const result = await policiesApi.getVersions();
      setVersions(result);
    } catch { } finally { setVersionsLoading(false); }
  }, []);

  const fetchWB = useCallback(async () => {
    setWbLoading(true);
    try {
      const result = await policiesApi.getWhitelistBlacklist();
      setWbData(result);
    } catch { } finally { setWbLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'departments' || activeTab === 'detectors') fetchPolicies();
    else if (activeTab === 'versions') fetchVersions();
    else if (activeTab === 'whitelist') fetchWB();
  }, [activeTab, fetchPolicies, fetchVersions, fetchWB]);

  useEffect(() => {
    if (activeTab !== 'detectors') return;
    dlpApi.getAiHealth()
      .then(setAiHealth)
      .catch(error => setAiHealth({
        available: false,
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Cannot reach AI engine'
      }));
  }, [activeTab]);

  const handlePolicyChange = <K extends keyof SecurityPolicyResponse>(
    id: string,
    field: K,
    value: SecurityPolicyResponse[K]
  ) => {
    setPolicyEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSavePolicy = async (id: string) => {
    const edits = policyEdits[id];
    if (!edits) return;
    setSaveLoading(id);
    try {
      await policiesApi.updatePolicy(id, edits);
      setPolicyEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      fetchPolicies();
    } catch { } finally { setSaveLoading(null); }
  };

  const valueOf = <K extends keyof SecurityPolicyResponse>(policy: SecurityPolicyResponse, field: K) =>
    (policyEdits[policy.id]?.[field] ?? policy[field]) as SecurityPolicyResponse[K];

  const handleRollback = async (id: string) => {
    try {
      await policiesApi.rollback(id);
      fetchPolicies();
      fetchVersions();
    } catch { }
  };

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const checkRegex = (text: string) => {
    const isRegex = /[\\^$.*+?()[\]{}|]/.test(text);
    if (!isRegex) return { isRegex: false, isValid: true };
    try {
      new RegExp(text);
      return { isRegex: true, isValid: true };
    } catch (e: any) {
      return { isRegex: true, isValid: false, error: e.message || 'Invalid syntax' };
    }
  };

  const getAutoClassification = (item: string) => {
    const isRegex = /[\\^$.*+?()[\]{}|]/.test(item);
    if (isRegex) return 'regex';
    if (item.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.replace(/[\*\?]/g, 'a'))) return 'email';
    if (/(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/.test(item)) return 'ip';
    if (/jdbc:|mongodb:|host=|port=|password=|username=|uid=|pwd=/i.test(item)) return 'db';
    return 'keyword';
  };

  const handleExport = (listType: 'whitelist' | 'blacklist') => {
    const items = wbData[listType] || [];
    const content = items.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listType}-rules.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(t(`Exported ${listType} list successfully`, `Đã xuất danh sách ${listType === 'whitelist' ? 'trắng' : 'đen'} thành công`), 'success');
  };

  const toggleImportMode = (mode: 'whitelist' | 'blacklist') => {
    setBulkInput('');
    setImportMode(prev => prev === mode ? 'none' : mode);
  };

  const handleBulkImport = async (listType: 'whitelist' | 'blacklist') => {
    if (!bulkInput.trim()) return;
    const items = bulkInput
      .split(/[\n,]/)
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (items.length === 0) return;

    // Check regex compile status for items that look like regexes
    const invalidItems = items.filter(item => {
      const check = checkRegex(item);
      return check.isRegex && !check.isValid;
    });

    if (invalidItems.length > 0) {
      showToast(t('Cannot import: contains invalid regex patterns', 'Không thể nhập: có chứa biểu thức Regex lỗi cú pháp'), 'error');
      return;
    }

    const currentList = wbData[listType] || [];
    const merged = Array.from(new Set([...currentList, ...items]));

    try {
      await policiesApi.updateWhitelistBlacklist({
        whitelist: listType === 'whitelist' ? merged : wbData.whitelist,
        blacklist: listType === 'blacklist' ? merged : wbData.blacklist
      });
      setBulkInput('');
      setImportMode('none');
      showToast(t(`Imported ${items.length} rules successfully`, `Đã nhập thành công ${items.length} quy tắc`), 'success');
      fetchWB();
    } catch {
      showToast(t('Error during bulk import', 'Lỗi trong quá trình nhập hàng loạt'), 'error');
    }
  };

  const handleClearAll = async (listType: 'whitelist' | 'blacklist') => {
    const count = wbData[listType]?.length || 0;
    if (count === 0) return;

    const confirmed = window.confirm(
      t(
        `Are you sure you want to delete all ${count} items in the ${listType}?`,
        `Bạn có chắc chắn muốn xóa toàn bộ ${count} mục trong danh sách ${listType === 'whitelist' ? 'trắng' : 'đen'} không?`
      )
    );
    if (!confirmed) return;

    try {
      await policiesApi.updateWhitelistBlacklist({
        whitelist: listType === 'whitelist' ? [] : wbData.whitelist,
        blacklist: listType === 'blacklist' ? [] : wbData.blacklist
      });
      showToast(t(`Cleared ${listType} successfully`, `Đã xóa sạch danh sách ${listType === 'whitelist' ? 'trắng' : 'đen'} thành công`), 'success');
      fetchWB();
    } catch {
      showToast(t('Error clearing list', 'Lỗi khi xóa danh sách'), 'error');
    }
  };

  const addWhitelistItem = async () => {
    if (!newWhitelistItem.trim()) return;
    const check = checkRegex(newWhitelistItem);
    if (check.isRegex && !check.isValid) {
      showToast(t('Invalid regex pattern syntax', 'Cú pháp biểu thức Regex bị lỗi'), 'error');
      return;
    }
    const updated = [...wbData.whitelist, newWhitelistItem.trim()];
    try {
      await policiesApi.updateWhitelistBlacklist({ whitelist: updated, blacklist: wbData.blacklist });
      setNewWhitelistItem('');
      showToast(t('Rule added', 'Đã thêm quy tắc thành công'), 'success');
      fetchWB();
    } catch {
      showToast(t('Error adding rule', 'Lỗi khi thêm quy tắc'), 'error');
    }
  };

  const addBlacklistItem = async () => {
    if (!newBlacklistItem.trim()) return;
    const check = checkRegex(newBlacklistItem);
    if (check.isRegex && !check.isValid) {
      showToast(t('Invalid regex pattern syntax', 'Cú pháp biểu thức Regex bị lỗi'), 'error');
      return;
    }
    const updated = [...wbData.blacklist, newBlacklistItem.trim()];
    try {
      await policiesApi.updateWhitelistBlacklist({ whitelist: wbData.whitelist, blacklist: updated });
      setNewBlacklistItem('');
      showToast(t('Rule added', 'Đã thêm quy tắc thành công'), 'success');
      fetchWB();
    } catch {
      showToast(t('Error adding rule', 'Lỗi khi thêm quy tắc'), 'error');
    }
  };

  const removeItem = async (list: 'whitelist' | 'blacklist', item: string) => {
    const updated = wbData[list].filter(i => i !== item);
    try {
      await policiesApi.updateWhitelistBlacklist({
        whitelist: list === 'whitelist' ? updated : wbData.whitelist,
        blacklist: list === 'blacklist' ? updated : wbData.blacklist,
      });
      showToast(t('Rule removed', 'Đã xóa quy tắc thành công'), 'info');
      fetchWB();
    } catch {
      showToast(t('Error removing rule', 'Lỗi khi xóa quy tắc'), 'error');
    }
  };

  const runAiScanTest = async () => {
    if (!scanContent.trim()) return;
    setScanLoading(true);
    setScanError('');
    try {
      const result = await dlpApi.adminScan({
        content: scanContent,
      });
      setScanResult(result);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Lỗi quét');
    } finally {
      setScanLoading(false);
    }
  };

  const globalPolicy = policies[0] ?? null;

  return (
    <div className="policies-page">
      <div className="page-header">
        <div>
          <h1>{t('Security Policy Management', 'Quản lý chính sách bảo mật')}</h1>
          <p className="subtitle">{t('Configure DLP triggers, detector scoring thresholds, and rollback policies', 'Cấu hình điều kiện DLP, ngưỡng điểm bộ phát hiện và khôi phục phiên bản chính sách')}</p>
        </div>
      </div>
      <div className="tab-content">
        {activeTab === 'departments' && (
          policiesLoading ? <LoadingSpinner text={t('Loading policies...', 'Đang tải chính sách...')} /> : (
            <div className="departments-tab flex flex-col gap-6">
              <div className="policy-hero-panel">
                <div className="policy-hero-copy">
                  <span className="policy-section-kicker">{t('Enterprise Workflow', 'Quy trình doanh nghiệp')}</span>
                  <h2>{t('Department Rulebook', 'Quy tắc phòng ban')}</h2>
                  <p>{t(
                    'Set the operating posture for each department with score thresholds, scan rules, and enforcement actions.',
                    'Thiết lập tư thế vận hành cho từng phòng ban với ngưỡng điểm, quy tắc quét và hành động thực thi.'
                  )}</p>
                  <div className="policy-flow-rail">
                    <span className="policy-flow-step">1. {t('Detect', 'Phát hiện')}</span>
                    <span className="policy-flow-step">2. {t('Score', 'Chấm điểm')}</span>
                    <span className="policy-flow-step">3. {t('Enforce', 'Thực thi')}</span>
                  </div>
                </div>
                <div className="policy-summary-grid">
                  <div className="policy-metric-card">
                    <span className="policy-metric-label">{t('Departments', 'Phòng ban')}</span>
                    <strong>{policies.length}</strong>
                    <span>{t('active policy workspaces', 'không gian chính sách đang hoạt động')}</span>
                  </div>
                  <div className="policy-metric-card">
                    <span className="policy-metric-label">{t('Drafts', 'Bản nháp')}</span>
                    <strong>{Object.keys(policyEdits).length}</strong>
                    <span>{t('unsaved edits in review', 'thay đổi chưa lưu')}</span>
                  </div>
                  <div className="policy-metric-card">
                    <span className="policy-metric-label">{t('Avg. Threshold', 'Ngưỡng TB')}</span>
                    <strong>{policies.length ? Math.round(policies.reduce((sum, policy) => sum + policy.sensitivityThreshold, 0) / policies.length) : 0}</strong>
                    <span>{t('/ 100 risk posture', '/ 100 mức rủi ro')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {policies.map(policy => (
                  <div key={policy.id} className="card glass p-0 flex flex-col border border-zinc-800 policy-workspace-card">
                    <div className="policy-workspace-header">
                      <div className="policy-workspace-title">
                        <div className="policy-workspace-icon">
                          <Shield size={20} />
                        </div>
                        <div className="min-w-0">
                          <h2 className="m-0 text-lg text-white font-bold truncate">{policy.name} {policy.departmentName ? `(${policy.departmentName})` : ''}</h2>
                          <div className="policy-workspace-meta">
                            <span>Policy ID: {policy.id.substring(0, 8)}...</span>
                            <span className={`policy-state-pill ${policyEdits[policy.id] ? 'dirty' : 'synced'}`}>
                              {policyEdits[policy.id] ? t('Unsaved changes', 'Có thay đổi chưa lưu') : t('In sync', 'Đồng bộ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className={`btn-primary px-4 py-2 flex items-center gap-2 text-sm transition-all duration-300 ${!policyEdits[policy.id] ? 'opacity-50 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
                        disabled={saveLoading === policy.id || !policyEdits[policy.id]}
                        onClick={() => handleSavePolicy(policy.id)}>
                        <Save size={16} /> {saveLoading === policy.id ? t('Saving...', 'Đang lưu...') : t('Save Changes', 'Lưu thay đổi')}
                      </button>
                    </div>

                    <div className="policy-workspace-body">
                      <div className="policy-workspace-layout">
                        <div className="policy-workspace-stack">
                          <div className="policy-card-section policy-score-card">
                            <div className="flex justify-between items-start gap-4 mb-3">
                              <div>
                                <label className="text-zinc-300 font-bold text-sm flex items-center gap-2">
                                  <AlertTriangle size={16} className="text-amber-400" />
                                  {t('Sensitivity Threshold', 'Ngưỡng nhạy cảm DLP')}
                                </label>
                                <p className="text-xs text-zinc-500 mt-2 max-w-md">{t('Defines the total risk score required to trigger a DLP policy violation.', 'Xác định tổng điểm rủi ro cần thiết để kích hoạt vi phạm chính sách DLP.')}</p>
                              </div>
                              <span className="score-pill">{policyEdits[policy.id]?.sensitivityThreshold ?? policy.sensitivityThreshold} / 100</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              defaultValue={policy.sensitivityThreshold}
                              onChange={e => handlePolicyChange(policy.id, 'sensitivityThreshold', parseInt(e.target.value))}
                              className="premium-slider"
                            />
                            <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                              <span>0 (Strict)</span>
                              <span>100 (Lenient)</span>
                            </div>
                          </div>

                          <div className="policy-card-section policy-narrative-card">
                            <div className="policy-mini-heading">
                              <Shield size={15} className="text-indigo-400" />
                              <span>{t('Policy posture', 'Tư thế vận hành')}</span>
                            </div>
                            <div className="policy-narrative-grid">
                              <div>
                                <span className="policy-narrative-label">{t('Clipboard warning', 'Cảnh báo clipboard')}</span>
                                <strong>{policy.clipboardWarning ? t('Enabled', 'Bật') : t('Disabled', 'Tắt')}</strong>
                              </div>
                              <div>
                                <span className="policy-narrative-label">{t('Paste scan', 'Quét khi dán')}</span>
                                <strong>{policy.scanOnPaste ? t('Enabled', 'Bật') : t('Disabled', 'Tắt')}</strong>
                              </div>
                              <div>
                                <span className="policy-narrative-label">{t('Submit scan', 'Quét khi gửi')}</span>
                                <strong>{policy.scanOnSubmit ? t('Enabled', 'Bật') : t('Disabled', 'Tắt')}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="policy-workspace-stack">
                          <div className="policy-card-section flex flex-col gap-3 policy-enforcement-card">
                            <label className="text-zinc-300 font-bold text-sm flex items-center gap-2 mb-1">
                              <CheckCircle size={16} className="text-emerald-400" />
                              {t('Scanning Rules', 'Quy tắc quét tự động')}
                            </label>
                            <div className="policy-toggle-stack">
                              <div className="policy-toggle-row">
                                <div>
                                  <span className="font-semibold text-white text-sm block">{t('Clipboard Protection', 'Bảo vệ Clipboard')}</span>
                                  <span className="text-xs text-zinc-500">{t('Alert user when copying sensitive data', 'Cảnh báo khi người dùng sao chép dữ liệu mật')}</span>
                                </div>
                                <label className="switch shrink-0">
                                  <input type="checkbox" defaultChecked={policy.clipboardWarning} onChange={e => handlePolicyChange(policy.id, 'clipboardWarning', e.target.checked)} />
                                  <span className="slider round"></span>
                                </label>
                              </div>
                              <div className="policy-toggle-row">
                                <div>
                                  <span className="font-semibold text-white text-sm block">{t('Scan On Paste', 'Quét khi dán')}</span>
                                  <span className="text-xs text-zinc-500">{t('Trigger scan when content is pasted', 'Tự động quét khi nội dung được dán vào web')}</span>
                                </div>
                                <label className="switch shrink-0">
                                  <input type="checkbox" defaultChecked={policy.scanOnPaste} onChange={e => handlePolicyChange(policy.id, 'scanOnPaste', e.target.checked)} />
                                  <span className="slider round"></span>
                                </label>
                              </div>
                              <div className="policy-toggle-row">
                                <div>
                                  <span className="font-semibold text-white text-sm block">{t('Scan On Submit', 'Quét khi gửi')}</span>
                                  <span className="text-xs text-zinc-500">{t('Intercept forms & chats before sending', 'Kiểm tra trước khi cho phép gửi form/chat')}</span>
                                </div>
                                <label className="switch shrink-0">
                                  <input type="checkbox" defaultChecked={policy.scanOnSubmit} onChange={e => handlePolicyChange(policy.id, 'scanOnSubmit', e.target.checked)} />
                                  <span className="slider round"></span>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="policy-card-section policy-app-card border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40 hover:bg-indigo-500/10 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                              <div>
                                <span className="font-bold text-indigo-300 text-sm flex items-center gap-2 mb-1">
                                  <ShieldAlert size={16} />
                                  {t('AI Code App Protection', 'Bảo vệ App Code AI')}
                                </span>
                                <span className="text-xs text-zinc-400 block leading-relaxed">{t('Agent scores Cursor/VS Code AI against source repos and dev secrets. Enforces Enterprise Guard rules.', 'Agent chấm rủi ro Cursor/VS Code AI khi truy cập repo source và secret dev. Thực thi chặn doanh nghiệp.')}</span>
                              </div>
                              <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-wider font-bold border border-indigo-500/30 shrink-0 shadow-lg shadow-indigo-500/10">
                                {t('Enterprise', 'Doanh nghiệp')}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 flex-1">
                              <label className="policy-action-chip">
                                <span className="font-medium">{t('Detect source code', 'Phát hiện mã nguồn')}</span>
                                <input type="checkbox" className="accent-indigo-500 w-4 h-4 rounded border-zinc-700 bg-zinc-900" checked={Boolean(valueOf(policy, 'enableSourceCodeDetection'))} onChange={e => handlePolicyChange(policy.id, 'enableSourceCodeDetection', e.target.checked)} />
                              </label>
                              <label className="policy-action-chip">
                                <span className="font-medium">{t('Detect dev secrets', 'Phát hiện secret dev')}</span>
                                <input type="checkbox" className="accent-indigo-500 w-4 h-4 rounded border-zinc-700 bg-zinc-900" checked={Boolean(valueOf(policy, 'enablePrivateKeyDetection'))} onChange={e => handlePolicyChange(policy.id, 'enablePrivateKeyDetection', e.target.checked)} />
                              </label>

                              <div className="policy-select-card">
                                <label className="block text-zinc-400 font-bold mb-2 text-xs uppercase tracking-wider">{t('High Risk Action', 'Hành động rủi ro cao')}</label>
                                <select className="bg-zinc-900 border border-zinc-700 text-white text-xs font-medium p-2.5 rounded-lg w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                  value={String(valueOf(policy, 'highAction'))}
                                  onChange={e => handlePolicyChange(policy.id, 'highAction', e.target.value)}>
                                  <option value="Allow">Allow (Cho phép)</option>
                                  <option value="PendingApproval">Pending Approval (Chờ duyệt)</option>
                                  <option value="Block">Block (Chặn)</option>
                                </select>
                              </div>

                              <div className="policy-select-card policy-select-card-critical">
                                <label className="block text-rose-400 font-bold mb-2 text-xs uppercase tracking-wider">{t('Critical Action', 'Hành động nghiêm trọng')}</label>
                                <select className="bg-zinc-900 border border-rose-500/40 text-white text-xs font-medium p-2.5 rounded-lg w-full focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                                  value={String(valueOf(policy, 'criticalAction'))}
                                  onChange={e => handlePolicyChange(policy.id, 'criticalAction', e.target.value)}>
                                  <option value="PendingApproval">Pending Approval</option>
                                  <option value="Block">Block</option>
                                  <option value="Quarantine">Quarantine</option>
                                  <option value="KillProcess">Kill Process</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {policies.length === 0 && (
                  <div className="card glass p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-zinc-800 bg-zinc-900/20">
                    <Shield size={48} className="text-zinc-700 mb-4" />
                    <h3 className="text-lg font-bold text-zinc-300 mb-1">{t('No policies found', 'Chưa cấu hình chính sách')}</h3>
                    <p className="text-sm text-zinc-500 max-w-md mx-auto">{t('There are no department policies configured in the system. Please create one to start protecting your data.', 'Chưa có chính sách phòng ban nào được cấu hình. Vui lòng tạo chính sách để bắt đầu bảo vệ dữ liệu.')}</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'detectors' && (
          policiesLoading ? <LoadingSpinner text={t('Loading detectors...', 'Đang tải bộ phát hiện...')} /> : (
            <div className="detectors-tab flex flex-col gap-6">
              <div className="policy-hero-panel detector-hero-panel">
                <div className="policy-hero-copy">
                  <span className="policy-section-kicker">{t('Detection Operations', 'Vận hành phát hiện')}</span>
                  <h2>{t('Bộ Phát Hiện', 'Bộ Phát Hiện')}</h2>
                  <p>{t(
                    'Run the AI engine test bench, verify masking output, and tune the global detector posture from one control room.',
                    'Chạy phòng thử AI, kiểm tra che dữ liệu và tinh chỉnh tư thế phát hiện tổng thể trong một khu điều khiển.'
                  )}</p>
                  <div className="policy-flow-rail">
                    <span className="policy-flow-step">1. {t('Inspect', 'Kiểm tra')}</span>
                    <span className="policy-flow-step">2. {t('Score', 'Chấm điểm')}</span>
                    <span className="policy-flow-step">3. {t('Mask', 'Che dữ liệu')}</span>
                  </div>
                </div>
                <div className="policy-summary-grid">
                  <div className="policy-metric-card">
                    <span className="policy-metric-label">{t('Active detectors', 'Bộ phát hiện bật')}</span>
                    <strong>{globalPolicy ? 11 : 0}</strong>
                    <span>{t('of', 'trên')} 11</span>
                  </div>
                  <div className="policy-metric-card">
                    <span className="policy-metric-label">{t('High risk rules', 'Quy tắc rủi ro cao')}</span>
                    <strong>4</strong>
                    <span>{t('critical watch points', 'điểm cần giám sát')}</span>
                  </div>
                  <div className="policy-metric-card">
                    <span className="policy-metric-label">{t('Avg. weight', 'Trọng số TB')}</span>
                    <strong>52</strong>
                    <span>{t('risk score baseline', 'mức nền rủi ro')}</span>
                  </div>
                </div>
              </div>

              {globalPolicy ? (
                <div className="detector-control-room grid grid-cols-1 xl:grid-cols-[1.02fr_0.98fr] gap-6 items-start">
                  <div className="card glass detector-ops-panel p-6 border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl rounded-xl">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                          <Sparkles size={18} className="text-cyan-400" />
                          {t('AI Detection Test Bench', 'Phòng thử AI')}
                        </h2>
                        <p className="text-sm text-zinc-400">{t('Enter a prompt to validate the path Web → Backend API → aiguard-ai → risk score and masking.', 'Nhập thử nội dung để kiểm tra luồng Web → Backend API → aiguard-ai → chấm điểm rủi ro và che dữ liệu.')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${aiHealth?.available ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
                        {aiHealth?.available ? `AI Online ${aiHealth.version ? `v${aiHealth.version}` : ''}` : `AI ${aiHealth?.status || 'Checking...'}`}
                      </span>
                    </div>
                    {aiHealth?.error && (
                      <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        {aiHealth.error}. Backend vẫn dùng local scanner fallback nếu AI service chưa chạy.
                      </div>
                    )}
                    <textarea
                      className="w-full min-h-[140px] rounded-xl border border-zinc-700 bg-zinc-950/80 p-4 text-sm text-white outline-none focus:border-cyan-400 detector-textarea"
                      value={scanContent}
                      onChange={e => setScanContent(e.target.value)}
                      placeholder="Dán prompt/API key/email/CCCD để test..."
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button className="btn-primary px-4 py-2" type="button" disabled={scanLoading || !scanContent.trim()} onClick={runAiScanTest}>
                        {scanLoading ? 'Đang quét...' : 'Quét thử'}
                      </button>
                      {scanError && <span className="text-sm text-rose-300">{scanError}</span>}
                    </div>
                    {scanResult && (
                      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="detector-result-card">
                          <span className="text-xs text-zinc-400">Risk Score</span>
                          <strong className="block text-2xl text-white">{scanResult.riskScore}</strong>
                          <span className="text-sm text-zinc-300">{scanResult.riskLevel} · {scanResult.decision}</span>
                        </div>
                        <div className="detector-result-card lg:col-span-2">
                          <span className="text-xs text-zinc-400">Policy reason</span>
                          <p className="mt-1 text-sm text-zinc-200">{scanResult.policyReason || '-'}</p>
                        </div>
                        <div className="detector-result-card lg:col-span-3">
                          <span className="text-xs text-zinc-400">Dữ liệu phát hiện</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {scanResult.matches.length > 0 ? scanResult.matches.map((match, index) => (
                              <span key={`${match.dataType}-${index}`} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                                {match.dataType} · {match.count} · +{match.weight}
                              </span>
                            )) : <span className="text-sm text-zinc-400">Không phát hiện dữ liệu nhạy cảm.</span>}
                          </div>
                        </div>
                        {scanResult.maskedContent && (
                          <div className="detector-result-card detector-result-card-success lg:col-span-3">
                            <span className="text-xs text-emerald-200">Nội dung đã che</span>
                            <pre className="mt-2 whitespace-pre-wrap text-sm text-emerald-100">{scanResult.maskedContent}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card glass detector-matrix-panel p-6 border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl rounded-xl">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2 m-0">
                          <Shield size={18} className="text-indigo-400" />
                          {t('Detector Thresholds', 'Ngưỡng bộ phát hiện')}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">{t('Manage the global detector posture, active coverage, and risk weights from a single matrix.', 'Quản lý tư thế phát hiện tổng thể, phạm vi bật và trọng số rủi ro trong một ma trận duy nhất.')}</p>
                      </div>
                      <button
                        className={`btn-primary px-4 py-2 flex items-center gap-2 text-sm transition-all duration-300 ${!policyEdits[globalPolicy.id] ? 'opacity-50 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
                        disabled={!policyEdits[globalPolicy.id]}
                        onClick={() => handleSavePolicy(globalPolicy.id)}
                      >
                        <Save size={16} /> {t('Save Detectors', 'Lưu bộ phát hiện')}
                      </button>
                    </div>

                    <div className="detector-band">
                      <div><span>{t('Coverage', 'Phạm vi')}</span><strong>11/11</strong></div>
                      <div><span>{t('High risk', 'Rủi ro cao')}</span><strong>4</strong></div>
                      <div><span>{t('Reference policy', 'Policy gốc')}</span><strong>#{globalPolicy.id.substring(0, 8)}</strong></div>
                    </div>

                    <div className="detector-grid">
                      {[
                        { name: 'Email Detection', field: 'enableEmailDetection', weight: 10, scope: 'Identity', detail: 'Nhận diện địa chỉ email và luồng liên hệ.' },
                        { name: 'Phone Detection', field: 'enablePhoneDetection', weight: 15, scope: 'Identity', detail: 'Bắt số điện thoại trong biểu mẫu và nội dung chat.' },
                        { name: 'CCCD Detection', field: 'enableCccdDetection', weight: 35, scope: 'Personal Data', detail: 'Phát hiện số định danh cá nhân cần kiểm soát.' },
                        { name: 'Source Code Detection', field: 'enableSourceCodeDetection', weight: 40, scope: 'Engineering', detail: 'Nhận diện mã nguồn và đoạn cấu hình kỹ thuật.' },
                        { name: 'HR Data Detection', field: 'enableHrDetection', weight: 45, scope: 'HR', detail: 'Theo dõi dữ liệu nhân sự và hồ sơ nội bộ.' },
                        { name: 'Financial Data Detection', field: 'enableFinancialDetection', weight: 55, scope: 'Finance', detail: 'Kiểm tra dữ liệu tài chính và thông tin nhạy cảm.' },
                        { name: 'API Key Detection', field: 'enableApiKeyDetection', weight: 70, scope: 'Secrets', detail: 'Chặn lộ khóa API và token dịch vụ.' },
                        { name: 'Password Detection', field: 'enablePasswordDetection', weight: 70, scope: 'Secrets', detail: 'Bảo vệ mật khẩu, credential và secret text.' },
                        { name: 'JWT Token Detection', field: 'enableTokenDetection', weight: 70, scope: 'Secrets', detail: 'Bắt JWT và phiên xác thực bị rò rỉ.' },
                        { name: 'Database URL Detection', field: 'enableDbUrlDetection', weight: 75, scope: 'Infrastructure', detail: 'Phát hiện connection string và endpoint nội bộ.' },
                        { name: 'Private Key Detection', field: 'enablePrivateKeyDetection', weight: 90, scope: 'Critical', detail: 'Ưu tiên cao nhất cho private key và chứng thư.' },
                      ].map((item, idx) => {
                        const isActive = Boolean(policyEdits[globalPolicy.id]?.[item.field as keyof SecurityPolicyResponse] ?? globalPolicy[item.field as keyof SecurityPolicyResponse]);
                        let colors = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', fill: 'bg-emerald-500', badge: 'detector-badge-low' };
                        if (item.weight >= 70) {
                          colors = { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', fill: 'bg-rose-500', badge: 'detector-badge-high' };
                        } else if (item.weight >= 35) {
                          colors = { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', fill: 'bg-amber-500', badge: 'detector-badge-mid' };
                        }
                        return (
                          <div key={idx} className="detector-list-item detector-list-item-enterprise group">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text} border ${colors.border} shrink-0`}>
                                <Search size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-sm font-bold text-white block truncate">{item.name}</span>
                                    <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">{item.field}</span>
                                  </div>
                                  <span className={`detector-scope-pill ${colors.badge}`}>{item.scope}</span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{item.detail}</p>
                                <div className="mt-3 flex items-center gap-3">
                                  <div className="detector-weight-bar-bg flex-1">
                                    <div className={`detector-weight-bar-fill ${colors.fill}`} style={{ width: `${item.weight}%` }}></div>
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text} shrink-0`}>+{item.weight}</span>
                                </div>
                              </div>
                            </div>
                            <div className="detector-toggle-slot">
                              <span className={`text-[11px] font-bold ${isActive ? 'text-emerald-300' : 'text-zinc-500'}`}>{isActive ? 'ACTIVE' : 'OFF'}</span>
                              <label className="switch shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={event => handlePolicyChange(
                                    globalPolicy.id,
                                    item.field as keyof SecurityPolicyResponse,
                                    event.target.checked as never
                                  )}
                                />
                                <span className="slider round"></span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card glass p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-zinc-800 bg-zinc-900/20">
                  <Shield size={48} className="text-zinc-700 mb-4" />
                  <h3 className="text-lg font-bold text-zinc-300 mb-1">{t('No policies found', 'Chưa có chính sách để hiển thị')}</h3>
                  <p className="text-sm text-zinc-500 max-w-md mx-auto">{t('Create at least one department policy before configuring detectors.', 'Cần tạo ít nhất một chính sách phòng ban trước khi cấu hình bộ phát hiện.')}</p>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'whitelist' && (
          wbLoading ? <LoadingSpinner text={t('Loading whitelist/blacklist...', 'Đang tải danh sách trắng và đen...')} /> : (
            <div className="flex flex-col gap-5">
              {/* Hero Summary */}
              <div className="wb-hero">
                <div className="wb-hero-copy">
                  <span className="wb-hero-kicker">{t('Policy Controls', 'Điều khiển chính sách')}</span>
                  <h2 className="wb-hero-title">{t('Whitelist and blacklist rules in one clean workspace', 'Quản lý danh sách trắng và đen trong một không gian gọn gàng')}</h2>
                  <p className="wb-hero-desc">
                    {t(
                      'Add keywords or regex patterns, import in bulk, and inspect entries with automatic classification for faster review.',
                      'Thêm từ khóa hoặc mẫu regex, nhập hàng loạt, và xem phân loại tự động để duyệt nhanh hơn.'
                    )}
                  </p>
                </div>
                <div className="wb-hero-meta">
                  <div className="wb-hero-pill">
                    <Shield size={14} />
                    <span>{t('Whitelist allows', 'Whitelist cho phép')}</span>
                  </div>
                  <div className="wb-hero-pill danger">
                    <ShieldAlert size={14} />
                    <span>{t('Blacklist blocks', 'Blacklist chặn')}</span>
                  </div>
                  <div className="wb-hero-pill neutral">
                    <Sparkles size={14} />
                    <span>{t('Regex supported', 'Hỗ trợ Regex')}</span>
                  </div>
                </div>
              </div>

              {/* Stats Banner */}
              <div className="wb-stats-container">
                <div className="wb-stat-card whitelist-stat">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">{t('Whitelist Rules', 'Danh sách trắng')}</span>
                    <span className="text-2xl font-extrabold text-white leading-none mt-1 block tracking-tight font-sans">
                      {wbData.whitelist?.length || 0} <span className="text-xs font-normal text-zinc-500">{t('items', 'mục')}</span>
                    </span>
                  </div>
                </div>
                <div className="wb-stat-card blacklist-stat">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">{t('Blacklist Rules', 'Danh sách đen')}</span>
                    <span className="text-2xl font-extrabold text-white leading-none mt-1 block tracking-tight font-sans">
                      {wbData.blacklist?.length || 0} <span className="text-xs font-normal text-zinc-500">{t('items', 'mục')}</span>
                    </span>
                  </div>
                </div>
                <div className="wb-stat-card total-stat">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block font-medium">{t('Total Inspected Rules', 'Tổng quy tắc')}</span>
                    <span className="text-2xl font-extrabold text-white leading-none mt-1 block tracking-tight font-sans">
                      {(wbData.whitelist?.length || 0) + (wbData.blacklist?.length || 0)} <span className="text-xs font-normal text-zinc-500">{t('items', 'mục')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Lists Split Grid */}
              <div className="whitelist-tab grid grid-cols-1 md:grid-cols-2 gap-7">
                {/* Whitelist Card */}
                <div className="card glass p-6 flex flex-col min-h-[560px] h-[600px] border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl rounded-xl wb-card-container whitelist-card">
                  <div className="wb-card-header">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="wb-card-icon whitelist-icon">
                        <Shield size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="wb-card-title-row">
                          <h2 className="text-base font-bold text-white leading-tight m-0">{t('Exclude Keywords / Whitelist', 'Từ khóa loại trừ / Danh sách trắng')}</h2>
                          <span className="wb-card-count whitelist-count">{wbData.whitelist?.length || 0}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium m-0 mt-0.5">
                          {t('Safe terms allowed to bypass DLP checks', 'Từ khóa an toàn được bỏ qua quét DLP')}
                        </p>
                      </div>
                    </div>
                    <div className="wb-card-actions">
                      <button
                        onClick={() => toggleImportMode('whitelist')}
                        className={`action-icon-btn ${importMode === 'whitelist' ? 'active' : ''}`}
                        title={t('Bulk Import', 'Nhập hàng loạt')}
                      >
                        <Upload size={14} />
                      </button>
                      <button
                        onClick={() => handleExport('whitelist')}
                        className="action-icon-btn"
                        title={t('Export List', 'Xuất danh sách')}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleClearAll('whitelist')}
                        className="action-icon-btn hover:text-rose-400 hover:border-rose-500/30"
                        title={t('Clear All', 'Xóa tất cả')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Bulk Import Panel for Whitelist */}
                  {importMode === 'whitelist' && (
                    <div className="utility-panel mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-emerald-400">{t('Bulk Import Whitelist', 'Nhập danh sách trắng hàng loạt')}</span>
                        <button onClick={() => setImportMode('none')} className="text-zinc-500 hover:text-zinc-300">
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 mb-2">
                        {t('Enter keywords or regex patterns, separated by commas or newlines.', 'Nhập các từ khóa hoặc biểu thức Regex, phân tách bằng dấu phẩy hoặc xuống dòng.')}
                      </p>
                      <textarea
                        value={bulkInput}
                        onChange={e => setBulkInput(e.target.value)}
                        placeholder="keyword1, keyword2, ^regex3.*"
                        className="utility-textarea mb-2"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setImportMode('none')} className="btn-secondary text-[10px] px-2.5 py-1">
                          {t('Cancel', 'Hủy')}
                        </button>
                        <button onClick={() => handleBulkImport('whitelist')} className="btn-primary text-[10px] px-2.5 py-1 bg-emerald-600 border-emerald-500 hover:bg-emerald-500">
                          {t('Import', 'Nhập')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 mb-5">
                    {/* Search bar */}
                    <div className="relative flex items-center">
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500 z-10">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        value={whitelistSearch}
                        onChange={e => setWhitelistSearch(e.target.value)}
                        placeholder={t('Search whitelist keywords...', 'Tìm kiếm từ khóa danh sách trắng...')}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs py-2.5 rounded-xl focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none wb-glass-input wb-search-input"
                      />
                      {whitelistSearch && (
                        <button
                          onClick={() => setWhitelistSearch('')}
                          className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 z-10"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Add Input and button */}
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newWhitelistItem}
                          onChange={e => setNewWhitelistItem(e.target.value)}
                          placeholder={t('Add whitelist keyword...', 'Thêm từ khóa danh sách trắng...')}
                          className="bg-zinc-950 border border-zinc-800 text-white text-xs py-2.5 px-3.5 rounded-xl flex-1 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none wb-glass-input"
                          onKeyDown={e => e.key === 'Enter' && addWhitelistItem()}
                        />
                        <button
                          className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md shadow-emerald-900/10"
                          onClick={addWhitelistItem}
                          disabled={!newWhitelistItem.trim() || (checkRegex(newWhitelistItem).isRegex && !checkRegex(newWhitelistItem).isValid)}
                        >
                          <Plus size={14} />
                          <span>{t('Add', 'Thêm')}</span>
                        </button>
                      </div>

                      {/* Regex live validation display */}
                      {newWhitelistItem && checkRegex(newWhitelistItem).isRegex && (
                        <div className={`validation-badge ${checkRegex(newWhitelistItem).isValid ? 'valid' : 'invalid'}`}>
                          {checkRegex(newWhitelistItem).isValid ? (
                            <><CheckCircle size={10} /> {t('Valid Regex Pattern', 'Biểu thức Regex hợp lệ')}</>
                          ) : (
                            <><AlertCircle size={10} /> {t('Invalid Regex Syntax: ', 'Lỗi cú pháp Regex: ') + checkRegex(newWhitelistItem).error}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical Scrollable List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 mt-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent wb-rules-list">
                    {filteredWhitelist.map((item, idx) => {
                      const category = getAutoClassification(item);
                      let badgeClass = 'tag-keyword';
                      let badgeText = t('Keyword', 'Từ khóa');
                      if (category === 'regex') {
                        badgeClass = 'tag-regex';
                        badgeText = t('Regex', 'Biểu thức');
                      } else if (category === 'email') {
                        badgeClass = 'tag-email';
                        badgeText = 'Email';
                      } else if (category === 'ip') {
                        badgeClass = 'tag-ip';
                        badgeText = 'IP Address';
                      } else if (category === 'db') {
                        badgeClass = 'tag-db';
                        badgeText = 'Database';
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl group rule-entry-row"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 shadow-sm shadow-emerald-500/5 transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30">
                              <CheckCircle size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-mono font-semibold text-zinc-200 select-all leading-relaxed break-all pr-2 group-hover:text-white transition-colors duration-200">
                                {item}
                              </span>
                              <div className="flex items-center gap-2 mt-1.5 shrink-0 flex-wrap">
                                <span className={`cat-tag ${badgeClass}`}>
                                  {badgeText}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors duration-200">
                                  • {t('Scope: Global', 'Phạm vi: Toàn cục')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem('whitelist', item)}
                            className="wb-delete-btn opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 shrink-0"
                            title={t('Delete keyword', 'Xóa từ khóa')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}

                    {filteredWhitelist.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-950/20">
                        <Shield size={28} className="text-zinc-700 mb-2.5 opacity-40" />
                        <p className="text-xs text-zinc-500 font-medium px-4">
                          {newWhitelistItem || whitelistSearch ? t('No matches found', 'Không tìm thấy từ khóa phù hợp') : t('No whitelist keywords configured', 'Chưa cấu hình từ khóa danh sách trắng')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blacklist Card */}
                <div className="card glass p-6 flex flex-col min-h-[560px] h-[600px] border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl rounded-xl wb-card-container blacklist-card">
                  <div className="wb-card-header">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="wb-card-icon blacklist-icon">
                        <ShieldAlert size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="wb-card-title-row">
                          <h2 className="text-base font-bold text-white leading-tight m-0">{t('Forbidden Keywords / Blacklist', 'Từ khóa cấm / Danh sách đen')}</h2>
                          <span className="wb-card-count blacklist-count">{wbData.blacklist?.length || 0}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium m-0 mt-0.5">
                          {t('Restricted terms flagged by DLP checks', 'Từ khóa nhạy cảm bị ngăn chặn bởi DLP')}
                        </p>
                      </div>
                    </div>
                    <div className="wb-card-actions">
                      <button
                        onClick={() => toggleImportMode('blacklist')}
                        className={`action-icon-btn ${importMode === 'blacklist' ? 'active' : ''}`}
                        title={t('Bulk Import', 'Nhập hàng loạt')}
                      >
                        <Upload size={14} />
                      </button>
                      <button
                        onClick={() => handleExport('blacklist')}
                        className="action-icon-btn"
                        title={t('Export List', 'Xuất danh sách')}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleClearAll('blacklist')}
                        className="action-icon-btn hover:text-rose-400 hover:border-rose-500/30"
                        title={t('Clear All', 'Xóa tất cả')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Bulk Import Panel for Blacklist */}
                  {importMode === 'blacklist' && (
                    <div className="utility-panel mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-rose-400">{t('Bulk Import Blacklist', 'Nhập danh sách đen hàng loạt')}</span>
                        <button onClick={() => setImportMode('none')} className="text-zinc-500 hover:text-zinc-300">
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 mb-2">
                        {t('Enter keywords or regex patterns, separated by commas or newlines.', 'Nhập các từ khóa hoặc biểu thức Regex, phân tách bằng dấu phẩy hoặc xuống dòng.')}
                      </p>
                      <textarea
                        value={bulkInput}
                        onChange={e => setBulkInput(e.target.value)}
                        placeholder="keyword1, keyword2, ^regex3.*"
                        className="utility-textarea mb-2"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setImportMode('none')} className="btn-secondary text-[10px] px-2.5 py-1">
                          {t('Cancel', 'Hủy')}
                        </button>
                        <button onClick={() => handleBulkImport('blacklist')} className="btn-primary text-[10px] px-2.5 py-1 bg-rose-600 border-rose-500 hover:bg-rose-500">
                          {t('Import', 'Nhập')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 mb-5">
                    {/* Search bar */}
                    <div className="relative flex items-center">
                      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500 z-10">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        value={blacklistSearch}
                        onChange={e => setBlacklistSearch(e.target.value)}
                        placeholder={t('Search blacklist keywords...', 'Tìm kiếm từ khóa danh sách đen...')}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs py-2.5 rounded-xl focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 transition-all outline-none wb-glass-input wb-search-input"
                      />
                      {blacklistSearch && (
                        <button
                          onClick={() => setBlacklistSearch('')}
                          className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 z-10"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Add Input and button */}
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBlacklistItem}
                          onChange={e => setNewBlacklistItem(e.target.value)}
                          placeholder={t('Add blacklist keyword...', 'Thêm từ khóa danh sách đen...')}
                          className="bg-zinc-950 border border-zinc-800 text-white text-xs py-2.5 px-3.5 rounded-xl flex-1 focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 transition-all outline-none wb-glass-input"
                          onKeyDown={e => e.key === 'Enter' && addBlacklistItem()}
                        />
                        <button
                          className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 border border-rose-500 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md shadow-rose-900/10"
                          onClick={addBlacklistItem}
                          disabled={!newBlacklistItem.trim() || (checkRegex(newBlacklistItem).isRegex && !checkRegex(newBlacklistItem).isValid)}
                        >
                          <Plus size={14} />
                          <span>{t('Add', 'Thêm')}</span>
                        </button>
                      </div>

                      {/* Regex live validation display */}
                      {newBlacklistItem && checkRegex(newBlacklistItem).isRegex && (
                        <div className={`validation-badge ${checkRegex(newBlacklistItem).isValid ? 'valid' : 'invalid'}`}>
                          {checkRegex(newBlacklistItem).isValid ? (
                            <><CheckCircle size={10} /> {t('Valid Regex Pattern', 'Biểu thức Regex hợp lệ')}</>
                          ) : (
                            <><AlertCircle size={10} /> {t('Invalid Regex Syntax: ', 'Lỗi cú pháp Regex: ') + checkRegex(newBlacklistItem).error}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical Scrollable List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 mt-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent wb-rules-list">
                    {filteredBlacklist.map((item, idx) => {
                      const category = getAutoClassification(item);
                      let badgeClass = 'tag-keyword';
                      let badgeText = t('Keyword', 'Từ khóa');
                      if (category === 'regex') {
                        badgeClass = 'tag-regex';
                        badgeText = t('Regex', 'Biểu thức');
                      } else if (category === 'email') {
                        badgeClass = 'tag-email';
                        badgeText = 'Email';
                      } else if (category === 'ip') {
                        badgeClass = 'tag-ip';
                        badgeText = 'IP Address';
                      } else if (category === 'db') {
                        badgeClass = 'tag-db';
                        badgeText = 'Database';
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl group rule-entry-row"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 shadow-sm shadow-rose-500/5 transition-all duration-300 group-hover:bg-rose-500/20 group-hover:border-rose-500/30">
                              <AlertTriangle size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-mono font-semibold text-rose-300 select-all leading-relaxed break-all pr-2 group-hover:text-rose-200 transition-colors duration-200">
                                {item}
                              </span>
                              <div className="flex items-center gap-2 mt-1.5 shrink-0 flex-wrap">
                                <span className={`cat-tag ${badgeClass}`}>
                                  {badgeText}
                                </span>
                                <span className="text-[10px] text-rose-500/60 font-medium group-hover:text-rose-500/80 transition-colors duration-200">
                                  • {t('Action: Block', 'Hành vi: Chặn')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem('blacklist', item)}
                            className="wb-delete-btn opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 shrink-0"
                            title={t('Delete keyword', 'Xóa từ khóa')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}

                    {filteredBlacklist.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-950/20">
                        <ShieldAlert size={28} className="text-zinc-700 mb-2.5 opacity-40" />
                        <p className="text-xs text-zinc-500 font-medium px-4">
                          {newBlacklistItem || blacklistSearch ? t('No matches found', 'Không tìm thấy từ khóa phù hợp') : t('No blacklist keywords configured', 'Chưa cấu hình từ khóa danh sách đen')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'versions' && (
          versionsLoading ? <LoadingSpinner text={t('Loading versions...', 'Đang tải phiên bản...')} /> : (
            <div className="versions-tab max-w-4xl mx-auto py-4 w-full">
              <div className="mb-8 text-center">
                <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2 mb-2">
                  <RotateCcw size={20} className="text-indigo-400" />
                  {t('Policy Version History', 'Lịch sử Phiên bản Chính sách')}
                </h2>
                <p className="text-sm text-zinc-400">{t('Track configuration changes over time and safely rollback to a previous stable state.', 'Theo dõi thay đổi cấu hình và khôi phục an toàn về phiên bản trước.')}</p>
              </div>

              {versions.length > 0 ? (
                <div className="timeline-container">
                  {versions.map((version, idx) => (
                    <div key={version.id} className="timeline-node">
                      <div className="timeline-icon">
                        <Shield size={12} className="text-indigo-400" />
                      </div>
                      <div className="timeline-content group">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-white bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 font-mono">
                                v{version.version}
                              </span>
                              <span className="text-xs text-zinc-500 font-medium">{new Date(version.updatedAt).toLocaleString(locale)}</span>
                              {idx === 0 && (
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  {t('Current Active', 'Đang áp dụng')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-300 font-medium mb-3">{version.reason || t('No description provided', 'Không có mô tả')}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white border border-zinc-700">
                                {version.updatedBy.charAt(0).toUpperCase()}
                              </div>
                              <span>{t('Updated by', 'Cập nhật bởi')} <strong className="text-zinc-300">{version.updatedBy}</strong></span>
                            </div>
                          </div>

                          {idx !== 0 && (
                            <button
                              className="btn-primary shrink-0 px-4 py-2 flex items-center gap-2 text-sm bg-zinc-800 hover:bg-rose-600 border border-zinc-700 hover:border-rose-500 text-zinc-300 hover:text-white transition-all duration-300 shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 translate-x-2 group-hover:translate-x-0"
                              onClick={() => handleRollback(version.id)}
                            >
                              <RotateCcw size={16} />
                              {t('Rollback to v', 'Khôi phục về v')}{version.version}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card glass p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-zinc-800 bg-zinc-900/20">
                  <RotateCcw size={48} className="text-zinc-700 mb-4" />
                  <h3 className="text-lg font-bold text-zinc-300 mb-1">{t('No version history', 'Chưa có lịch sử phiên bản')}</h3>
                  <p className="text-sm text-zinc-500 max-w-md mx-auto">{t('When you save changes to policies, previous versions will appear here for rollback.', 'Khi bạn lưu thay đổi chính sách, các phiên bản trước sẽ hiển thị ở đây để khôi phục.')}</p>
                </div>
              )}
            </div>
          )
        )}
      </div>
      {toast && (
        <div className={`inline-toast ${toast.type}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <CheckCircle size={16} className="text-emerald-400" />}
            {toast.type === 'info' && <Shield size={16} className="text-indigo-400" />}
            {toast.type === 'error' && <AlertTriangle size={16} className="text-rose-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default Policies;
