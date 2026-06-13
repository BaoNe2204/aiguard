import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { History, User, CheckCircle, ShieldAlert } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { DecisionBadge } from '../components/ui/DecisionBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';
import { useAuth } from '../contexts/AuthContext';
import type { EndpointEventResponse } from '../api/endpoints';
import type { ApprovalResponse } from '../api/approvals';
import { myUsageApi } from '../api/myUsage';
import { useLanguage } from '../contexts/LanguageContext';

export const MyUsage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const activeTab = location.pathname.endsWith('/approvals') ? 'approvals'
    : location.pathname.endsWith('/summary') ? 'summary'
    : 'logs';
  const { user } = useAuth();

  // Personal logs
  const [logs, setLogs] = useState<EndpointEventResponse[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  // Personal approvals
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'logs' && user) {
      setLogsLoading(true);
      myUsageApi.getEvents({ page: logsPage, pageSize: 20 })
        .then(result => {
          setLogs(result.items);
          setLogsTotalPages(result.totalPages);
          setLogsTotalCount(result.totalCount);
        })
        .catch(() => {})
        .finally(() => setLogsLoading(false));
    } else if (activeTab === 'approvals') {
      setApprovalsLoading(true);
      myUsageApi.getApprovals({ page: 1, pageSize: 20 })
        .then(result => setApprovals(result.items))
        .catch(() => {})
        .finally(() => setApprovalsLoading(false));
    }
  }, [activeTab, logsPage, user]);

  const maskedCount = logs.filter(l => l.decision === 'Mask').length;
  const blockedCount = logs.filter(l => l.decision === 'Block').length;

  return (
    <div className="my-usage-page">
      <div className="page-header">
        <div>
          <h1>{t('My Personal Usage Portal', 'Trang hoạt động cá nhân')}</h1>
          <p className="subtitle">{t('Track your checked prompts, pending approvals, and security behavior rating', 'Theo dõi prompt đã kiểm tra, yêu cầu phê duyệt và điểm hành vi an toàn')}</p>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => navigate('/app/my-usage/logs')}>
          <History size={16} /> {t('Personal Prompt Logs', 'Nhật ký prompt cá nhân')}
        </button>
        <button className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => navigate('/app/my-usage/approvals')}>
          <CheckCircle size={16} /> {t('My Approval Status', 'Trạng thái phê duyệt')}
        </button>
        <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => navigate('/app/my-usage/summary')}>
          <User size={16} /> {t('Security Habit Rating', 'Đánh giá thói quen an toàn')}
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'logs' && (
          <div className="logs-tab card glass">
            {logsLoading ? <LoadingSpinner text={t('Loading your logs...', 'Đang tải nhật ký của bạn...')} /> : (
              <>
                <DataTable
                  data={logs}
                  columns={[
                    { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                    { header: t('Destination AI', 'AI đích'), accessor: 'websiteAi', width: '150px' },
                    { header: t('DLP matches', 'Dữ liệu DLP phát hiện'), accessor: 'dataTypeMatched', width: '150px' },
                    { header: t('Masked Preview', 'Nội dung đã che'), accessor: (item) => item.maskedContentPreview || '—' },
                    { header: t('Risk Score', 'Điểm rủi ro'), accessor: (item) => `${item.riskScore}/100`, width: '100px' },
                    { header: t('Enforcement', 'Xử lý'), accessor: (item) => <DecisionBadge decision={item.decision as any} />, width: '150px' }
                  ]}
                />
                <Pagination page={logsPage} totalPages={logsTotalPages} totalCount={logsTotalCount} pageSize={20} onPageChange={setLogsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="approvals-tab card glass">
            {approvalsLoading ? <LoadingSpinner text={t('Loading approvals...', 'Đang tải yêu cầu phê duyệt...')} /> : (
              <DataTable
                data={approvals}
                columns={[
                  { header: t('Type', 'Loại'), accessor: 'requestType', width: '100px' },
                  { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                  { header: t('Summary', 'Tóm tắt'), accessor: (item) => item.eventSummary || item.dataTypeMatched || '—' },
                  { header: t('Approver', 'Người phê duyệt'), accessor: (item) => item.assignedApproverName || '—', width: '200px' },
                  { header: t('Status', 'Trạng thái'), accessor: (item) => (
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      item.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      item.status === 'Approved' || item.status === 'ApprovedWithMasking' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {item.status}
                    </span>
                  ), width: '150px' }
                ]}
              />
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="summary-tab grid grid-cols-2 gap-6">
            <div className="card glass p-6">
              <h2 className="mb-4">{t('Your AI Safety Habits', 'Thói quen sử dụng AI an toàn')}</h2>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Total prompts checked', 'Tổng prompt đã kiểm tra')}:</span>
                  <span className="text-white font-bold">{logsTotalCount}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Masked prompts (medium risk)', 'Prompt đã che (rủi ro trung bình)')}:</span>
                  <span className="text-sky-400 font-bold">{maskedCount}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Blocked prompts (high risk)', 'Prompt đã chặn (rủi ro cao)')}:</span>
                  <span className="text-rose-400 font-bold">{blockedCount}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Safety Score', 'Điểm an toàn')}:</span>
                  <span className={`font-bold ${blockedCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {logsTotalCount > 0 ? Math.max(0, 100 - (blockedCount * 10) - (maskedCount * 2)) : 100} / 100
                    {blockedCount === 0 ? ` (${t('Excellent', 'Xuất sắc')})` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="card glass p-6 flex flex-col justify-between">
              <div>
                <h2 className="mb-2">{t('AIGuard Privacy Statement', 'Cam kết quyền riêng tư của AIGuard')}</h2>
                <p className="text-sm text-zinc-400 mb-4">{t('AIGuard only checks content submitted to generative AI platforms or clipboard logs according to company data policies.', 'AIGuard chỉ kiểm tra nội dung gửi đến nền tảng AI tạo sinh hoặc Clipboard theo chính sách dữ liệu của doanh nghiệp.')}</p>
                <div className="flex items-start gap-2.5 text-xs text-zinc-400 bg-zinc-900 p-4 rounded border border-zinc-700">
                  <ShieldAlert className="text-indigo-400 shrink-0" size={16} />
                  <span>{t('Your original sensitive text is never sent or stored on the server unless explicitly requested by a Policy or when waiting for manager approval.', 'Nội dung nhạy cảm gốc không được gửi hoặc lưu trên máy chủ, trừ khi chính sách yêu cầu rõ ràng hoặc nội dung đang chờ quản lý phê duyệt.')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MyUsage;
