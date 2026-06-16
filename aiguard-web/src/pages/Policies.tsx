import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Save, X, RotateCcw } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { policiesApi, type SecurityPolicyResponse, type PolicyVersionResponse, type WhitelistBlacklistResponse } from '../api/policies';
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
              {policies.map(policy => (
                <div key={policy.id} className="card glass p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-zinc-700/40 pb-2">
                    <h2 className="text-white font-bold">{policy.name} {policy.departmentName ? `(${policy.departmentName})` : ''}</h2>
                    <button className="btn-action px-3 py-1 flex items-center gap-1.5 text-xs"
                      disabled={saveLoading === policy.id || !policyEdits[policy.id]}
                      onClick={() => handleSavePolicy(policy.id)}>
                      <Save size={12} /> {saveLoading === policy.id ? t('Saving...', 'Đang lưu...') : t('Save Changes', 'Lưu thay đổi')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-zinc-400 font-semibold mb-1">{t('Sensitivity Threshold (0-100)', 'Ngưỡng nhạy cảm (0-100)')}</label>
                        <div className="flex items-center gap-4">
                          <input type="range" min="0" max="100"
                            defaultValue={policy.sensitivityThreshold}
                            onChange={e => handlePolicyChange(policy.id, 'sensitivityThreshold', parseInt(e.target.value))}
                            className="w-full accent-indigo-500" />
                          <span className="text-white font-bold">{policyEdits[policy.id]?.sensitivityThreshold ?? policy.sensitivityThreshold}</span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="font-semibold text-white block">{t('AI Code App Protection', 'Bảo vệ app AI code')}</span>
                            <span className="text-xs text-zinc-400">
                              {t('Agent scores Cursor/Codex/VS Code AI against source repos and developer secrets.', 'Agent chấm rủi ro Cursor/Codex/VS Code AI khi gặp repo source và secret dev.')}
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 text-[11px] font-semibold border border-rose-500/20">
                            {t('Enterprise Guard', 'Chặn doanh nghiệp')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <label className="flex items-center justify-between gap-3 text-xs text-zinc-300 rounded border border-zinc-700/60 bg-zinc-950/50 px-3 py-2">
                            <span>{t('Detect source workspace', 'Phát hiện source code')}</span>
                            <input type="checkbox" checked={Boolean(valueOf(policy, 'enableSourceCodeDetection'))}
                              onChange={e => handlePolicyChange(policy.id, 'enableSourceCodeDetection', e.target.checked)} />
                          </label>
                          <label className="flex items-center justify-between gap-3 text-xs text-zinc-300 rounded border border-zinc-700/60 bg-zinc-950/50 px-3 py-2">
                            <span>{t('Detect developer secrets', 'Phát hiện secret dev')}</span>
                            <input type="checkbox" checked={Boolean(valueOf(policy, 'enablePrivateKeyDetection'))}
                              onChange={e => handlePolicyChange(policy.id, 'enablePrivateKeyDetection', e.target.checked)} />
                          </label>
                          <div>
                            <label className="block text-zinc-400 font-semibold mb-1 text-xs">{t('High risk action', 'Hành động rủi ro cao')}</label>
                            <select className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded w-full"
                              value={String(valueOf(policy, 'highAction'))}
                              onChange={e => handlePolicyChange(policy.id, 'highAction', e.target.value)}>
                              <option value="Allow">Allow</option>
                              <option value="PendingApproval">PendingApproval</option>
                              <option value="Block">Block</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-400 font-semibold mb-1 text-xs">{t('Critical action', 'Hành động nghiêm trọng')}</label>
                            <select className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded w-full"
                              value={String(valueOf(policy, 'criticalAction'))}
                              onChange={e => handlePolicyChange(policy.id, 'criticalAction', e.target.value)}>
                              <option value="PendingApproval">PendingApproval</option>
                              <option value="Block">Block</option>
                              <option value="Quarantine">Quarantine</option>
                              <option value="KillProcess">KillProcess</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-zinc-400">
                          {t('Logic: AI app + source repo = High. AI app + .env/private key/secrets = Critical. Critical Block closes the AI app and quarantines the device.', 'Logic: App AI + repo source = High. App AI + .env/private key/secrets = Critical. Critical Block sẽ đóng app AI và quarantine thiết bị.')}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white block">{t('Clipboard Protection', 'Bảo vệ Clipboard')}</span>
                          <span className="text-xs text-zinc-400">{t('Alert user when copying secrets', 'Cảnh báo khi người dùng sao chép dữ liệu mật')}</span>
                        </div>
                        <label className="switch">
                          <input type="checkbox" defaultChecked={policy.clipboardWarning}
                            onChange={e => handlePolicyChange(policy.id, 'clipboardWarning', e.target.checked)} />
                          <span className="slider round"></span>
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white block">{t('Scan On Paste', 'Quét khi dán')}</span>
                          <span className="text-xs text-zinc-400">{t('Trigger scan when content is pasted', 'Tự động quét khi nội dung được dán')}</span>
                        </div>
                        <label className="switch">
                          <input type="checkbox" defaultChecked={policy.scanOnPaste}
                            onChange={e => handlePolicyChange(policy.id, 'scanOnPaste', e.target.checked)} />
                          <span className="slider round"></span>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white block">{t('Scan On Submit', 'Quét khi gửi')}</span>
                          <span className="text-xs text-zinc-400">{t('Intercept the Send button', 'Kiểm tra trước khi cho phép gửi')}</span>
                        </div>
                        <label className="switch">
                          <input type="checkbox" defaultChecked={policy.scanOnSubmit}
                            onChange={e => handlePolicyChange(policy.id, 'scanOnSubmit', e.target.checked)} />
                          <span className="slider round"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {policies.length === 0 && <div className="card glass p-6 text-center text-zinc-500">{t('No department policies configured', 'Chưa cấu hình chính sách phòng ban')}</div>}
            </div>
          )
        )}

        {activeTab === 'detectors' && (
          policiesLoading ? <LoadingSpinner text={t('Loading detectors...', 'Đang tải bộ phát hiện...')} /> : (
            <div className="detectors-tab card glass">
              {policies.length > 0 && (
                <DataTable
                  data={[
                    { name: 'Email Detection', field: 'enableEmailDetection', weight: 10 },
                    { name: 'Phone Detection', field: 'enablePhoneDetection', weight: 15 },
                    { name: 'CCCD Detection', field: 'enableCccdDetection', weight: 35 },
                    { name: 'API Key Detection', field: 'enableApiKeyDetection', weight: 70 },
                    { name: 'Password Detection', field: 'enablePasswordDetection', weight: 70 },
                    { name: 'JWT Token Detection', field: 'enableTokenDetection', weight: 70 },
                    { name: 'Database URL Detection', field: 'enableDbUrlDetection', weight: 75 },
                    { name: 'Private Key Detection', field: 'enablePrivateKeyDetection', weight: 90 },
                    { name: 'Source Code Detection', field: 'enableSourceCodeDetection', weight: 40 },
                    { name: 'Financial Data Detection', field: 'enableFinancialDetection', weight: 55 },
                    { name: 'HR Data Detection', field: 'enableHrDetection', weight: 45 },
                  ]}
                  columns={[
                    { header: t('Detector Name', 'Tên bộ phát hiện'), accessor: 'name' },
                    { header: t('Default Weight', 'Trọng số mặc định'), accessor: (item) => `+${item.weight}`, width: '140px' },
                    { header: t('Active (1st Policy)', 'Kích hoạt (chính sách đầu)'), accessor: (item) => (
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={Boolean(policyEdits[policies[0].id]?.[item.field as keyof SecurityPolicyResponse] ?? policies[0][item.field as keyof SecurityPolicyResponse])}
                          onChange={event => handlePolicyChange(
                            policies[0].id,
                            item.field as keyof SecurityPolicyResponse,
                            event.target.checked as never
                          )}
                        />
                        <span className="slider round"></span>
                      </label>
                    ), width: '140px' },
                    { header: t('Save', 'Lưu'), accessor: () => (
                      <button
                        className="btn-action text-xs"
                        disabled={!policyEdits[policies[0].id]}
                        onClick={() => handleSavePolicy(policies[0].id)}
                      >
                        {t('Save detector settings', 'Lưu cấu hình phát hiện')}
                      </button>
                    ), width: '180px' }
                  ]}
                />
              )}
            </div>
          )
        )}

        {activeTab === 'whitelist' && (
          wbLoading ? <LoadingSpinner text={t('Loading whitelist/blacklist...', 'Đang tải danh sách trắng và đen...')} /> : (
            <div className="whitelist-tab grid grid-cols-2 gap-6">
              <div className="card glass p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2>{t('Exclude Keywords / Whitelist', 'Từ khóa loại trừ / Danh sách trắng')}</h2>
                </div>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={newWhitelistItem} onChange={e => setNewWhitelistItem(e.target.value)}
                    placeholder={t('Add whitelist keyword...', 'Thêm từ khóa danh sách trắng...')} className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded flex-1"
                    onKeyDown={e => e.key === 'Enter' && addWhitelistItem()} />
                  <button className="btn-action text-xs flex items-center gap-1" onClick={addWhitelistItem}><Plus size={12} /> {t('Add', 'Thêm')}</button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {wbData.whitelist.map((item, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono flex items-center gap-1.5">
                      {item}
                      <button onClick={() => removeItem('whitelist', item)} className="text-zinc-500 hover:text-rose-400"><X size={10} /></button>
                    </span>
                  ))}
                  {wbData.whitelist.length === 0 && <span className="text-zinc-500">{t('No whitelist keywords', 'Chưa có từ khóa danh sách trắng')}</span>}
                </div>
              </div>

              <div className="card glass p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2>{t('Forbidden Keywords / Blacklist', 'Từ khóa cấm / Danh sách đen')}</h2>
                </div>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={newBlacklistItem} onChange={e => setNewBlacklistItem(e.target.value)}
                    placeholder={t('Add blacklist keyword...', 'Thêm từ khóa danh sách đen...')} className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded flex-1"
                    onKeyDown={e => e.key === 'Enter' && addBlacklistItem()} />
                  <button className="btn-action text-xs flex items-center gap-1" onClick={addBlacklistItem}><Plus size={12} /> {t('Add', 'Thêm')}</button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {wbData.blacklist.map((item, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono flex items-center gap-1.5">
                      {item}
                      <button onClick={() => removeItem('blacklist', item)} className="text-rose-300 hover:text-rose-100"><X size={10} /></button>
                    </span>
                  ))}
                  {wbData.blacklist.length === 0 && <span className="text-zinc-500">{t('No blacklist keywords', 'Chưa có từ khóa danh sách đen')}</span>}
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'versions' && (
          versionsLoading ? <LoadingSpinner text={t('Loading versions...', 'Đang tải phiên bản...')} /> : (
            <div className="versions-tab card glass">
              <DataTable
                data={versions}
                columns={[
                  { header: t('Version ID', 'Mã phiên bản'), accessor: 'version', width: '150px' },
                  { header: t('Reason / Description', 'Lý do / Mô tả'), accessor: 'reason' },
                  { header: t('Updated By', 'Người cập nhật'), accessor: 'updatedBy' },
                  { header: t('Updated At', 'Thời gian cập nhật'), accessor: (item) => new Date(item.updatedAt).toLocaleString(locale), width: '180px' },
                  { header: t('Action', 'Thao tác'), accessor: (item) => (
                    <button className="btn-action text-xs px-2.5 py-1 flex items-center gap-1" onClick={() => handleRollback(item.id)}>
                      <RotateCcw size={12} /> {t('Rollback', 'Khôi phục')}
                    </button>
                  ), width: '120px' }
                ]}
              />
              {versions.length === 0 && <div className="p-6 text-center text-zinc-500">{t('No version history', 'Chưa có lịch sử phiên bản')}</div>}
            </div>
          )
        )}
      </div>
    </div>
  );
};
export default Policies;
