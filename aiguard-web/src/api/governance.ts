import { API_BASE, apiRequest, buildQuery, getToken, type PagedResult, type PagedQuery } from './client';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  authProvider: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  userCount: number;
  deviceCount: number;
  createdAt: string;
}

export interface FalsePositive {
  id: string;
  endpointEventId: string;
  reportedByEmail: string;
  detectorName: string;
  reason: string;
  status: string;
  reviewNote?: string;
  createWhitelist: boolean;
  whitelistExpiresAt?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  severity: string;
  status: string;
  sourceType: string;
  endpointEventId?: string;
  assignedToUserId?: string;
  assignedToName?: string;
  summary?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  priority: number;
  departmentId?: string;
  departmentName?: string;
  dataType?: string;
  websitePattern?: string;
  userEmail?: string;
  hostname?: string;
  activeFrom?: string;
  activeTo?: string;
  action: string;
  isEnabled: boolean;
  status: string;
  version: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface GovernanceHealth {
  onlineDevices: number;
  offlineDevices: number;
  quarantinedDevices: number;
  extensionDisabledDevices: number;
  stalePolicyDevices: number;
  pendingApprovals: number;
  expiredApprovals: number;
  openIncidents: number;
  pendingFalsePositives: number;
  failedIntegrations: number;
  apiUptimeSeconds: number;
}

export interface RetentionPolicy {
  endpointEventDays: number;
  auditLogDays: number;
  notificationDays: number;
  incidentDays: number;
  storeOriginalContent: boolean;
  encryptSensitivePreview: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  isEnabled: boolean;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
}

export interface ExactDataMatchRecord {
  id: string;
  dataType: string;
  label?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export const governanceApi = {
  async downloadEndpointReport(format: 'xlsx' | 'pdf', days = 30) {
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const response = await fetch(
      `${API_BASE}/reports/endpoint-events?format=${format}&from=${encodeURIComponent(from)}`,
      { headers: { Authorization: `Bearer ${getToken() || ''}` } }
    );
    if (!response.ok) throw new Error(`Không thể xuất báo cáo (${response.status})`);
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const fallbackName = `aiguard-dlp-report.${format}`;
    const fileName = encodedName ? decodeURIComponent(encodedName) : fallbackName;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  users(query: PagedQuery = {}) {
    return apiRequest<PagedResult<AdminUser>>(`/admin/users${buildQuery(query)}`);
  },
  createUser(body: Record<string, unknown>) {
    return apiRequest<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) });
  },
  updateUser(id: string, body: Record<string, unknown>) {
    return apiRequest<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  disableUser(id: string) {
    return apiRequest<object>(`/admin/users/${id}`, { method: 'DELETE' });
  },
  departments() {
    return apiRequest<Department[]>('/admin/departments');
  },
  createDepartment(body: { name: string; code: string }) {
    return apiRequest<Department>('/admin/departments', { method: 'POST', body: JSON.stringify(body) });
  },
  falsePositives(query: PagedQuery & { status?: string } = {}) {
    return apiRequest<PagedResult<FalsePositive>>(`/governance/false-positives${buildQuery(query)}`);
  },
  reviewFalsePositive(id: string, body: Record<string, unknown>) {
    return apiRequest<FalsePositive>(`/governance/false-positives/${id}/review`, {
      method: 'POST', body: JSON.stringify(body)
    });
  },
  incidents(query: PagedQuery & { status?: string; severity?: string } = {}) {
    return apiRequest<PagedResult<Incident>>(`/governance/incidents${buildQuery(query)}`);
  },
  createIncident(body: Record<string, unknown>) {
    return apiRequest<Incident>('/governance/incidents', { method: 'POST', body: JSON.stringify(body) });
  },
  updateIncident(id: string, body: Record<string, unknown>) {
    return apiRequest<Incident>(`/governance/incidents/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  policyRules() {
    return apiRequest<PolicyRule[]>('/governance/policy-rules');
  },
  createPolicyRule(body: Record<string, unknown>) {
    return apiRequest<PolicyRule>('/governance/policy-rules', { method: 'POST', body: JSON.stringify(body) });
  },
  publishPolicyRule(id: string) {
    return apiRequest<PolicyRule>(`/governance/policy-rules/${id}/publish`, { method: 'POST' });
  },
  simulatePolicy(body: Record<string, unknown>) {
    return apiRequest<{ matched: boolean; decision: string; ruleName?: string; version?: string }>(
      '/governance/policy-rules/simulate', { method: 'POST', body: JSON.stringify(body) }
    );
  },
  health() {
    return apiRequest<GovernanceHealth>('/governance/health');
  },
  retention() {
    return apiRequest<RetentionPolicy>('/governance/retention');
  },
  updateRetention(body: RetentionPolicy) {
    return apiRequest<RetentionPolicy>('/governance/retention', { method: 'PUT', body: JSON.stringify(body) });
  },
  integrations() {
    return apiRequest<Integration[]>('/governance/integrations');
  },
  createIntegration(body: Record<string, unknown>) {
    return apiRequest<Integration>('/governance/integrations', { method: 'POST', body: JSON.stringify(body) });
  },
  deleteIntegration(id: string) {
    return apiRequest<object>(`/governance/integrations/${id}`, { method: 'DELETE' });
  },
  importExactDataMatch(body: Record<string, unknown>) {
    return apiRequest<{ imported: number }>('/governance/exact-data-match/import', {
      method: 'POST', body: JSON.stringify(body)
    });
  },
  exactDataMatches() {
    return apiRequest<ExactDataMatchRecord[]>('/governance/exact-data-match');
  },
  deleteExactDataMatch(id: string) {
    return apiRequest<object>(`/governance/exact-data-match/${id}`, { method: 'DELETE' });
  },
  notifications(unreadOnly = false) {
    return apiRequest<NotificationItem[]>(`/governance/notifications?unreadOnly=${unreadOnly}`);
  },
  markNotificationRead(id: string) {
    return apiRequest<object>(`/governance/notifications/${id}/read`, { method: 'POST' });
  }
};
