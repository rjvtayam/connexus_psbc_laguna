import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { recordingsApi, RecordingListResponse } from '../api/recordings.api';

// ─── Query Keys (centralized for cache invalidation) ───
export const queryKeys = {
  users: ['users'] as const,
  usersByCampus: (campus: string) => ['users', campus] as const,
  sessions: ['sessions'] as const,
  activeSession: ['sessions', 'active'] as const,
  announcements: ['announcements'] as const,
  announcementsByCampus: (campus: string) => ['announcements', campus] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  profile: ['profile'] as const,
  dashboard: ['dashboard'] as const,
  auditLogs: ['audit-logs'] as const,
  sessionHistory: ['session-history'] as const,
  roomUsers: (sessionId: string) => ['room-users', sessionId] as const,
  recordings: (page: number, sortBy: string, sortOrder: string, search: string, trash: boolean) =>
    ['recordings', { page, sortBy, sortOrder, search, trash }] as const,
};

// ─── Users ───
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data } = await api.get('/users/');
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUsersByCampus(campus: string) {
  return useQuery({
    queryKey: queryKeys.usersByCampus(campus),
    queryFn: async () => {
      const { data } = await api.get(`/users/by-campus/${campus}`);
      return data;
    },
    staleTime: 60 * 1000,
    enabled: !!campus,
  });
}

// ─── Sessions ───
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => {
      const { data } = await api.get('/sessions/');
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: queryKeys.activeSession,
    queryFn: async () => {
      const { data } = await api.get('/sessions/active');
      return data;
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

// ─── Announcements / Bulletins ───
export function useAnnouncements(campus?: string) {
  return useQuery({
    queryKey: campus ? queryKeys.announcementsByCampus(campus) : queryKeys.announcements,
    queryFn: async () => {
      const params = campus ? `?campus=${campus}` : '';
      const { data } = await api.get(`/announcements/${params}`);
      return data;
    },
    staleTime: 120 * 1000,
  });
}

// ─── Notifications ───
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.count;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ─── Profile ───
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const { data } = await api.get('/profile/me');
      return data;
    },
    staleTime: 120 * 1000,
  });
}

// ─── Mutations with cache invalidation ───
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data } = await api.put('/profile/me', updates);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) => {
      const { data } = await api.post('/profile/change-password', payload);
      return data;
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/announcements/', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.put(`/notifications/${notificationId}/read`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, unknown> }) => {
      const { data } = await api.put(`/users/${userId}`, updates);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(`/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// ─── Recordings ───
export function useRecordings(
  page: number,
  sortBy: string,
  sortOrder: string,
  search: string,
  trash: boolean,
) {
  return useQuery<RecordingListResponse>({
    queryKey: queryKeys.recordings(page, sortBy, sortOrder, search, trash),
    queryFn: () => recordingsApi.list(page, 12, sortBy, sortOrder, search, trash),
    staleTime: 30 * 1000,
  });
}
