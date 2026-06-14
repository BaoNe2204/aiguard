import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, type LoginResponse, type UserProfile } from '../api/auth';
import { getToken } from '../api/client';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tenantCode: string, email: string, password: string) => Promise<LoginResponse>;
  verifyMfa: (tenantCode: string, challengeToken: string, code: string) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {
    throw new Error('AuthProvider is not available');
  },
  verifyMfa: async () => {
    throw new Error('AuthProvider is not available');
  },
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('aiguard_user');
    if (!getToken() || !saved) return null;
    try {
      return JSON.parse(saved) as UserProfile;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.getProfile()
      .then(profile => {
        localStorage.setItem('aiguard_user', JSON.stringify(profile));
        setUser(profile);
      })
      .catch(() => {
        authApi.clearSession();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (tenantCode: string, email: string, password: string) => {
    const result = await authApi.login(email, password, tenantCode);
    if (result.user) setUser(result.user);
    return result;
  }, []);

  const verifyMfa = useCallback(async (tenantCode: string, challengeToken: string, code: string) => {
    const result = await authApi.verifyMfa(challengeToken, code, tenantCode);
    if (!result.user) throw new Error('MFA verified but profile was missing');
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authApi.logout();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      verifyMfa,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
