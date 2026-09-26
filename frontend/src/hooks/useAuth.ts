import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';
import { api } from '../api/axios';
import { queryClient } from '../lib/queryClient';

export function useAuth() {
  const { user, token, setAuth, logout: storeLogout } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    if (response.requires_2fa) {
      return { requires_2fa: true, temp_token: response.temp_token };
    }

    if (response.access_token && response.refresh_token && response.user) {
      setAuth(response.access_token, response.refresh_token, response.user);
    }
    return { requires_2fa: false, user: response.user };
  }, [setAuth]);

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    const response = await authApi.verify2FA(tempToken, code);
    setAuth(response.access_token, response.refresh_token, response.user);
    return response.user;
  }, [setAuth]);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    campus: string;
  }) => {
    const response = await authApi.register(data);
    setAuth(response.access_token, response.refresh_token, response.user);
    return response.user;
  }, [setAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    storeLogout();
    queryClient.clear();
  }, [storeLogout]);

  return {
    user,
    token,
    isAuthenticated: !!token,
    login,
    verify2FA,
    register,
    logout,
  };
}
