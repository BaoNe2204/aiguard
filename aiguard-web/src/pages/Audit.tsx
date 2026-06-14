import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';
import { auditApi, type AuditLogResponse, type BlockchainBatchResponse, type VerifyBatchResponse } from '../api/audit';
import { useLanguage } from '../contexts/LanguageContext';

export const Audit: React.FC = () => {
  const location = useLocation();
  const { t, locale } = useLanguage();
  const activeTab = location.pathname.endsWith('/batches') ? 'blockchain'
    : location.pathname.endsWith('/worker') ? 'worker'
    : 'auditLogs';

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  // Blockchain batches
  const [batches, setBatches] = useState<BlockchainBatchResponse[]>([]);
  const [batchesPage, setBatchesPage] = useState(1);
  const [batchesTotalPages, setBatchesTotalPages] = useState(1);
  const [batchesTotalCount, setBatchesTotalCount] = useState(0);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<Record<string, VerifyBatchResponse | 'verifying'>>({});

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const result = await auditApi.getLogs({ page: logsPage, pageSize: 20 });
      setAuditLogs(result.items);
      setLogsTotalPages(result.totalPages);
      setLogsTotalCount(result.totalCount);
    } catch {} finally { setLogsLoading(false); }
  }, [logsPage]);

  const fetchBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const result = await auditApi.getBlockchainBatches({ page: batchesPage, pageSize: 20 });
      setBatches(result.items);
      setBatchesTotalPages(result.totalPages);
      setBatchesTotalCount(result.totalCount);
    } catch {} finally { setBatchesLoading(false); }
  }, [batchesPage]);

  useEffect(() => {
    if (activeTab === 'auditLogs') fetchLogs();
    else if (activeTab === 'blockchain') fetchBatches();
    else {
      fetchLogs();
      fetchBatches();
    }
  }, [activeTab, fetchLogs, fetchBatches]);

  const verifyBatchOnChain = async (id: string) => {
    setVerifyStatus(prev => ({ ...prev, [id]: 'verifying' }));
    try {
      const result = await auditApi.verifyBatch(id);
      setVerifyStatus(prev => ({ ...prev, [id]: result }));
    } catch {
      setVerifyStatus(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  return (
    <div className="audit-page">
      <div className="page-header">
        <div>
          <h1>{t('Audit Logs & Blockchain Verification', 'Nhật ký kiểm toán và xác minh Blockchain')}</h1>
          <p className="subtitle">{t('Verify database integrity using EVM smart contracts anchor batches', 'Xác minh tính toàn vẹn dữ liệu bằng các lô hash neo trên hợp đồng thông minh EVM')}</p>
        </div>
      </div>
<div className="tab-content">
        {activeTab === 'auditLogs' && (
          <div className="audit-tab card glass">
            {logsLoading ? <LoadingSpinner text={t('Loading audit logs...', 'Đang tải nhật ký kiểm toán...')} /> : (
              <>
                <DataTable
                  data={auditLogs}
                  columns={[
                    { header: t('Event Type', 'Loại sự kiện'), accessor: 'eventType', width: '180px' },
                    { header: t('Actor', 'Người thực hiện'), accessor: (item) => item.actorEmail || item.actorType },
                    { header: t('Risk Level', 'Mức rủi ro'), accessor: (item) => item.riskLevel || '—', width: '100px' },
                    { header: t('Decision', 'Quyết định'), accessor: (item) => item.decision || '—', width: '120px' },
                    { header: 'DB Hash', accessor: (item) => item.eventHash.substring(0, 12) + '...', width: '130px' },
                    { header: t('On-chain', 'Trên chuỗi'), accessor: (item) => (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-md ${
                        item.blockchainStatus === 'Anchored' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.blockchainStatus || 'Pending'}
                      </span>
                    ), width: '120px' },
                    { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' }
                  ]}
                />
                <Pagination page={logsPage} totalPages={logsTotalPages} totalCount={logsTotalCount} pageSize={20} onPageChange={setLogsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'blockchain' && (
          <div className="blockchain-tab card glass">
            {batchesLoading ? <LoadingSpinner text={t('Loading batches...', 'Đang tải các lô neo...')} /> : (
              <>
                <DataTable
                  data={batches}
                  columns={[
                    { header: t('Logs', 'Số log'), accessor: 'logCount', width: '70px' },
                    { header: 'Batch Hash', accessor: (item) => item.batchHash.substring(0, 20) + '...' },
                    { header: 'Tx Hash', accessor: (item) => item.transactionHash ? item.transactionHash.substring(0, 16) + '...' : 'N/A' },
                    { header: t('Block #', 'Khối #'), accessor: (item) => item.blockNumber || t('Pending', 'Đang chờ'), width: '100px' },
                    { header: t('Status', 'Trạng thái'), accessor: (item) => (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                        item.status === 'Anchored' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        item.status === 'Failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    ), width: '110px' },
                    { header: t('Verify', 'Xác minh'), accessor: (item) => {
                      const status = verifyStatus[item.id];
                      if (status === 'verifying') return <RefreshCw size={14} className="animate-spin text-indigo-400" />;
                      if (status) {
                        return status.isMatch
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={14} /> {t('Verified', 'Đã xác minh')}</span>
                          : <span className="flex items-center gap-1 text-xs text-rose-400"><XCircle size={14} /> {t('Mismatch', 'Không khớp')}</span>;
                      }
                      return (
                        <button
                          className={`btn-action flex items-center gap-1 text-xs ${item.status === 'Failed' ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() => verifyBatchOnChain(item.id)}
                        >
                          <RefreshCw size={12} /> {t('Verify', 'Xác minh')}
                        </button>
                      );
                    }, width: '120px' }
                  ]}
                />
                <Pagination page={batchesPage} totalPages={batchesTotalPages} totalCount={batchesTotalCount} pageSize={20} onPageChange={setBatchesPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'worker' && (
          <div className="worker-tab grid grid-cols-2 gap-6">
            <div className="card glass p-6">
              <h2 className="mb-4">{t('Background Anchor Worker Metrics', 'Thông số tiến trình neo nền')}</h2>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Worker Status', 'Trạng thái tiến trình')}:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> {t('Running', 'Đang chạy')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Anchor Interval', 'Chu kỳ neo')}:</span>
                  <span className="text-white">{t('Every 5 minutes', 'Mỗi 5 phút')}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Total Batches', 'Tổng số lô')}:</span>
                  <span className="text-white">{batchesTotalCount}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-700/30 pb-2">
                  <span className="text-zinc-400">{t('Total Audit Logs', 'Tổng log kiểm toán')}:</span>
                  <span className="text-white">{logsTotalCount}</span>
                </div>
              </div>
            </div>

            <div className="card glass p-6 flex flex-col justify-between">
              <div>
                <h2 className="mb-2">{t('Blockchain Node Connect Config', 'Cấu hình kết nối Blockchain')}</h2>
                <p className="text-xs text-zinc-400 mb-4">{t('Read-only connection configuration for EVM chain audit verification.', 'Cấu hình kết nối chỉ đọc để xác minh kiểm toán trên chuỗi EVM.')}</p>
                <div className="flex flex-col gap-2 text-xs font-mono text-zinc-300">
                  <div><span className="text-indigo-400">Contract:</span> AuditAnchor.sol ({t('Configured in backend', 'Cấu hình tại backend')})</div>
                  <div><span className="text-indigo-400">EVM RPC:</span> {t('See appsettings.json → BlockchainSettings', 'Xem appsettings.json → BlockchainSettings')}</div>
                  <div><span className="text-indigo-400">{t('Status', 'Trạng thái')}:</span> {t('Managed by BlockchainAnchorWorker', 'Được quản lý bởi BlockchainAnchorWorker')}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Audit;
