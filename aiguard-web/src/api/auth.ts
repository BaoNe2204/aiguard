import { apiRequest, setToken, setRefreshToken, clearTokens } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  tenantCode?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentName: string | null;
  departmentId: string | null;
  isActive: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  authProvider: string;
}

export interface LoginResponse {
  requiresMfa: boolean;
  mfaChallengeToken?: string;
  mfaSetupRequired?: boolean;
  mfaSetupSecret?: string;
  mfaProvisioningUri?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: UserProfile;
  mfaRecoveryCodes?: string[];
}

export const authApi = {
  async login(email: string, password: string, tenantCode = 'DEFAULT'): Promise<LoginResponse> {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantCode }),
    });
    localStorage.setItem('aiguard_tenant_code', tenantCode.trim().toUpperCase());
    if (!result.requiresMfa) persistSession(result);
    return result;
  },

  async verifyMfa(challengeToken: string, code: string, tenantCode = 'DEFAULT'): Promise<LoginResponse> {
    const result = await apiRequest<LoginResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code, tenantCode }),
    });
    localStorage.setItem('aiguard_tenant_code', tenantCode.trim().toUpperCase());
    persistSession(result);
    return result;
  },

  async getProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>('/auth/profile');
  },

  logout(): void {
    clearTokens();
    window.location.href = '/login';
  },

  clearSession(): void {
    clearTokens();
  },
};

function persistSession(result: LoginResponse): void {
  if (!result.accessToken || !result.refreshToken || !result.user) {
    throw new Error('Login response is missing token data');
  }
  setToken(result.accessToken);
  setRefreshToken(result.refreshToken);
  localStorage.setItem('aiguard_user', JSON.stringify(result.user));
}
