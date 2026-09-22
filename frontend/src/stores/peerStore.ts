import { create } from 'zustand';
import { PeerConnection } from '../types/webrtc';
import { useSettingsStore } from './settingsStore';

interface PeerState {
  peers: Map<string, PeerConnection>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  talkTarget: 'paete' | 'pagsanjan' | 'both' | null;
  localMicActive: boolean;
  addPeer: (sid: string, peer: PeerConnection) => void;
  removePeer: (sid: string) => void;
  updatePeerStream: (sid: string, stream: MediaStream) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setTalkTarget: (target: 'paete' | 'pagsanjan' | 'both' | null) => void;
  setLocalMicActive: (active: boolean) => void;
  getCombinedTarget: () => 'paete' | 'pagsanjan' | 'both' | 'local' | null;
  applyAudioSettings: () => void;
  replaceVideoStream: (newStream: MediaStream) => void;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
}

export const usePeerStore = create<PeerState>((set, get) => ({
  peers: new Map(),
  localStream: null,
  screenStream: null,
  isAudioMuted: true,
  isVideoOff: false,
  isScreenSharing: false,
  talkTarget: null,
  localMicActive: false,

  addPeer: (sid, peer) =>
    set((state) => {
      const newPeers = new Map(state.peers);
      newPeers.set(sid, peer);
      return { peers: newPeers };
    }),

  removePeer: (sid) =>
    set((state) => {
      const newPeers = new Map(state.peers);
      newPeers.delete(sid);
      return { peers: newPeers };
    }),

  updatePeerStream: (sid, stream) =>
    set((state) => {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(sid);
      if (peer) {
        newPeers.set(sid, { ...peer, stream });
      }
      return { peers: newPeers };
    }),

  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  setScreenStream: (stream) => set({ screenStream: stream }),

  toggleAudio: () => {
    const { localStream, isAudioMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioMuted;
      });
    }
    set({ isAudioMuted: !isAudioMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
    set({ isVideoOff: !isVideoOff });
  },

  toggleScreenShare: () =>
    set((state) => ({ isScreenSharing: !state.isScreenSharing })),

  setTalkTarget: (target) => {
    set({ talkTarget: target });
    const { localStream, localMicActive } = get();
    if (localStream) {
      const shouldEnable = target !== null || localMicActive;
      localStream.getAudioTracks().forEach((track) => { track.enabled = shouldEnable; });
      set({ isAudioMuted: !shouldEnable });
    }
  },

  setLocalMicActive: (active) => {
    set({ localMicActive: active });
    const { localStream, talkTarget } = get();
    if (localStream) {
      const shouldEnable = active || talkTarget !== null;
      localStream.getAudioTracks().forEach((track) => { track.enabled = shouldEnable; });
      set({ isAudioMuted: !shouldEnable });
    }
  },

  getCombinedTarget: () => {
    const { talkTarget, localMicActive } = get();
    if (talkTarget && localMicActive) return 'both';
    if (talkTarget) return talkTarget;
    if (localMicActive) return 'both';
    return null;
  },

  applyAudioSettings: () => {
    const { localStream } = get();
    if (!localStream) return;
    const audioConstraints = useSettingsStore.getState().getAudioConstraints();
    localStream.getAudioTracks().forEach((track) => {
      track.applyConstraints(audioConstraints).catch((err) => {
        console.warn('[PeerStore] Failed to apply audio constraints:', err);
      });
    });
  },

  replaceVideoStream: (newStream: MediaStream) => {
    const { localStream, peers } = get();
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    peers.forEach((peer) => {
      const sender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack).catch((err) => {
          console.warn('[PeerStore] Failed to replace video track:', err);
        });
      }
    });

    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.stop(); });
      const newTracks = [...localStream.getAudioTracks(), ...newStream.getVideoTracks()];
      const merged = new MediaStream(newTracks);
      set({ localStream: merged });
    } else {
      set({ localStream: newStream });
    }
  },

  switchCamera: async (deviceId: string) => {
    const { localStream, peers } = get();
    if (!localStream) return;
    const videoConstraints = useSettingsStore.getState().getVideoConstraints();
    if (deviceId) videoConstraints.deviceId = { exact: deviceId };
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      peers.forEach((peer) => {
        const sender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack).catch((err) => {
            console.warn('[PeerStore] Failed to replace video track on peer:', err);
          });
        }
      });

      localStream.getVideoTracks().forEach((t) => { t.stop(); });
      const merged = new MediaStream([...localStream.getAudioTracks(), newVideoTrack]);
      set({ localStream: merged });
      console.log('[PeerStore] Camera switched to device:', deviceId);
    } catch (err) {
      console.error('[PeerStore] Failed to switch camera:', err);
    }
  },

  switchMicrophone: async (deviceId: string) => {
    const { localStream, peers, isAudioMuted } = get();
    if (!localStream) return;
    const audioConstraints = useSettingsStore.getState().getAudioConstraints();
    if (deviceId) audioConstraints.deviceId = { exact: deviceId };
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (!newAudioTrack) return;

      newAudioTrack.enabled = !isAudioMuted;

      peers.forEach((peer) => {
        const sender = peer.connection.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(newAudioTrack).catch((err) => {
            console.warn('[PeerStore] Failed to replace audio track on peer:', err);
          });
        }
      });

      localStream.getAudioTracks().forEach((t) => { t.stop(); });
      const merged = new MediaStream([newAudioTrack, ...localStream.getVideoTracks()]);
      set({ localStream: merged });
      console.log('[PeerStore] Microphone switched to device:', deviceId, 'muted:', isAudioMuted);
    } catch (err) {
      console.error('[PeerStore] Failed to switch microphone:', err);
    }
  },
}));
