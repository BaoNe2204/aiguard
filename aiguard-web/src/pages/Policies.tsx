import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Save, X, RotateCcw, Search, Shield, ShieldAlert, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
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
    } catch {} finally { setPoliciesLoading(false); }
  }, []);

  const fetchVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const result = await policiesApi.getVersions();
      setVersions(result);
    } catch {} finally { setVersionsLoading(false); }
  }, []);

  const fetchWB = useCallback(async () => {
    setWbLoading(true);
    try {
      const result = await policiesApi.getWhitelistBlacklist();
      setWbData(result);
    } catch {} finally { setWbLoading(false); }
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
    } catch {} finally { setSaveLoading(null); }
  };

  const valueOf = <K extends keyof SecurityPolicyResponse>(policy: SecurityPolicyResponse, field: K) =>
    (policyEdits[policy.id]?.[field] ?? policy[field]) as SecurityPolicyResponse[K];

  const handleRollback = async (id: string) => {
    try {
      await policiesApi.rollback(id);
      fetchPolicies();
      fetchVersions();
    } catch {}
  };

  const addWhitelistItem = async () => {
    if (!newWhitelistItem.trim()) return;
    const updated = [...wbData.whitelist, newWhitelistItem.trim()];
    try {
      await policiesApi.updateWhitelistBlacklist({ whitelist: updated, blacklist: wbData.blacklist });
      setNewWhitelistItem('');
      fetchWB();
    } catch {}
  };

  const addBlacklistItem = async () => {
    if (!newBlacklistItem.trim()) return;
    const updated = [...wbData.blacklist, newBlacklistItem.trim()];
    try {
      await policiesApi.updateWhitelistBlacklist({ whitelist: wbData.whitelist, blacklist: updated });
      setNewBlacklistItem('');
      fetchWB();
    } catch {}
  };

  const removeItem = async (list: 'whitelist' | 'blacklist', item: string) => {
    const updated = wbData[list].filter(i => i !== item);
    try {
      await policiesApi.updateWhitelistBlacklist({
        whitelist: list === 'whitelist' ? updated : wbData.whitelist,
        blacklist: list === 'blacklist' ? updated : wbData.blacklist,
      });
      fetchWB();
    } catch {}
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
            <div className="departments-tab grid grid-cols-1 gap-6">
              {policies.map(policy => (
                <div key={policy.id} className="card glass p-0 overflow-hidden flex flex-col border border-zinc-800">
                  <div className="flex justify-between items-center bg-zinc-900/50 p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg text-white font-bold m-0">{policy.name} {policy.departmentName ? `(${policy.departmentName})` : ''}</h2>
                        <span className="text-xs text-zinc-400 font-medium">Policy ID: {policy.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                    <button className={`btn-primary px-4 py-2 flex items-center gap-2 text-sm transition-all duration-300 ${!policyEdits[policy.id] ? 'opacity-50 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
                      disabled={saveLoading === policy.id || !policyEdits[policy.id]}
                      onClick={() => handleSavePolicy(policy.id)}>
                      <Save size={16} /> {saveLoading === policy.id ? t('Saving...', 'Đang lưu...') : t('Save Changes', 'Lưu thay đổi')}
                    </button>
                  </div>
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-zinc-950/30">
                    
                    {/* General Settings Column */}
                    <div className="flex flex-col gap-4">
                      <div className="policy-card-section">
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-zinc-300 font-bold text-sm flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-400" />
                            {t('Sensitivity Threshold', 'Ngưỡng nhạy cảm DLP')}
                          </label>
                          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md text-xs font-bold font-mono">
                            {policyEdits[policy.id]?.sensitivityThreshold ?? policy.sensitivityThreshold} / 100
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4">{t('Defines the total risk score required to trigger a DLP policy violation.', 'Xác định tổng điểm rủi ro cần thiết để kích hoạt vi phạm chính sách DLP.')}</p>
                        <input type="range" min="0" max="100"
                          defaultValue={policy.sensitivityThreshold}
                          onChange={e => handlePolicyChange(policy.id, 'sensitivityThreshold', parseInt(e.target.value))}
                          className="premium-slider" />
                        <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                          <span>0 (Strict)</span>
                          <span>100 (Lenient)</span>
                        </div>
                      </div>

                      <div className="policy-card-section flex flex-col gap-3">
                        <label className="text-zinc-300 font-bold text-sm flex items-center gap-2 mb-1">
                          <CheckCircle size={16} className="text-emerald-400" />
                          {t('Scanning Rules', 'Quy tắc Quét Tự động')}
                        </label>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors">
                          <div className="pr-4">
                            <span className="font-semibold text-white text-sm block">{t('Clipboard Protection', 'Bảo vệ Clipboard')}</span>
                            <span className="text-xs text-zinc-500">{t('Alert user when copying sensitive data', 'Cảnh báo khi người dùng sao chép dữ liệu mật')}</span>
                          </div>
                          <label className="switch shrink-0">
                            <input type="checkbox" defaultChecked={policy.clipboardWarning}
                              onChange={e => handlePolicyChange(policy.id, 'clipboardWarning', e.target.checked)} />
                            <span className="slider round"></span>
                          </label>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors">
                          <div className="pr-4">
                            <span className="font-semibold text-white text-sm block">{t('Scan On Paste', 'Quét khi Dán')}</span>
                            <span className="text-xs text-zinc-500">{t('Trigger scan when content is pasted', 'Tự động quét khi nội dung được dán vào web')}</span>
                          </div>
                          <label className="switch shrink-0">
                            <input type="checkbox" defaultChecked={policy.scanOnPaste}
                              onChange={e => handlePolicyChange(policy.id, 'scanOnPaste', e.target.checked)} />
                            <span className="slider round"></span>
                          </label>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors">
                          <div className="pr-4">
                            <span className="font-semibold text-white text-sm block">{t('Scan On Submit', 'Quét khi Gửi')}</span>
                            <span className="text-xs text-zinc-500">{t('Intercept forms & chats before sending', 'Kiểm tra trước khi cho phép gửi form/chat')}</span>
                          </div>
                          <label className="switch shrink-0">
                            <input type="checkbox" defaultChecked={policy.scanOnSubmit}
                              onChange={e => handlePolicyChange(policy.id, 'scanOnSubmit', e.target.checked)} />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* AI App Protection Column */}
                    <div className="policy-card-section border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40 hover:bg-indigo-500/10 relative overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      
                      <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
                        <div>
                          <span className="font-bold text-indigo-300 text-sm flex items-center gap-2 mb-1">
                            <ShieldAlert size={16} />
                            {t('AI Code App Protection', 'Bảo vệ App Code AI')}
                          </span>
                          <span className="text-xs text-zinc-400 block leading-relaxed">
                            {t('Agent scores Cursor/VS Code AI against source repos and dev secrets. Enforces Enterprise Guard rules.', 'Agent chấm rủi ro Cursor/VS Code AI khi truy cập repo source và secret dev. Thực thi chặn doanh nghiệp.')}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-wider font-bold border border-indigo-500/30 shrink-0 shadow-lg shadow-indigo-500/10">
                          {t('Enterprise', 'Doanh nghiệp')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 flex-1">
                        <label className="flex items-center justify-between gap-3 text-xs text-zinc-300 rounded-lg border border-indigo-500/20 bg-indigo-950/30 px-4 py-3 hover:bg-indigo-900/40 transition-colors cursor-pointer">
                          <span className="font-medium">{t('Detect source code', 'Phát hiện mã nguồn')}</span>
                          <input type="checkbox" className="accent-indigo-500 w-4 h-4 rounded border-zinc-700 bg-zinc-900" checked={Boolean(valueOf(policy, 'enableSourceCodeDetection'))}
                            onChange={e => handlePolicyChange(policy.id, 'enableSourceCodeDetection', e.target.checked)} />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-xs text-zinc-300 rounded-lg border border-indigo-500/20 bg-indigo-950/30 px-4 py-3 hover:bg-indigo-900/40 transition-colors cursor-pointer">
                          <span className="font-medium">{t('Detect dev secrets', 'Phát hiện secret dev')}</span>
                          <input type="checkbox" className="accent-indigo-500 w-4 h-4 rounded border-zinc-700 bg-zinc-900" checked={Boolean(valueOf(policy, 'enablePrivateKeyDetection'))}
                            onChange={e => handlePolicyChange(policy.id, 'enablePrivateKeyDetection', e.target.checked)} />
                        </label>
                        
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 mt-2">
                          <label className="block text-zinc-400 font-bold mb-2 text-xs uppercase tracking-wider">{t('High Risk Action', 'Hành động Rủi ro Cao')}</label>
                          <select className="bg-zinc-900 border border-zinc-700 text-white text-xs font-medium p-2.5 rounded-lg w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            value={String(valueOf(policy, 'highAction'))}
                            onChange={e => handlePolicyChange(policy.id, 'highAction', e.target.value)}>
                            <option value="Allow">Allow (Cho phép)</option>
                            <option value="PendingApproval">Pending Approval (Chờ duyệt)</option>
                            <option value="Block">Block (Chặn)</option>
                          </select>
                        </div>
                        
                        <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-500/20 mt-2">
                          <label className="block text-rose-400 font-bold mb-2 text-xs uppercase tracking-wider">{t('Critical Action', 'Hành động Nghiêm trọng')}</label>
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
              ))}
              {policies.length === 0 && (
                <div className="card glass p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-zinc-800 bg-zinc-900/20">
                  <Shield size={48} className="text-zinc-700 mb-4" />
                  <h3 className="text-lg font-bold text-zinc-300 mb-1">{t('No policies found', 'Chưa cấu hình chính sách')}</h3>
                  <p className="text-sm text-zinc-500 max-w-md mx-auto">{t('There are no department policies configured in the system. Please create one to start protecting your data.', 'Chưa có chính sách phòng ban nào được cấu hình. Vui lòng tạo chính sách để bắt đầu bảo vệ dữ liệu.')}</p>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'detectors' && (
          policiesLoading ? <LoadingSpinner text={t('Loading detectors...', 'Đang tải bộ phát hiện...')} /> : (
            <div className="detectors-tab card glass">
              {/* AI Security Engine Test Card */}
              <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">AI Security Engine Test</h2>
                    <p className="text-sm text-zinc-400">
                      Nhập thử prompt để kiểm tra luồng Web → Backend API → aiguard-ai → trả kết quả risk/mask.
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    aiHealth?.available
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}>
                    {aiHealth?.available ? `AI Online ${aiHealth.version ? `v${aiHealth.version}` : ''}` : `AI ${aiHealth?.status || 'Checking...'}`}
                  </span>
                </div>
                {aiHealth?.error && (
                  <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    {aiHealth.error}. Backend vẫn dùng local scanner fallback nếu AI service chưa chạy.
                  </div>
                )}
                <textarea
                  className="w-full min-h-[110px] rounded-lg border border-zinc-700 bg-zinc-950/80 p-3 text-sm text-white outline-none focus:border-cyan-400"
                  value={scanContent}
                  onChange={e => setScanContent(e.target.value)}
                  placeholder="Dán prompt/API key/email/CCCD để test..."
                />
                <div className="mt-3 flex items-center gap-3">
                  <button className="btn-primary px-4 py-2" type="button" disabled={scanLoading || !scanContent.trim()} onClick={runAiScanTest}>
                    {scanLoading ? 'Đang quét...' : 'Quét thử'}
                  </button>
                  {scanError && <span className="text-sm text-rose-300">{scanError}</span>}
                </div>
                {scanResult && (
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 p-4">
                      <span className="text-xs text-zinc-400">Risk Score</span>
                      <strong className="block text-2xl text-white">{scanResult.riskScore}</strong>
                      <span className="text-sm text-zinc-300">{scanResult.riskLevel} · {scanResult.decision}</span>
                    </div>
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 p-4 lg:col-span-2">
                      <span className="text-xs text-zinc-400">Policy reason</span>
                      <p className="mt-1 text-sm text-zinc-200">{scanResult.policyReason || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 p-4 lg:col-span-3">
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
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 lg:col-span-3">
                        <span className="text-xs text-emerald-200">Nội dung đã che</span>
                        <pre className="mt-2 whitespace-pre-wrap text-sm text-emerald-100">{scanResult.maskedContent}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {policies.length > 0 && (
                <div className="mt-6 border-t border-zinc-800/80 pt-6">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-white font-bold text-lg flex items-center gap-2 m-0">
                        <Shield size={18} className="text-indigo-400" />
                        {t('Detector Thresholds', 'Ngưỡng Bộ phát hiện')}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">{t('Adjust which detectors are active for the global policy and see their risk weight.', 'Điều chỉnh các bộ phát hiện và xem trọng số rủi ro của chúng.')}</p>
                    </div>
                    <button
                      className={`btn-primary px-4 py-2 flex items-center gap-2 text-sm transition-all duration-300 ${!policyEdits[policies[0].id] ? 'opacity-50 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
                      disabled={!policyEdits[policies[0].id]}
                      onClick={() => handleSavePolicy(policies[0].id)}
                    >
                      <Save size={16} /> {t('Save Detectors', 'Lưu thay đổi')}
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Email Detection', field: 'enableEmailDetection', weight: 10 },
                      { name: 'Phone Detection', field: 'enablePhoneDetection', weight: 15 },
                      { name: 'CCCD Detection', field: 'enableCccdDetection', weight: 35 },
                      { name: 'Source Code Detection', field: 'enableSourceCodeDetection', weight: 40 },
                      { name: 'HR Data Detection', field: 'enableHrDetection', weight: 45 },
                      { name: 'Financial Data Detection', field: 'enableFinancialDetection', weight: 55 },
                      { name: 'API Key Detection', field: 'enableApiKeyDetection', weight: 70 },
                      { name: 'Password Detection', field: 'enablePasswordDetection', weight: 70 },
                      { name: 'JWT Token Detection', field: 'enableTokenDetection', weight: 70 },
                      { name: 'Database URL Detection', field: 'enableDbUrlDetection', weight: 75 },
                      { name: 'Private Key Detection', field: 'enablePrivateKeyDetection', weight: 90 },
                    ].map((item, idx) => {
                      const isActive = Boolean(policyEdits[policies[0].id]?.[item.field as keyof SecurityPolicyResponse] ?? policies[0][item.field as keyof SecurityPolicyResponse]);
                      
                      let colors = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', fill: 'bg-emerald-500' };
                      if (item.weight >= 70) {
                        colors = { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', fill: 'bg-rose-500' };
                      } else if (item.weight >= 35) {
                        colors = { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', fill: 'bg-amber-500' };
                      }

                      return (
                        <div key={idx} className="detector-list-item group">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text} border ${colors.border}`}>
                              <Search size={16} />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-white block">{item.name}</span>
                              <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">{item.field}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-10 flex-1 justify-end">
                            <div className="flex flex-col items-end gap-1.5 w-32">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                                +{item.weight} Risk Score
                              </span>
                              <div className="detector-weight-bar-bg w-full">
                                <div 
                                  className={`detector-weight-bar-fill ${colors.fill}`}
                                  style={{ width: `${item.weight}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-32 justify-end">
                              <span className="text-[11px] font-bold text-zinc-500">{isActive ? 'ACTIVE' : 'OFF'}</span>
                              <label className="switch shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={event => handlePolicyChange(
                                    policies[0].id,
                                    item.field as keyof SecurityPolicyResponse,
                                    event.target.checked as never
                                  )}
                                />
                                <span className="slider round"></span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'whitelist' && (
          wbLoading ? <LoadingSpinner text={t('Loading whitelist/blacklist...', 'Đang tải danh sách trắng và đen...')} /> : (
            <div className="whitelist-tab grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Whitelist Card */}
              <div className="card glass p-6 flex flex-col min-h-[550px] h-[600px] border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl rounded-xl">
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white leading-tight m-0">{t('Exclude Keywords / Whitelist', 'Từ khóa loại trừ / Danh sách trắng')}</h2>
                      <p className="text-[11px] text-zinc-500 font-medium m-0 mt-0.5">{t('Safe terms allowed to bypass DLP checks', 'Từ khóa an toàn được bỏ qua quét DLP')}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {wbData.whitelist.length} {t('Rules', 'Quy tắc')}
                  </span>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                  {/* Search bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search size={14} className="text-zinc-500" />
                    </span>
                    <input
                      type="text"
                      value={whitelistSearch}
                      onChange={e => setWhitelistSearch(e.target.value)}
                      placeholder={t('Search whitelist keywords...', 'Tìm kiếm từ khóa danh sách trắng...')}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-9 pr-3 py-2 rounded-lg focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none"
                    />
                    {whitelistSearch && (
                      <button 
                        onClick={() => setWhitelistSearch('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Add Input and button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWhitelistItem}
                      onChange={e => setNewWhitelistItem(e.target.value)}
                      placeholder={t('Add whitelist keyword...', 'Thêm từ khóa danh sách trắng...')}
                      className="bg-zinc-950 border border-zinc-800 text-white text-xs p-2 rounded-lg flex-1 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none"
                      onKeyDown={e => e.key === 'Enter' && addWhitelistItem()}
                    />
                    <button 
                      className="btn-primary text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md shadow-emerald-900/10" 
                      onClick={addWhitelistItem}
                    >
                      <Plus size={14} />
                      <span>{t('Add', 'Thêm')}</span>
                    </button>
                  </div>
                </div>

                {/* Vertical Scrollable List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {filteredWhitelist.map((item, idx) => {
                    const isRegex = /[\\^$.*+?()[\]{}|]/.test(item);
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-emerald-500/20 hover:bg-zinc-900/80 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 shrink-0">
                            <CheckCircle size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-mono font-bold text-zinc-100 select-all leading-tight break-all pr-2">
                              {item}
                            </span>
                            <div className="flex items-center gap-2 mt-1 shrink-0 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${isRegex ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50'}`}>
                                {isRegex ? t('Regex Pattern', 'Biểu thức Regex') : t('Exact Keyword', 'Từ khóa cố định')}
                              </span>
                              <span className="text-[9px] text-zinc-500 font-semibold">
                                • {t('Scope: Global', 'Phạm vi: Toàn cục')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeItem('whitelist', item)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 shrink-0"
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
              <div className="card glass p-6 flex flex-col min-h-[550px] h-[600px] border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl rounded-xl">
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white leading-tight m-0">{t('Forbidden Keywords / Blacklist', 'Từ khóa cấm / Danh sách đen')}</h2>
                      <p className="text-[11px] text-zinc-500 font-medium m-0 mt-0.5">{t('Restricted terms flagged by DLP checks', 'Từ khóa nhạy cảm bị ngăn chặn bởi DLP')}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                    {wbData.blacklist.length} {t('Rules', 'Quy tắc')}
                  </span>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                  {/* Search bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search size={14} className="text-zinc-500" />
                    </span>
                    <input
                      type="text"
                      value={blacklistSearch}
                      onChange={e => setBlacklistSearch(e.target.value)}
                      placeholder={t('Search blacklist keywords...', 'Tìm kiếm từ khóa danh sách đen...')}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-9 pr-3 py-2 rounded-lg focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 transition-all outline-none"
                    />
                    {blacklistSearch && (
                      <button 
                        onClick={() => setBlacklistSearch('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Add Input and button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBlacklistItem}
                      onChange={e => setNewBlacklistItem(e.target.value)}
                      placeholder={t('Add blacklist keyword...', 'Thêm từ khóa danh sách đen...')}
                      className="bg-zinc-950 border border-zinc-800 text-white text-xs p-2 rounded-lg flex-1 focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 transition-all outline-none"
                      onKeyDown={e => e.key === 'Enter' && addBlacklistItem()}
                    />
                    <button 
                      className="btn-primary text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 border border-rose-500 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md shadow-rose-900/10" 
                      onClick={addBlacklistItem}
                    >
                      <Plus size={14} />
                      <span>{t('Add', 'Thêm')}</span>
                    </button>
                  </div>
                </div>

                {/* Vertical Scrollable List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {filteredBlacklist.map((item, idx) => {
                    const isRegex = /[\\^$.*+?()[\]{}|]/.test(item);
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/20 hover:bg-zinc-900/80 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/5 text-rose-400 border border-rose-500/10 shrink-0">
                            <AlertTriangle size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-mono font-bold text-rose-300 select-all leading-tight break-all pr-2">
                              {item}
                            </span>
                            <div className="flex items-center gap-2 mt-1 shrink-0 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${isRegex ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50'}`}>
                                {isRegex ? t('Regex Pattern', 'Biểu thức Regex') : t('Exact Keyword', 'Từ khóa cố định')}
                              </span>
                              <span className="text-[9px] text-rose-500 font-semibold">
                                • {t('Action: Block', 'Hành vi: Chặn')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeItem('blacklist', item)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 shrink-0"
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
    </div>
  );
};
export default Policies;
