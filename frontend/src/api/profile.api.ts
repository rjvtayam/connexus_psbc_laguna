import { api } from './axios';
import { User, ActivityLog } from '../types/user';

export interface Setup2FAResponse {
  secret: string;
  qr_code: string;
  provisioning_uri: string;
}

export const profileApi = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  updateProfile: async (data: { full_name?: string; email?: string; phone?: string }): Promise<User> => {
    const response = await api.put('/profile/me', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/profile/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteAvatar: async (): Promise<{ message: string }> => {
    const response = await api.delete('/profile/avatar');
    return response.data;
  },

  setup2FA: async (): Promise<Setup2FAResponse> => {
    const response = await api.get('/profile/2fa/setup');
    return response.data;
  },

  verify2FA: async (code: string): Promise<{ message: string }> => {
    const response = await api.post('/profile/2fa/verify', null, { params: { code } });
    return response.data;
  },

  disable2FA: async (password: string): Promise<{ message: string }> => {
    const response = await api.post('/profile/2fa/disable', { current_password: password, new_password: '' });
    return response.data;
  },

  getActivity: async (limit?: number): Promise<ActivityLog[]> => {
    const response = await api.get('/profile/activity', { params: { limit } });
    return response.data;
  },

  deactivateAccount: async (password: string): Promise<{ message: string }> => {
    const response = await api.post('/profile/deactivate', {
      current_password: password,
      new_password: '',
    });
    return response.data;
  },

  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await api.delete('/profile/me', {
      data: { current_password: password, new_password: '' },
    });
    return response.data;
  },
};
