import { api } from './axios';
import { Announcement } from '../types/announcement';

export const announcementsApi = {
  create: async (data: {
    title: string;
    content?: string;
    link?: string;
    image_url?: string;
    type?: string;
    target_campus?: string;
  }): Promise<Announcement> => {
    const response = await api.post('/announcements/', data);
    return response.data;
  },

  getActive: async (campus?: string): Promise<Announcement[]> => {
    const params = campus ? { campus } : {};
    const response = await api.get('/announcements/', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Announcement> => {
    const response = await api.get(`/announcements/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
    const response = await api.put(`/announcements/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/announcements/${id}`);
  },
};
