import { api } from './axios';

export interface BulletinComment {
  id: string;
  announcement_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export const bulletinCommentsApi = {
  get: async (announcementId: string): Promise<BulletinComment[]> => {
    const { data } = await api.get(`/announcements/${announcementId}/comments`);
    return data;
  },

  add: async (announcementId: string, message: string): Promise<BulletinComment> => {
    const { data } = await api.post(`/announcements/${announcementId}/comments`, { message });
    return data;
  },

  delete: async (announcementId: string, commentId: string): Promise<void> => {
    await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
  },
};
