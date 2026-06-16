import { apiRequest, buildQuery } from './client';
import type { PagedResult, PagedQuery } from './client';

export interface DeviceResponse {
  id: string;
  hostname: string;
  userEmail: string;
  departmentName: string;
  agentVersion: string | null;
  extensionVersion: string | null;
  extensionActive: boolean;
  policyVersion: string;
  lastSeen: string;
  riskStatus: string;
  isOnline?: boolean;
  isQuarantined?: boolean;
  isRemoteDisabled?: boolean;
  endpointKeyRevoked?: boolean;
  quarantineReason?: string | null;
  lastPolicySyncAt?: string | null;
  agentStatus?: string;
}

export interface EndpointEventResponse {
  id: string;
  userEmail: string;
  hostname: string;
  browser: string;
  websiteAi: string;
  eventType: string;
  riskScore: number;
  riskLevel: string;
  decision: string;
  dataTypeMatched: string;
  maskedContentPreview: string | null;
  originalHash: string;
  policyVersion: string;
  createdAt: string;
}

export interface AiWebsiteResponse {
  id: string;
  name: string;
  domainPattern: string;
  isActive: boolean;
  mode: string;
  lastUpdated: string;
}

export interface ShadowAiDiscoveryResponse {
  id: string;
  hostname: string;
  userEmail: string;
  departmentName: string;
  domain: string;
  url?: string;
  pageTitle?: string;
  isApproved: boolean;
  decision: string;
  shouldBlock: boolean;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface EndpointTelemetryResponse {
  id: string;
  hostname: string;
  userEmail: string;
  departmentName: string;
  category: string;
  eventType: string;
  detail?: string;
  severity: string;
  occurredAt: string;
  receivedAt: string;
}

export interface DeploymentTokenResponse {
  token: string | null;
  tokenId: string;
  tenantCode: string;
  createdAt: string;
  expiresAt: string;
  installCommand: string;
  extensionSetupCommand: string;
  extensionSetupUrl: string;
}

export interface RotateEndpointKeyResponse {
  deviceId: string;
  endpointKey: string;
  keyVersion: number;
  rotatedAt: string;
}

export interface DeviceAiWebsiteOverrideDto {
  aiWebsiteId: string;
  name: string;
  globalMode: string;
  overrideMode: string;
}

export interface DeviceCustomSettingsRequest {
  customSecurityPolicyId: string | null;
  aiWebsiteOverrides: DeviceAiWebsiteOverrideDto[];
}

export interface DeviceCustomSettingsResponse {
  deviceId: string;
  customSecurityPolicyId: string | null;
  aiWebsiteOverrides: DeviceAiWebsiteOverrideDto[];
}

export const endpointsApi = {
  getDevices(query: PagedQuery = {}): Promise<PagedResult<DeviceResponse>> {
    return apiRequest<PagedResult<DeviceResponse>>(`/endpoints/devices${buildQuery(query)}`);
  },

  getDevice(id: string): Promise<DeviceResponse> {
    return apiRequest<DeviceResponse>(`/endpoints/devices/${id}`);
  },

  syncPolicy(id: string): Promise<void> {
    return apiRequest<void>(`/endpoints/devices/${id}/sync-policy`, { method: 'POST' });
  },

  rotateEndpointKey(id: string): Promise<RotateEndpointKeyResponse> {
    return apiRequest<RotateEndpointKeyResponse>(`/endpoints/devices/${id}/rotate-key`, { method: 'POST' });
  },

  revokeEndpointKey(id: string): Promise<void> {
    return apiRequest<void>(`/endpoints/devices/${id}/revoke-key`, { method: 'POST' });
  },

  deleteDevice(id: string): Promise<void> {
    return apiRequest<void>(`/endpoints/devices/${id}`, { method: 'DELETE' });
  },

  getDeviceCustomSettings(id: string): Promise<DeviceCustomSettingsResponse> {
    return apiRequest<DeviceCustomSettingsResponse>(`/endpoints/devices/${id}/custom-settings`);
  },

  updateDeviceCustomSettings(id: string, data: DeviceCustomSettingsRequest): Promise<DeviceCustomSettingsResponse> {
    return apiRequest<DeviceCustomSettingsResponse>(`/endpoints/devices/${id}/custom-settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getEvents(
    query: PagedQuery = {},
    filters: { riskLevel?: string; decision?: string; userEmail?: string } = {}
  ): Promise<PagedResult<EndpointEventResponse>> {
    return apiRequest<PagedResult<EndpointEventResponse>>(
      `/endpoints/events${buildQuery({ ...query, ...filters })}`
    );
  },

  getTelemetry(query: PagedQuery = {}, category?: string): Promise<PagedResult<EndpointTelemetryResponse>> {
    return apiRequest<PagedResult<EndpointTelemetryResponse>>(
      `/endpoints/telemetry${buildQuery({ ...query, category })}`
    );
  },

  getAiWebsites(): Promise<AiWebsiteResponse[]> {
    return apiRequest<AiWebsiteResponse[]>('/endpoints/ai-websites');
  },

  createAiWebsiteRule(data: { name: string; domainPattern: string; mode: string }): Promise<AiWebsiteResponse> {
    return apiRequest<AiWebsiteResponse>('/endpoints/ai-websites/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAiWebsite(id: string, data: Partial<{ name: string; domainPattern: string; isActive: boolean; mode: string }>): Promise<AiWebsiteResponse> {
    return apiRequest<AiWebsiteResponse>(`/endpoints/ai-websites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAiWebsite(id: string): Promise<void> {
    return apiRequest<void>(`/endpoints/ai-websites/${id}`, { method: 'DELETE' });
  },

  getShadowAiDiscoveries(query: PagedQuery = {}): Promise<PagedResult<ShadowAiDiscoveryResponse>> {
    return apiRequest<PagedResult<ShadowAiDiscoveryResponse>>(
      `/endpoints/shadow-ai${buildQuery(query)}`
    );
  },

  getDeploymentToken(): Promise<DeploymentTokenResponse> {
    return apiRequest<DeploymentTokenResponse>('/endpoints/deployment/token');
  },

  rotateDeploymentToken(tenantCode: string = 'DEFAULT'): Promise<DeploymentTokenResponse> {
    return apiRequest<DeploymentTokenResponse>(
      `/endpoints/deployment/rotate-token${buildQuery({ tenantCode })}`,
      { method: 'POST' }
    );
  },

  // Real-time commands to extensions
  sendCommand(data: {
    targetType: 'device' | 'all';
    deviceId?: string;
    command: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    return apiRequest<void>('/endpoints/commands/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  refreshPolicy(deviceId?: string): Promise<void> {
    return apiRequest<void>(
      `/endpoints/commands/policy-refresh${buildQuery(deviceId ? { deviceId } : {})}`,
      { method: 'POST' }
    );
  },
};
