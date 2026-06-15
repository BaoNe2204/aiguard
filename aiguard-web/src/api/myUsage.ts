import { apiRequest, buildQuery } from './client';
import type { PagedQuery, PagedResult } from './client';
import type { EndpointEventResponse } from './endpoints';
import type { ApprovalResponse } from './approvals';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export const myUsageApi = {
  getEvents(query: PagedQuery = {}): Promise<PagedResult<EndpointEventResponse>> {
    return apiRequest<PagedResult<EndpointEventResponse>>(`/my-usage/events${buildQuery(query)}`);
  },

  getApprovals(query: PagedQuery = {}): Promise<PagedResult<ApprovalResponse>> {
    return apiRequest<PagedResult<ApprovalResponse>>(`/my-usage/approvals${buildQuery(query)}`);
  },
};

export const notificationsApi = {
  getAll(unreadOnly = false): Promise<Notification[]> {
    return apiRequest<Notification[]>(`/governance/notifications?unreadOnly=${unreadOnly}`);
  },

  markRead(id: string): Promise<void> {
    return apiRequest<void>(`/governance/notifications/${id}/read`, { method: 'POST' });
  },
};
