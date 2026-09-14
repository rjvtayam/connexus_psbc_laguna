import { api } from './axios';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL } from '../lib/constants';

export interface Recording {
  id: string;
  title: string;
  description?: string;
  filename: string;
  original_filename?: string;
  file_size?: number;
  duration_seconds?: number;
  mime_type?: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  created_by: string;
  creator_name?: string;
  room_id?: string;
  created_at: string;
}

export interface RecordingListResponse {
  recordings: Recording[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const recordingsApi = {
  upload: async (file: File, title: string, description: string, durationSeconds: number, roomId: string, startedAt: string, endedAt: string): Promise<Recording> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('duration_seconds', durationSeconds.toString());
    formData.append('room_id', roomId);
    formData.append('started_at', startedAt);
    formData.append('ended_at', endedAt);
    const { data } = await api.post('/recordings/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  list: async (page = 1, pageSize = 12, sortBy = 'created_at', sortOrder = 'desc', search = '', trash = false): Promise<RecordingListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      sort_by: sortBy,
      sort_order: sortOrder,
      trash: trash.toString(),
    });
    if (search) params.append('search', search);
    const { data } = await api.get(`/recordings?${params.toString()}`);
    return data;
  },

  getStreamUrl: (recordingId: string) => {
    const token = useAuthStore.getState().token;
    return `${API_BASE_URL}/recordings/${recordingId}/stream?token=${token}`;
  },

  restore: async (recordingId: string): Promise<void> => {
    await api.post(`/recordings/${recordingId}/restore`);
  },

  delete: async (recordingId: string): Promise<void> => {
    await api.delete(`/recordings/${recordingId}`);
  },

  permanentDelete: async (recordingId: string): Promise<void> => {
    await api.delete(`/recordings/${recordingId}/permanent`);
  },
};
