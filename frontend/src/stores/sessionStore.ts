import { create } from 'zustand';
import { RoomUser } from '../types/session';

export interface ChatMessage {
  id?: string;
  sid: string;
  user: string;
  campus: string;
  role: string;
  message: string;
  target: string;
  campus_scope?: string;
  timestamp: string;
  reply_to_id?: string;
  reply_to_user?: string;
  reply_to_message?: string;
}

interface SessionState {
  currentRoom: string | null;
  roomUsers: RoomUser[];
  isEmergency: boolean;
  emergencyMessage: string | null;
  emergencyTriggeredBy: string | null;
  emergencyTriggeredByRole: string | null;
  emergencyTriggeredBySid: string | null;
  emergencyCampus: string | null;
  emergencyCampusOnly: boolean;
  portalMode: boolean;
  meetingMode: boolean;
  remotePortalModes: Record<string, boolean>;
  remoteMeetingModes: Record<string, boolean>;
  remoteVideoOff: Record<string, boolean>;
  remoteAudioMuted: Record<string, boolean>;
  raisedHands: Record<string, boolean>;
  floatingReactions: Array<{ id: number; sid: string; emoji: string; x: number }>;
  screenSharerSid: string | null;
  talkRequest: { from_sid: string; from_name: string; from_campus: string; from_role: string; target_campus: string } | null;
  talkResponseStatus: 'idle' | 'pending' | 'accepted' | 'rejected';
  talkResponderName: string | null;
  chatMessages: ChatMessage[];
  unreadAllCount: number;
  unreadCampusCount: number;
  unreadNotificationCount: number;
  lastViewedBulletinsAt: number;
  setCurrentRoom: (roomId: string | null) => void;
  setRoomUsers: (users: RoomUser[]) => void;
  addRoomUser: (user: RoomUser) => void;
  removeRoomUser: (sid: string) => void;
  updateUserStream: (sid: string, stream: MediaStream) => void;
  setEmergency: (active: boolean, message?: string, triggeredBy?: string, triggeredByRole?: string, campus?: string, campusOnly?: boolean, triggeredBySid?: string) => void;
  togglePortalMode: () => void;
  setPortalMode: (active: boolean) => void;
  setMeetingMode: (active: boolean) => void;
  setRemotePortalMode: (sid: string, active: boolean) => void;
  setRemoteMeetingMode: (sid: string, active: boolean) => void;
  setRemoteVideoOff: (sid: string, videoOff: boolean) => void;
  setRemoteAudioMuted: (sid: string, muted: boolean) => void;
  setRaisedHand: (sid: string, raised: boolean) => void;
  clearRaisedHands: () => void;
  setTalkRequest: (request: SessionState['talkRequest']) => void;
  setTalkResponseStatus: (status: SessionState['talkResponseStatus'], responderName?: string) => void;
  clearTalkRequest: () => void;
  addFloatingReaction: (sid: string, emoji: string) => void;
  removeFloatingReaction: (id: number) => void;
  setScreenSharer: (sid: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChatMessages: () => void;
  incrementUnreadChat: (target: 'all' | 'campus') => void;
  setUnreadChat: (target: 'all' | 'campus', count: number) => void;
  clearUnreadChat: (target?: 'all' | 'campus') => void;
  incrementNotification: () => void;
  setNotificationCount: (count: number) => void;
  clearNotificationCount: () => void;
  markBulletinsViewed: () => void;
  clearAllNotifications: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentRoom: null,
  roomUsers: [],
  isEmergency: false,
  emergencyMessage: null,
  emergencyTriggeredBy: null,
  emergencyTriggeredByRole: null,
  emergencyTriggeredBySid: null,
  emergencyCampus: null,
  emergencyCampusOnly: false,
  portalMode: true,
  meetingMode: false,
  remotePortalModes: {},
  remoteMeetingModes: {},
  remoteVideoOff: {},
  remoteAudioMuted: {},
  raisedHands: {},
  floatingReactions: [],
  screenSharerSid: null,
  talkRequest: null,
  talkResponseStatus: 'idle',
  talkResponderName: null,
  chatMessages: [],
  unreadAllCount: 0,
  unreadCampusCount: 0,
  unreadNotificationCount: 0,
  lastViewedBulletinsAt: Date.now(),

  setCurrentRoom: (roomId) => set({ currentRoom: roomId }),

  setRoomUsers: (users) => set({ roomUsers: users }),

  addRoomUser: (user) =>
    set((state) => ({
      roomUsers: [...state.roomUsers.filter((u) => u.sid !== user.sid), user],
    })),

  removeRoomUser: (sid) =>
    set((state) => ({
      roomUsers: state.roomUsers.filter((u) => u.sid !== sid),
    })),

  updateUserStream: (sid, stream) =>
    set((state) => ({
      roomUsers: state.roomUsers.map((u) =>
        u.sid === sid ? { ...u, stream } : u
      ),
    })),

  setEmergency: (active, message, triggeredBy, triggeredByRole, campus, campusOnly, triggeredBySid) =>
    set({ isEmergency: active, emergencyMessage: message || null, emergencyTriggeredBy: triggeredBy || null, emergencyTriggeredByRole: triggeredByRole || null, emergencyTriggeredBySid: triggeredBySid || null, emergencyCampus: campus || null, emergencyCampusOnly: campusOnly ?? false }),

  togglePortalMode: () =>
    set((state) => ({ portalMode: !state.portalMode })),

  setPortalMode: (active) => set({ portalMode: active }),

  setMeetingMode: (active) => set({ meetingMode: active }),

  setRemotePortalMode: (sid, active) =>
    set((state) => ({
      remotePortalModes: { ...state.remotePortalModes, [sid]: active },
    })),

  setRemoteMeetingMode: (sid, active) =>
    set((state) => ({
      remoteMeetingModes: { ...state.remoteMeetingModes, [sid]: active },
    })),

  setRemoteVideoOff: (sid, videoOff) =>
    set((state) => ({
      remoteVideoOff: { ...state.remoteVideoOff, [sid]: videoOff },
    })),

  setRemoteAudioMuted: (sid, muted) =>
    set((state) => ({
      remoteAudioMuted: { ...state.remoteAudioMuted, [sid]: muted },
    })),

  setRaisedHand: (sid, raised) =>
    set((state) => ({
      raisedHands: { ...state.raisedHands, [sid]: raised },
    })),

  clearRaisedHands: () => set({ raisedHands: {} }),

  setTalkRequest: (request) => set({ talkRequest: request }),

  setTalkResponseStatus: (status, responderName) => set({ talkResponseStatus: status, talkResponderName: responderName || null }),

  clearTalkRequest: () => set({ talkRequest: null, talkResponseStatus: 'idle', talkResponderName: null }),

  addFloatingReaction: (sid, emoji) =>
    set((state) => {
      const id = Date.now() + Math.random();
      const x = 20 + Math.random() * 60;
      return {
        floatingReactions: [...state.floatingReactions.slice(-15), { id, sid, emoji, x }],
      };
    }),

  removeFloatingReaction: (id) =>
    set((state) => ({
      floatingReactions: state.floatingReactions.filter((r) => r.id !== id),
    })),

  setScreenSharer: (sid) => set({ screenSharerSid: sid }),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-199), msg],
    })),

  clearChatMessages: () => set({ chatMessages: [] }),

  incrementUnreadChat: (target) =>
    set((state) => target === 'campus'
      ? { unreadCampusCount: state.unreadCampusCount + 1 }
      : { unreadAllCount: state.unreadAllCount + 1 }),

  setUnreadChat: (target, count) =>
    set(() => target === 'campus'
      ? { unreadCampusCount: count }
      : { unreadAllCount: count }),

  clearUnreadChat: (target) =>
    set(() => {
      if (target === 'campus') return { unreadCampusCount: 0 };
      if (target === 'all') return { unreadAllCount: 0 };
      return { unreadAllCount: 0, unreadCampusCount: 0 };
    }),

  incrementNotification: () =>
    set((state) => ({ unreadNotificationCount: state.unreadNotificationCount + 1 })),

  setNotificationCount: (count) =>
    set({ unreadNotificationCount: count }),

  clearNotificationCount: () =>
    set({ unreadNotificationCount: 0 }),

  markBulletinsViewed: () =>
    set({ lastViewedBulletinsAt: Date.now() }),

  clearAllNotifications: () =>
    set({ unreadNotificationCount: 0, lastViewedBulletinsAt: Date.now() }),
}));
