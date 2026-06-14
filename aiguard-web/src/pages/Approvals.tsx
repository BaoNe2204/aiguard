import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, X, Eye } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { RiskBadge } from '../components/ui/RiskBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';
import { approvalsApi, type ApprovalResponse } from '../api/approvals';
import { useLanguage } from '../contexts/LanguageContext';

export const Approvals: React.FC = () => {
  const location = useLocation();
  const { t, locale } = useLanguage();
  const activeTab = location.pathname.endsWith('/agents') ? 'agents'
    : location.pathname.endsWith('/history') ? 'history'
    : 'prompts';
  const [selectedApproval, setSelectedApproval] = useState<ApprovalResponse | null>(null);

  // Pending prompts
  const [prompts, setPrompts] = useState<ApprovalResponse[]>([]);
  const [promptsPage, setPromptsPage] = useState(1);
  const [promptsTotalPages, setPromptsTotalPages] = useState(1);
  const [promptsTotalCount, setPromptsTotalCount] = useState(0);
  const [promptsLoading, setPromptsLoading] = useState(false);

  // Pending agents
  const [agents, setAgents] = useState<ApprovalResponse[]>([]);
  const [agentsPage, setAgentsPage] = useState(1);
  const [agentsTotalPages, setAgentsTotalPages] = useState(1);
  const [agentsTotalCount, setAgentsTotalCount] = useState(0);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // History
  const [history, setHistory] = useState<ApprovalResponse[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setPromptsLoading(true);
    try {
      const result = await approvalsApi.getPending({ page: promptsPage, pageSize: 20 }, 'EndpointDLP');
      setPrompts(result.items);
      setPromptsTotalPages(result.totalPages);
      setPromptsTotalCount(result.totalCount);
    } catch {} finally { setPromptsLoading(false); }
  }, [promptsPage]);

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const result = await approvalsApi.getPending({ page: agentsPage, pageSize: 20 }, 'AgentAction');
      setAgents(result.items);
      setAgentsTotalPages(result.totalPages);
      setAgentsTotalCount(result.totalCount);
    } catch {} finally { setAgentsLoading(false); }
  }, [agentsPage]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await approvalsApi.getHistory({ page: historyPage, pageSize: 20 });
      setHistory(result.items);
      setHistoryTotalPages(result.totalPages);
      setHistoryTotalCount(result.totalCount);
    } catch {} finally { setHistoryLoading(false); }
  }, [historyPage]);

  useEffect(() => {
    if (activeTab === 'prompts') fetchPrompts();
    else if (activeTab === 'agents') fetchAgents();
    else if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchPrompts, fetchAgents, fetchHistory]);

  const handleAction = async (id: string, action: string, note?: string) => {
    setActionLoading(id);
    try {
      await approvalsApi.processApproval(id, action, note);
      setSelectedApproval(null);
      // Refresh current tab
      if (activeTab === 'prompts') fetchPrompts();
      else if (activeTab === 'agents') fetchAgents();
    } catch {} finally { setActionLoading(null); }
  };

  return (
    <div className="approvals-page">
      <div className="page-header">
        <div>
          <h1>{t('Approval Center', 'Trung tâm phê duyệt')}</h1>
          <p className="subtitle">{t('Review and authorize sensitive prompts and AI Agent actions', 'Xem xét và phê duyệt prompt nhạy cảm cùng hành động của AI Agent')}</p>
        </div>
      </div>
<div className="tab-content">
        {activeTab === 'prompts' && (
          <div className="prompts-tab card glass">
            {promptsLoading ? <LoadingSpinner text={t('Loading pending prompts...', 'Đang tải prompt chờ duyệt...')} /> : (
              <>
                <DataTable
                  data={prompts}
                  columns={[
                    { header: t('Requester', 'Người yêu cầu'), accessor: 'requestedByUserEmail' },
                    { header: t('Type', 'Loại'), accessor: 'requestType', width: '100px' },
                    { header: t('Risk Level', 'Mức rủi ro'), accessor: (item) => item.riskLevel ? <RiskBadge level={item.riskLevel as any} /> : '—', width: '100px' },
                    { header: t('Risk Score', 'Điểm rủi ro'), accessor: (item) => item.riskScore ?? '—', width: '100px' },
                    { header: t('Data Matched', 'Dữ liệu phát hiện'), accessor: (item) => item.dataTypeMatched || '—' },
                    { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                    { header: t('Actions', 'Thao tác'), accessor: (item) => (
                      <div className="flex gap-2">
                        <button className="btn-action px-2 py-1 flex items-center gap-1 text-xs" onClick={() => setSelectedApproval(item)}>
                          <Eye size={12} /> {t('Details', 'Chi tiết')}
                        </button>
                        <button className="btn-action px-2 py-1 text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs flex items-center gap-1"
                          disabled={actionLoading === item.id}
                          onClick={() => handleAction(item.id, 'Approve')}>
                          <Check size={12} /> {t('Allow', 'Cho phép')}
                        </button>
                        <button className="btn-action px-2 py-1 text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-xs flex items-center gap-1"
                          disabled={actionLoading === item.id}
                          onClick={() => handleAction(item.id, 'Reject')}>
                          <X size={12} /> {t('Reject', 'Từ chối')}
                        </button>
                      </div>
                    ), width: '280px' }
                  ]}
                />
                <Pagination page={promptsPage} totalPages={promptsTotalPages} totalCount={promptsTotalCount} pageSize={20} onPageChange={setPromptsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="agents-tab card glass">
            {agentsLoading ? <LoadingSpinner text={t('Loading agent approvals...', 'Đang tải yêu cầu Agent...')} /> : (
              <>
                <DataTable
                  data={agents}
                  columns={[
                    { header: t('Requester', 'Người yêu cầu'), accessor: 'requestedByUserEmail' },
                    { header: t('Summary', 'Tóm tắt'), accessor: (item) => item.eventSummary || '—' },
                    { header: t('Risk Level', 'Mức rủi ro'), accessor: (item) => item.riskLevel ? <RiskBadge level={item.riskLevel as any} /> : '—', width: '100px' },
                    { header: t('Risk Score', 'Điểm rủi ro'), accessor: (item) => item.riskScore ?? '—', width: '100px' },
                    { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                    { header: t('Actions', 'Thao tác'), accessor: (item) => (
                      <div className="flex gap-2">
                        <button className="btn-action px-2 py-1 text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs flex items-center gap-1"
                          disabled={actionLoading === item.id}
                          onClick={() => handleAction(item.id, 'Approve')}>
                          <Check size={12} /> {t('Approve', 'Phê duyệt')}
                        </button>
                        <button className="btn-action px-2 py-1 text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-xs flex items-center gap-1"
                          disabled={actionLoading === item.id}
                          onClick={() => handleAction(item.id, 'Reject')}>
                          <X size={12} /> {t('Block', 'Chặn')}
                        </button>
                      </div>
                    ), width: '180px' }
                  ]}
                />
                <Pagination page={agentsPage} totalPages={agentsTotalPages} totalCount={agentsTotalCount} pageSize={20} onPageChange={setAgentsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab card glass">
            {historyLoading ? <LoadingSpinner text={t('Loading history...', 'Đang tải lịch sử...')} /> : (
              <>
                <DataTable
                  data={history}
                  columns={[
                    { header: t('Requester', 'Người yêu cầu'), accessor: 'requestedByUserEmail' },
                    { header: t('Type', 'Loại'), accessor: 'requestType', width: '110px' },
                    { header: t('Summary', 'Tóm tắt'), accessor: (item) => item.eventSummary || item.dataTypeMatched || '—' },
                    { header: t('Risk Score', 'Điểm rủi ro'), accessor: (item) => item.riskScore ?? '—', width: '100px' },
                    { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                    { header: t('Decision', 'Quyết định'), accessor: (item) => (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                        item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        item.status === 'ApprovedWithMasking' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {item.status}
                      </span>
                    ), width: '180px' }
                  ]}
                />
                <Pagination page={historyPage} totalPages={historyTotalPages} totalCount={historyTotalCount} pageSize={20} onPageChange={setHistoryPage} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedApproval && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl w-full glass">
            <div className="modal-header">
              <h2>{t('Approval Details', 'Chi tiết phê duyệt')}</h2>
              <button className="text-zinc-400 hover:text-white" onClick={() => setSelectedApproval(null)}><X size={18} /></button>
            </div>
            <div className="modal-body flex flex-col gap-4 text-sm">
              <div>
                <span className="font-semibold text-zinc-400 block mb-1">{t('Requester', 'Người yêu cầu')}:</span>
                <span className="text-white">{selectedApproval.requestedByUserEmail}</span>
              </div>
              <div>
                <span className="font-semibold text-zinc-400 block mb-1">{t('Type', 'Loại')}:</span>
                <span className="text-white">{selectedApproval.requestType}</span>
              </div>
              {selectedApproval.maskedPreview && (
                <div>
                  <span className="font-semibold text-zinc-400 block mb-1">{t('Masked Preview', 'Nội dung đã che')}:</span>
                  <div className="p-3 rounded bg-zinc-900 border border-zinc-700 font-mono text-xs text-sky-400 whitespace-pre-wrap">
                    {selectedApproval.maskedPreview}
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                {selectedApproval.riskLevel && (
                  <div>
                    <span className="font-semibold text-zinc-400 block mb-1">{t('Risk Rating', 'Mức rủi ro')}:</span>
                    <RiskBadge level={selectedApproval.riskLevel as any} />
                  </div>
                )}
                {selectedApproval.riskScore !== null && (
                  <div>
                    <span className="font-semibold text-zinc-400 block mb-1">{t('Risk Score', 'Điểm rủi ro')}:</span>
                    <span className="text-white font-bold">{selectedApproval.riskScore} / 100</span>
                  </div>
                )}
              </div>
              {selectedApproval.reason && (
                <div>
                  <span className="font-semibold text-zinc-400 block mb-1">{t('Reason', 'Lý do')}:</span>
                  <span className="text-zinc-300">{selectedApproval.reason}</span>
                </div>
              )}
            </div>
            <div className="modal-footer flex justify-end gap-2 mt-4">
              <button className="btn-action px-3 py-1.5" onClick={() => setSelectedApproval(null)}>{t('Close', 'Đóng')}</button>
              <button className="btn-action px-3 py-1.5 text-sky-400 border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10"
                disabled={actionLoading === selectedApproval.id}
                onClick={() => handleAction(selectedApproval.id, 'ApproveWithMasking')}>
                {t('Approve with Masking', 'Phê duyệt sau khi che dữ liệu')}
              </button>
              <button className="btn-action px-3 py-1.5 text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                disabled={actionLoading === selectedApproval.id}
                onClick={() => handleAction(selectedApproval.id, 'Approve')}>
                {t('Approve Raw', 'Phê duyệt dữ liệu gốc')}
              </button>
              <button className="btn-action px-3 py-1.5 text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10"
                disabled={actionLoading === selectedApproval.id}
                onClick={() => handleAction(selectedApproval.id, 'Reject')}>
                {t('Reject & Block', 'Từ chối và chặn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Approvals;
