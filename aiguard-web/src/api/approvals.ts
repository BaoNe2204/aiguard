import { apiRequest, buildQuery } from './client';
import type { PagedResult, PagedQuery } from './client';

export interface ApprovalResponse {
  id: string;
  requestType: string;
  endpointEventId: string | null;
  agentActionLogId: string | null;
  requestedByUserEmail: string;
  assignedApproverName: string | null;
  status: string;
  reason: string | null;
  approverNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  eventSummary: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  dataTypeMatched: string | null;
  maskedPreview: string | null;
}

export const approvalsApi = {
  getPending(query: PagedQuery = {}, requestType?: string): Promise<PagedResult<ApprovalResponse>> {
    return apiRequest<PagedResult<ApprovalResponse>>(
      `/approvals/pending${buildQuery({ ...query, requestType })}`
    );
  },

  processApproval(id: string, action: string, note?: string): Promise<ApprovalResponse> {
    return apiRequest<ApprovalResponse>(`/approvals/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  },

  getHistory(query: PagedQuery = {}): Promise<PagedResult<ApprovalResponse>> {
    return apiRequest<PagedResult<ApprovalResponse>>(
      `/approvals/history${buildQuery(query)}`
    );
  },
};
