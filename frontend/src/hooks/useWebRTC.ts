import { useRef, useState, useCallback, useEffect } from 'react';
import { useSocket, getSocket } from './useSocket';
import { usePeerStore } from '../stores/peerStore';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { buildRTCConfig } from '../types/webrtc';

export function useWebRTC(_roomId: string) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const connectedSidsRef = useRef<Set<string>>(new Set());
  const connectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const [streamReady, setStreamReady] = useState(false);
  const MAX_RETRIES = 3;
  const { emit, socket } = useSocket();
  const { addPeer, removePeer, updatePeerStream, setLocalStream } = usePeerStore();
  const { updateUserStream, roomUsers } = useSessionStore();
  const talkTarget = usePeerStore((s) => s.talkTarget);
  const localMicActive = usePeerStore((s) => s.localMicActive);

  const startLocalStream = useCallback(async () => {
    try {
      const videoConstraints = useSettingsStore.getState().getVideoConstraints();
      const audioConstraints = useSettingsStore.getState().getAudioConstraints();
      console.log('[WebRTC] Starting stream with constraints:', { video: videoConstraints, audio: audioConstraints });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const portalOn = useSessionStore.getState().portalMode;
      if (portalOn) {
        stream.getAudioTracks().forEach((track) => { track.enabled = false; });
        stream.getVideoTracks().forEach((track) => { track.enabled = false; });
        usePeerStore.setState({ localMicActive: false, isAudioMuted: true, isVideoOff: true });
      } else {
        usePeerStore.setState({ localMicActive: true, isAudioMuted: false });
      }
      setStreamReady(true);
      return stream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }, [setLocalStream]);

  const createPeerConnection = useCallback(
    (targetSid: string) => {
      const existingPc = peersRef.current.get(targetSid);
      if (existingPc) {
        existingPc.close();
        peersRef.current.delete(targetSid);
      }

      const rtcConfig = buildRTCConfig();
      const pc = new RTCPeerConnection(rtcConfig);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack from ${targetSid}: tracks=${event.streams[0]?.getTracks().map(t => t.kind).join(',')}, id=${event.streams[0]?.id}`);
        event.streams[0]?.getAudioTracks().forEach(track => {
          track.enabled = false;
          console.log(`[WebRTC] Incoming audio from ${targetSid} muted by default`);
        });
        updateUserStream(targetSid, event.streams[0]);
        updatePeerStream(targetSid, event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit('ice_candidate', {
            target_sid: targetSid,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state with ${targetSid}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          console.log(`[WebRTC] ICE failed with ${targetSid}, attempting restart`);
          try { pc.restartIce(); } catch {}
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state with ${targetSid}: ${pc.connectionState}`);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          removePeer(targetSid);
          peersRef.current.delete(targetSid);
          connectedSidsRef.current.delete(targetSid);
          retryCountRef.current.delete(targetSid);
          const timer = connectTimersRef.current.get(targetSid);
          if (timer) { clearTimeout(timer); connectTimersRef.current.delete(targetSid); }
        }
        if (pc.connectionState === 'connected') {
          retryCountRef.current.delete(targetSid);
          const timer = connectTimersRef.current.get(targetSid);
          if (timer) { clearTimeout(timer); connectTimersRef.current.delete(targetSid); }
        }
      };

      pc.onnegotiationneeded = () => {
        console.log(`[WebRTC] Negotiation needed with ${targetSid}`);
      };

      peersRef.current.set(targetSid, pc);

      const peerData = {
        sid: targetSid,
        user: '',
        campus: '',
        role: '',
        connection: pc,
      };
      addPeer(targetSid, peerData);

      return pc;
    },
    [emit, addPeer, removePeer, updatePeerStream, updateUserStream]
  );

  const createOffer = useCallback(
    async (targetSid: string) => {
      const currentRetries = retryCountRef.current.get(targetSid) || 0;
      if (currentRetries >= MAX_RETRIES) {
        console.log(`[WebRTC] Max retries (${MAX_RETRIES}) reached for ${targetSid}, giving up`);
        connectedSidsRef.current.delete(targetSid);
        retryCountRef.current.delete(targetSid);
        return;
      }

      if (connectedSidsRef.current.has(targetSid)) {
        console.log(`[WebRTC] Already connected to ${targetSid}, skipping offer`);
        return;
      }
      connectedSidsRef.current.add(targetSid);
      retryCountRef.current.set(targetSid, currentRetries + 1);

      try {
        const pc = createPeerConnection(targetSid);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log(`[WebRTC] Created offer for ${targetSid}, SDP type=${offer.type} (retry ${currentRetries + 1}/${MAX_RETRIES})`);
        emit('webrtc_offer', {
          target_sid: targetSid,
          offer: pc.localDescription?.toJSON(),
        });

        const failTimer = setTimeout(() => {
          connectTimersRef.current.delete(targetSid);
          if (!peersRef.current.get(targetSid) || peersRef.current.get(targetSid)?.connectionState !== 'connected') {
            console.log(`[WebRTC] Offer to ${targetSid} timed out, will retry (${currentRetries + 1}/${MAX_RETRIES})`);
            connectedSidsRef.current.delete(targetSid);
          }
        }, 10000);
        connectTimersRef.current.set(targetSid, failTimer);
      } catch (err) {
        console.error(`[WebRTC] Failed to create offer for ${targetSid}:`, err);
        connectedSidsRef.current.delete(targetSid);
        retryCountRef.current.delete(targetSid);
      }
    },
    [createPeerConnection, emit]
  );

  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, senderSid: string) => {
      if (connectedSidsRef.current.has(senderSid)) {
        console.log(`[WebRTC] Ignoring duplicate offer from ${senderSid}`);
        return;
      }
      console.log(`[WebRTC] Received offer from ${senderSid}, answering...`);
      connectedSidsRef.current.add(senderSid);

      try {
        const pc = createPeerConnection(senderSid);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emit('webrtc_answer', {
          target_sid: senderSid,
          answer: pc.localDescription?.toJSON(),
        });
        console.log(`[WebRTC] Sent answer to ${senderSid}`);
      } catch (err) {
        console.error(`[WebRTC] Failed to handle offer from ${senderSid}:`, err);
        connectedSidsRef.current.delete(senderSid);
      }
    },
    [createPeerConnection, emit]
  );

  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit, senderSid: string) => {
      const pc = peersRef.current.get(senderSid);
      if (pc) {
        try {
          console.log(`[WebRTC] Setting remote description (answer) from ${senderSid}`);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`[WebRTC] Remote description set from ${senderSid}`);
        } catch (err) {
          console.error(`[WebRTC] Failed to set answer from ${senderSid}:`, err);
        }
      } else {
        console.log(`[WebRTC] No peer connection for answer from ${senderSid}`);
      }
    },
    []
  );

  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit, senderSid: string) => {
      const pc = peersRef.current.get(senderSid);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error(`[WebRTC] Failed to add ICE candidate from ${senderSid}:`, err);
        }
      } else {
        console.log(`[WebRTC] No peer connection for ICE candidate from ${senderSid}`);
      }
    },
    []
  );

  const toggleAudio = useCallback(() => {
    const peerState = usePeerStore.getState();
    const newMuted = !peerState.isAudioMuted;
    if (peerState.localStream) {
      peerState.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    usePeerStore.setState({ isAudioMuted: newMuted });
    emit('mute_audio', { muted: newMuted });
  }, [emit]);

  const toggleVideo = useCallback(() => {
    const peerState = usePeerStore.getState();
    const newVideoOff = !peerState.isVideoOff;
    if (peerState.localStream) {
      peerState.localStream.getVideoTracks().forEach((track) => {
        track.enabled = newVideoOff;
      });
    }
    usePeerStore.setState({ isVideoOff: newVideoOff });
    emit('mute_video', { video_off: newVideoOff });
  }, [emit]);

  const shareScreen = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];
      const mySid = getSocket()?.id;

      emit('screen_share_start', {});
      useSessionStore.getState().setScreenSharer(mySid || null);

      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        sender?.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => {
        emit('screen_share_stop', {});
        useSessionStore.getState().setScreenSharer(null);
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        if (cameraTrack) {
          peersRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            sender?.replaceTrack(cameraTrack);
          });
        }
      };

      return screen;
    } catch (error) {
      console.error('Failed to share screen:', error);
      throw error;
    }
  }, [emit]);

  const cleanup = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    connectedSidsRef.current.clear();
    connectTimersRef.current.forEach((t) => clearTimeout(t));
    connectTimersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleOfferEvent = ({ offer, sender_sid }: any) => {
      console.log(`[WebRTC] Socket event: webrtc_offer from ${sender_sid}`);
      handleOffer(offer, sender_sid);
    };
    const handleAnswerEvent = ({ answer, sender_sid }: any) => {
      console.log(`[WebRTC] Socket event: webrtc_answer from ${sender_sid}`);
      handleAnswer(answer, sender_sid);
    };
    const handleIceEvent = ({ candidate, sender_sid }: any) => {
      handleIceCandidate(candidate, sender_sid);
    };
    const handlePeerTalkTarget = ({ sid, campus, target }: any) => {
      console.log(`[WebRTC] peer_talk_target: ${campus} (${sid}) -> ${target}`);
      const pc = peersRef.current.get(sid);
      if (pc) {
        const myCampus = useSessionStore.getState().roomUsers.find(u => u.sid === s?.id)?.campus;
        const shouldUnmute = target !== null && (target === 'both' || target === myCampus);
        console.log(`[WebRTC] Incoming audio from ${campus}: myCampus=${myCampus}, target=${target}, shouldUnmute=${shouldUnmute}`);
        pc.getReceivers().forEach((receiver) => {
          if (receiver.track?.kind === 'audio') {
            receiver.track.enabled = shouldUnmute;
          }
        });
      }
    };

    s.on('webrtc_offer', handleOfferEvent);
    s.on('webrtc_answer', handleAnswerEvent);
    s.on('ice_candidate', handleIceEvent);
    s.on('peer_talk_target', handlePeerTalkTarget);

    return () => {
      s.off('webrtc_offer', handleOfferEvent);
      s.off('webrtc_answer', handleAnswerEvent);
      s.off('ice_candidate', handleIceEvent);
      s.off('peer_talk_target', handlePeerTalkTarget);
    };
  }, [handleOffer, handleAnswer, handleIceCandidate, socket]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-connect: use a ref to avoid race conditions from roomUsers changes
  const roomUsersRef = useRef(roomUsers);
  roomUsersRef.current = roomUsers;

  useEffect(() => {
    const s = getSocket();
    const mySid = s?.id;
    if (!mySid || !streamReady || !s?.connected) return;

    const tryConnect = () => {
      const users = roomUsersRef.current;
      users.forEach((u) => {
        if (u.sid !== mySid && !peersRef.current.has(u.sid) && !connectedSidsRef.current.has(u.sid)) {
          if (mySid < u.sid) {
            console.log(`[WebRTC] Initiating offer to ${u.user} (${u.sid})`);
            createOffer(u.sid).catch((err) => {
              console.error('[WebRTC] Auto-connect offer failed:', err);
              connectedSidsRef.current.delete(u.sid);
            });
          } else {
            console.log(`[WebRTC] Waiting for offer from ${u.user} (${u.sid}), will retry in 3s`);
            const existing = connectTimersRef.current.get(u.sid);
            if (!existing) {
              const retryTimer = setTimeout(() => {
                connectTimersRef.current.delete(u.sid);
                const stillNoPeer = !peersRef.current.has(u.sid) && !connectedSidsRef.current.has(u.sid);
                if (stillNoPeer) {
                  console.log(`[WebRTC] Retrying - initiating offer to ${u.user} (${u.sid})`);
                  connectedSidsRef.current.delete(u.sid);
                  createOffer(u.sid).catch((err) => {
                    console.error('[WebRTC] Retry offer failed:', err);
                    connectedSidsRef.current.delete(u.sid);
                  });
                }
              }, 3000);
              connectTimersRef.current.set(u.sid, retryTimer);
            }
          }
        }
      });
    };

    tryConnect();

    const currentTalkTarget = usePeerStore.getState().talkTarget;
    const currentLocalMic = usePeerStore.getState().localMicActive;
    if (currentTalkTarget || currentLocalMic) {
      let combined: string | null = null;
      if (currentTalkTarget && currentLocalMic) combined = 'both';
      else if (currentTalkTarget) combined = currentTalkTarget;
      else if (currentLocalMic) combined = 'local';
      emit('talk_to', { target: combined });
    }

    const currentVideoOff = usePeerStore.getState().isVideoOff;
    emit('mute_video', { video_off: currentVideoOff });
    const currentAudioMuted = usePeerStore.getState().isAudioMuted;
    emit('mute_audio', { muted: currentAudioMuted });

    // No cleanup needed — timers are tracked in connectTimersRef and managed per-SID
  }, [roomUsers, streamReady, createOffer, emit]);

  useEffect(() => {
    const s = getSocket();
    if (!s?.connected) return;

    let combined: string | null = null;
    if (talkTarget && localMicActive) combined = 'both';
    else if (talkTarget) combined = talkTarget;
    else if (localMicActive) combined = 'local';

    console.log(`[WebRTC] talk_to changed: talkTarget=${talkTarget}, localMicActive=${localMicActive}, combined=${combined}`);
    emit('talk_to', { target: combined });
  }, [talkTarget, localMicActive, emit]);

  useEffect(() => {
    const currentSids = new Set(roomUsers.map((u) => u.sid));
    const mySid = getSocket()?.id;

    peersRef.current.forEach((pc, sid) => {
      if (!currentSids.has(sid) && sid !== mySid) {
        console.log(`[WebRTC] Closing stale peer connection: ${sid}`);
        pc.close();
        peersRef.current.delete(sid);
        connectedSidsRef.current.delete(sid);
        const timer = connectTimersRef.current.get(sid);
        if (timer) { clearTimeout(timer); connectTimersRef.current.delete(sid); }
        removePeer(sid);
      }
    });
  }, [roomUsers, removePeer]);

  return {
    startLocalStream,
    createOffer,
    toggleAudio,
    toggleVideo,
    shareScreen,
    cleanup,
    localStream: localStreamRef,
  };
}
