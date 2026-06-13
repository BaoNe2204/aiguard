import { apiRequest, buildQuery } from './client';
import type { PagedResult, PagedQuery } from './client';

export interface AuditLogResponse {
  id: string;
  eventType: string;
  actorType: string;
  actorEmail: string | null;
  departmentName: string | null;
  riskLevel: string | null;
  decision: string | null;
  eventHash: string;
  previousHash: string | null;
  blockchainBatchId: string | null;
  blockchainStatus: string | null;
  createdAt: string;
}

export interface BlockchainBatchResponse {
  id: string;
  logCount: number;
  batchHash: string;
  transactionHash: string | null;
  blockNumber: number | null;
  status: string;
  createdAt: string;
  anchoredAt: string | null;
}

export interface VerifyBatchResponse {
  batchId: string;
  batchHash: string;
  computedHash: string;
  isMatch: boolean;
  verificationStatus: string;
  verifiedAt: string;
}

export const auditApi = {
  getLogs(
    query: PagedQuery = {},
    filters: { eventType?: string; riskLevel?: string; actorType?: string } = {}
  ): Promise<PagedResult<AuditLogResponse>> {
    return apiRequest<PagedResult<AuditLogResponse>>(
      `/audit/logs${buildQuery({ ...query, ...filters })}`
    );
  },

  getBlockchainBatches(query: PagedQuery = {}): Promise<PagedResult<BlockchainBatchResponse>> {
    return apiRequest<PagedResult<BlockchainBatchResponse>>(
      `/blockchain/batches${buildQuery(query)}`
    );
  },

  verifyBatch(batchId: string): Promise<VerifyBatchResponse> {
    return apiRequest<VerifyBatchResponse>(`/blockchain/verify/${batchId}`, {
      method: 'POST',
    });
  },
};
