import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { SOCKET_URL } from '../lib/constants';
import { pushNotification } from '../components/ui/NotificationToast';
import { notificationsApi } from '../api/notifications.api';
import { queryClient } from '../lib/queryClient';

let socket: Socket | null = null;
let pendingEvents: Array<{ event: string; data?: any }> = [];
const MAX_PENDING_EVENTS = 50;

export function getSocket(): Socket | null {
  return socket;
}

function initSocket(token: string, setRoomUsers: any, setEmergency: any) {
  if (socket) return socket;

  console.log('[Socket] Creating new socket connection...');
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected, sid:', socket?.id);
    while (pendingEvents.length > 0) {
      const pending = pendingEvents.shift()!;
      console.log('[Socket] Flushing pending event:', pending.event);
      socket?.emit(pending.event, pending.data);
    }
    notificationsApi.getUnreadCount().then((count) => {
      useSessionStore.getState().setNotificationCount(count);
    }).catch(() => {});

    const autoReconnect = useSettingsStore.getState().autoReconnect;
    const roomId = localStorage.getItem('current_room_id');
    if (roomId) {
      console.log('[Socket] (Re)joining room:', roomId);
      socket?.emit('join_room', { room_id: roomId });
    } else if (autoReconnect) {
      console.log('[Socket] Auto-reconnect on, but no room id stored');
    }
  });

  socket.on('room_users', (data) => {
    console.log('[Socket] room_users received:', data.users.length, 'users', data.users);
    const existingUsers = useSessionStore.getState().roomUsers;
    const existingStreamMap = new Map(existingUsers.map(u => [u.sid, u.stream]));
    const users = data.users.map((u: any) => ({
      ...u,
      stream: existingStreamMap.get(u.sid) || undefined,
    }));
    console.log('[Socket] room_users merged streams:', users.map((u: any) => ({ sid: u.sid, user: u.user, hasStream: !!u.stream })));
    setRoomUsers(users);

    if (data.portal_states) {
      const state = useSessionStore.getState();
      for (const [sid, ps] of Object.entries(data.portal_states) as [string, { active: boolean; meeting: boolean }][]) {
        state.setRemotePortalMode(sid, ps.active);
        state.setRemoteMeetingMode(sid, ps.meeting);
      }
    }

    {
      const state = useSessionStore.getState();
      for (const u of users) {
        if (typeof u.muted === 'boolean') state.setRemoteAudioMuted(u.sid, u.muted);
        if (typeof u.video_off === 'boolean') state.setRemoteVideoOff(u.sid, u.video_off);
      }
    }

    const currentSharer = useSessionStore.getState().screenSharerSid;
    if (currentSharer && !users.find((u: any) => u.sid === currentSharer)) {
      useSessionStore.getState().setScreenSharer(null);
    }

    const currentSids = new Set(users.map((u: any) => u.sid));
    existingUsers.forEach((u) => {
      if (!currentSids.has(u.sid)) {
        console.log(`[Socket] Cleaning up stale peer: ${u.user} (${u.sid})`);
      }
    });
  });

  socket.on('peer_left', ({ sid, user, campus, role }: { sid: string; user: string; campus?: string; role?: string }) => {
    console.log(`[Socket] peer_left: ${user} (${sid})`);
    const state = useSessionStore.getState();
    const leavingUser = state.roomUsers.find((u) => u.sid === sid);
    state.setRoomUsers(state.roomUsers.filter((u) => u.sid !== sid));
    if (state.screenSharerSid === sid) {
      state.setScreenSharer(null);
    }
    window.dispatchEvent(new CustomEvent('participant_left', {
      detail: {
        user: user || leavingUser?.user || 'Unknown',
        campus: campus || leavingUser?.campus || '',
        role: role || leavingUser?.role || '',
      },
    }));
  });

  socket.on('peer_joined', ({ sid, user, campus, role }: { sid: string; user: string; campus: string; role: string }) => {
    console.log(`[Socket] peer_joined: ${user} (${sid}) from ${campus}`);
    const state = useSessionStore.getState();
    const exists = state.roomUsers.find((u) => u.sid === sid);
    if (!exists) {
      state.addRoomUser({ sid, user, campus, role, stream: undefined });
      window.dispatchEvent(new CustomEvent('participant_joined', {
        detail: { user, campus, role },
      }));
    }
  });

  socket.on('peer_portal_mode', ({ sid, active, meeting }: { sid: string; active: boolean; meeting?: boolean }) => {
    console.log(`[Socket] peer_portal_mode: ${sid} -> active=${active}, meeting=${meeting}`);
    useSessionStore.getState().setRemotePortalMode(sid, active);
    useSessionStore.getState().setRemoteMeetingMode(sid, meeting ?? false);
  });

  socket.on('screen_share_started', ({ sid, user }: { sid: string; user: string }) => {
    console.log(`[Socket] screen_share_started: ${user} (${sid})`);
    useSessionStore.getState().setScreenSharer(sid);
  });

  socket.on('screen_share_stopped', ({ sid }: { sid: string }) => {
    console.log('[Socket] screen_share_stopped:', sid);
    const current = useSessionStore.getState().screenSharerSid;
    if (current === sid) {
      useSessionStore.getState().setScreenSharer(null);
    }
  });

  socket.on('peer_video_toggled', ({ sid, video_off }: { sid: string; video_off: boolean }) => {
    console.log(`[Socket] peer_video_toggled: ${sid} video_off=${video_off}`);
    useSessionStore.getState().setRemoteVideoOff(sid, video_off);
  });

  socket.on('peer_muted', ({ sid, muted }: { sid: string; muted: boolean }) => {
    console.log(`[Socket] peer_muted: ${sid} muted=${muted}`);
    useSessionStore.getState().setRemoteAudioMuted(sid, muted);
  });

  socket.on('chat_message', (data) => {
    console.log('[Socket] chat_message:', data.user, data.message);
    const state = useSessionStore.getState();
    const myName = useAuthStore.getState().user?.full_name;
    state.addChatMessage(data);
    if (data.user !== myName) {
      state.incrementUnreadChat(data.target === 'campus' ? 'campus' : 'all');
    }
  });

  socket.on('chat_history', (data) => {
    console.log('[Socket] chat_history:', data.messages?.length, 'messages');
    const state = useSessionStore.getState();
    if (data.messages && data.messages.length > 0) {
      state.clearChatMessages();
      data.messages.forEach((msg: any) => state.addChatMessage(msg));
    }
    state.setUnreadChat('all', 0);
    state.setUnreadChat('campus', 0);
  });

  socket.on('emergency_alert', (data) => {
    console.log('%c[Socket] ⚠️ EMERGENCY_ALERT RECEIVED:', 'color: red; font-weight: bold; font-size: 14px;', data);
    console.log('[Socket] Current isEmergency:', useSessionStore.getState().isEmergency);
    setEmergency(true, data.message, data.triggered_by, data.triggered_by_role, data.campus_label, data.campus_only, data.triggered_by_sid);
    console.log('[Socket] After setEmergency, isEmergency:', useSessionStore.getState().isEmergency);
    useSessionStore.getState().incrementNotification();
    pushNotification({
      title: 'EMERGENCY',
      message: data.message || 'Emergency activated',
      type: 'emergency',
      created_by: data.triggered_by || 'System',
    });
  });

  socket.on('emergency_dismissed', () => {
    console.log('%c[Socket] ✓ EMERGENCY_DISMISSED', 'color: green; font-weight: bold;');
    setEmergency(false);
  });

  socket.on('chat_reaction_update', (data) => {
    console.log('[Socket] chat_reaction_update:', data);
    const event = new CustomEvent('chat_reaction_update', { detail: data });
    window.dispatchEvent(event);
  });

  socket.on('peer_hand_raised', (data) => {
    console.log('[Socket] peer_hand_raised:', data.user, data.raised);
    useSessionStore.getState().setRaisedHand(data.sid, data.raised);
    if (data.raised) {
      pushNotification({
        title: 'Hand Raised',
        message: `${data.user} raised their hand`,
        type: 'info',
        created_by: data.user,
      });
    }
  });

  socket.on('peer_reaction', (data) => {
    console.log('[Socket] peer_reaction:', data.user, data.emoji);
    useSessionStore.getState().addFloatingReaction(data.sid, data.emoji);
  });

  socket.on('talk_request_received', (data) => {
    console.log('[Socket] talk_request_received:', data.from_name, '->', data.target_campus);
    useSessionStore.getState().setTalkRequest(data);
    pushNotification({
      title: 'Talk Request',
      message: `${data.from_name} (${data.from_role}) wants to talk to ${data.target_campus === 'both' ? 'both campuses' : data.target_campus}`,
      type: 'info',
      created_by: data.from_name,
    });
  });

  socket.on('talk_request_response', (data) => {
    console.log('[Socket] talk_request_response:', data.responder_name, data.accepted ? 'accepted' : 'rejected');
    useSessionStore.getState().setTalkResponseStatus(data.accepted ? 'accepted' : 'rejected', data.responder_name);
    pushNotification({
      title: data.accepted ? 'Talk Accepted' : 'Talk Rejected',
      message: `${data.responder_name} (${data.responder_campus}) ${data.accepted ? 'accepted' : 'rejected'} your talk request`,
      type: data.accepted ? 'info' : 'emergency',
      created_by: data.responder_name,
    });
    setTimeout(() => {
      useSessionStore.getState().clearTalkRequest();
    }, 4000);
  });

  socket.on('bulletin_new', (data) => {
    console.log('[Socket] bulletin_new:', data.title);
    useSessionStore.getState().incrementNotification();
    pushNotification({
      title: data.title || 'New Bulletin',
      message: data.content || '',
      type: data.type || 'bulletin',
      created_by: data.created_by || 'System',
    });
  });

  socket.on('notification_update', (data) => {
    console.log('[Socket] notification_update:', data);
    notificationsApi.getUnreadCount().then((count) => {
      useSessionStore.getState().setNotificationCount(count);
    }).catch(() => {});
  });

  socket.on('recording_uploaded', (data) => {
    console.log('[Socket] recording_uploaded:', data.recording?.title);
    queryClient.invalidateQueries({ queryKey: ['recordings'] });
    pushNotification({
      title: 'Recording Uploaded',
      message: `${data.uploaded_by} saved "${data.recording?.title || 'a recording'}"`,
      type: 'info',
      created_by: data.uploaded_by || 'System',
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
    // Clear pending events on connection error to prevent unbounded growth
    if (pendingEvents.length > MAX_PENDING_EVENTS) {
      console.warn('[Socket] Clearing excess pending events');
      pendingEvents = pendingEvents.slice(-MAX_PENDING_EVENTS);
    }
  });

  return socket;
}

export function useSocket() {
  const token = useAuthStore((state) => state.token);
  const { setRoomUsers, setEmergency } = useSessionStore();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        pendingEvents = [];
      }
      useSessionStore.getState().clearChatMessages();
      useSessionStore.getState().clearUnreadChat();
      useSessionStore.getState().clearNotificationCount();
      return;
    }

    const s = initSocket(token, setRoomUsers, setEmergency);

    const onConnect = () => forceUpdate((n) => n + 1);
    const onDisconnect = () => forceUpdate((n) => n + 1);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) forceUpdate((n) => n + 1);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [token, setRoomUsers, setEmergency]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      console.log('[Socket] Emitting:', event, data);
      socket.emit(event, data);
    } else {
      console.log('[Socket] Queuing (not connected):', event, data);
      pendingEvents.push({ event, data });
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socket?.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  }, []);

  return { socket, emit, on, isConnected: socket?.connected || false };
}
