import { apiRequest, buildQuery } from './client';
import type { PagedQuery, PagedResult } from './client';
import type { EndpointEventResponse } from './endpoints';
import type { ApprovalResponse } from './approvals';

export const myUsageApi = {
  getEvents(query: PagedQuery = {}): Promise<PagedResult<EndpointEventResponse>> {
    return apiRequest<PagedResult<EndpointEventResponse>>(`/my-usage/events${buildQuery(query)}`);
  },

  getApprovals(query: PagedQuery = {}): Promise<PagedResult<ApprovalResponse>> {
    return apiRequest<PagedResult<ApprovalResponse>>(`/my-usage/approvals${buildQuery(query)}`);
  },
};
