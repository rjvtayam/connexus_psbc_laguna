import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoControls } from '../../components/video/VideoControls';
import { TalkButton } from '../../components/controls/TalkButton';
import { EmergencyButton } from '../../components/controls/EmergencyButton';
import { BulletinBoard } from '../../components/announcements/BulletinBoard';
import { ActivityToast, pushActivity } from '../../components/ui/ActivityToast';
import { NotificationToast } from '../../components/ui/NotificationToast';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSocket } from '../../hooks/useSocket';
import { useSettingsSync } from '../../hooks/useSettingsSync';
import { useRecording } from '../../hooks/useRecording';
import { usePeerStore } from '../../stores/peerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthStore } from '../../stores/authStore';
import { ROOMS } from '../../lib/constants';
import { RoomUser } from '../../types/session';
import { buildSelfUser, cardKey, partitionCampusColumns, sortUsersForDisplay, SELF_CARD_KEY } from '../../lib/campusLayout';
import { Users, Wifi, MessageSquare, MonitorUp, AlertTriangle, X } from 'lucide-react';
import { PortalToggle } from '../../components/controls/PortalToggle';
import { MeetingToggle } from '../../components/controls/MeetingToggle';
import { PortalStatusIndicator } from '../../components/indicators/PortalStatusIndicator';
import { MicTalkingIndicator } from '../../components/indicators/MicTalkingIndicator';
import { WelcomeToast } from '../../components/demo/WelcomeToast';
import { LiveDemo } from '../../components/demo/LiveDemo';
import { TalkStatusIndicator } from '../../components/indicators/TalkStatusIndicator';
import { TalkRequestModal } from '../../components/ui/TalkRequestModal';

export function ControlRoom() {
  const roomId = ROOMS.MAIN;
  const { startLocalStream, toggleVideo, shareScreen, stopScreenShare } = useWebRTC(roomId);
  const { emit } = useSocket();
  useSettingsSync();
  const { localStream, isVideoOff, isScreenSharing, localMicActive, isAudioMuted } = usePeerStore();
  const { roomUsers, isEmergency, emergencyTriggeredBy, remotePortalModes, remoteMeetingScopes, remoteVideoOff, remoteAudioMuted, screenSharerSid, portalMode, meetingScope, unreadAllCount, unreadCampusCount, clearUnreadChat } = useSessionStore();
  const { user } = useAuthStore();
  const { isRecording, elapsedTime, uploading: recordingUploading, uploadError, startRecording, stopRecording, formatTime: formatRecordingTime } = useRecording(roomId);
  const [activeTalkTarget, setActiveTalkTarget] = useState<'paete' | 'pagsanjan' | 'both' | null>(null);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const onlinePanelRef = useRef<HTMLDivElement>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLiveDemo, setShowLiveDemo] = useState(false);
  const [demoData, setDemoData] = useState<{ userId: string; name: string; campus: string; role: string } | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [expandedSid, setExpandedSid] = useState<string | null>(null);

  const myCampus = user?.campus;
  const mySid = useSocket().socket?.id;
  const isAdmin = user?.role === 'admin';
  const { setTalkTarget, setLocalMicActive } = usePeerStore();
  const talkResponseStatus = useSessionStore((s) => s.talkResponseStatus);

  useEffect(() => {
    if (talkResponseStatus === 'accepted' && activeTalkTarget && !useSessionStore.getState().portalMode) {
      setTalkTarget(activeTalkTarget);
      setLocalMicActive(true);
    }
    if (talkResponseStatus === 'rejected') {
      setActiveTalkTarget(null);
      useSessionStore.getState().clearTalkRequest();
    }
  }, [talkResponseStatus, activeTalkTarget, setTalkTarget, setLocalMicActive]);

  useEffect(() => {
    const pending = localStorage.getItem('pending_live_demo');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data?.name && data?.campus && data?.role) {
          setDemoData(data);
          setShowWelcome(true);
        }
      } catch { localStorage.removeItem('pending_live_demo'); }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      localStorage.setItem('current_room_id', roomId);
      emit('join_room', { room_id: roomId });
      emit('portal_mode_changed', { active: portalMode, meeting: false });
      try {
        await startLocalStream();
      } catch (err: any) {
        console.error('[ControlRoom] Error in init:', err);
        setCameraError(err?.message || 'Could not access camera/microphone. Please allow permissions and reload.');
      }
    };
    init();
    const syncTimer = window.setInterval(() => {
      emit('sync_room', { room_id: roomId });
    }, 10000);
    return () => {
      window.clearInterval(syncTimer);
      localStorage.removeItem('current_room_id');
    };
  }, []);

  useEffect(() => {
    const handleJoin = (e: Event) => {
      const { user, campus, role } = (e as CustomEvent).detail;
      pushActivity({ type: 'join', user, campus, role });
    };
    const handleLeave = (e: Event) => {
      const { user, campus, role } = (e as CustomEvent).detail;
      pushActivity({ type: 'leave', user, campus, role });
    };
    window.addEventListener('participant_joined', handleJoin);
    window.addEventListener('participant_left', handleLeave);
    return () => {
      window.removeEventListener('participant_joined', handleJoin);
      window.removeEventListener('participant_left', handleLeave);
    };
  }, []);

  const prevPortalRef = useRef(portalMode);
  const handledStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const stopRecordingRef = useRef(stopRecording);
  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    if (!localStream) return;
    const portalChanged = prevPortalRef.current !== portalMode;
    const newStream = handledStreamRef.current !== localStream;
    if (!portalChanged && !newStream) return;
    const wasPortal = prevPortalRef.current;
    prevPortalRef.current = portalMode;
    handledStreamRef.current = localStream;

    if (portalMode) {
      setTalkTarget(null);
      setLocalMicActive(false);
      emit('mute_audio', { muted: true });
      emit('talk_to', { target: null });
      if (isAdmin) {
        localStream.getVideoTracks().forEach((track) => { track.enabled = false; });
        const wasOff = usePeerStore.getState().isVideoOff;
        usePeerStore.setState({ isVideoOff: true });
        if (!wasOff) emit('mute_video', { video_off: true });
        stopScreenShare();
        if (isRecordingRef.current) {
          try { stopRecordingRef.current?.(); } catch {}
        }
      } else {
        localStream.getVideoTracks().forEach((track) => { track.enabled = true; });
        const wasOff = usePeerStore.getState().isVideoOff;
        usePeerStore.setState({ isVideoOff: false });
        if (wasOff) emit('mute_video', { video_off: false });
      }
    } else if (wasPortal) {
      localStream.getVideoTracks().forEach((track) => { track.enabled = true; });
      const wasOff = usePeerStore.getState().isVideoOff;
      if (wasOff) {
        usePeerStore.setState({ isVideoOff: false });
        emit('mute_video', { video_off: false });
      }
    }
  }, [portalMode, localStream, isAdmin, emit, setTalkTarget, setLocalMicActive, stopScreenShare]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (onlinePanelRef.current && !onlinePanelRef.current.contains(e.target as Node)) {
        setShowOnlinePanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!expandedSid) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedSid(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expandedSid]);

  const remoteUsers = roomUsers.filter((u) => {
    if (u.sid === mySid) return false;
    if (u.role === 'admin' && (remotePortalModes[u.sid] ?? false)) return false;
    return true;
  });

  // Portal-hide hides the admin's *camera* card from the grid; their shared
  // screen must still take over the stage (the whole point of presenting).
  const effectiveSharerSid = screenSharerSid || null;

  const selfUser = buildSelfUser({
    sid: mySid,
    name: user?.full_name || 'You',
    campus: myCampus,
    role: user?.role,
    stream: localStream,
  });

  const displayUsers: RoomUser[] = [...remoteUsers, selfUser];
  const campusColumns = partitionCampusColumns(displayUsers);

  const handleTalkTo = (target: 'paete' | 'pagsanjan' | 'both') => {
    setActiveTalkTarget((prev) => {
      const next = prev === target ? null : target;
      if (next) {
        emit('talk_request', { target_campus: next });
        useSessionStore.getState().setTalkResponseStatus('pending');
      } else {
        useSessionStore.getState().clearTalkRequest();
        setTalkTarget(null);
      }
      return next;
    });
  };

  const handleToggleHand = () => {
    setIsHandRaised((prev) => {
      const next = !prev;
      emit(next ? 'raise_hand' : 'lower_hand');
      if (mySid) {
        useSessionStore.getState().setRaisedHand(mySid, next);
      }
      return next;
    });
  };

  const handleReact = (emoji: string) => {
    emit('send_reaction', { emoji });
    useSessionStore.getState().addFloatingReaction(mySid || 'local', emoji);
  };

  const getHighlight = (campus: string) => {
    if (isAdmin) {
      return { isHighlighted: true, highlightColor: campus === 'paete' ? 'cyan' as const : 'purple' as const };
    }
    return { isHighlighted: false, highlightColor: 'cyan' as const };
  };

  const renderParticipantCard = (u: RoomUser) => {
    if (u === selfUser) {
      return (
        <div key={cardKey(u, true)} data-demo="local-video" className="h-full min-h-0">
          <VideoCard
            stream={localStream}
            name={u.user}
            campus={u.campus}
            isLocal={true}
            isMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            peerSid={mySid}
            onExpand={() => setExpandedSid(mySid || SELF_CARD_KEY)}
          />
        </div>
      );
    }

    return (
      <VideoCard
        key={u.sid}
        stream={u.stream || null}
        name={u.user}
        campus={u.campus}
        {...getHighlight(u.campus)}
        isMuted={remoteAudioMuted[u.sid] || false}
        isVideoOff={remoteVideoOff[u.sid] || false}
        isPortalLive={remotePortalModes[u.sid] ?? false}
        portalStatus={remoteMeetingScopes[u.sid] ? 'meeting' : (remotePortalModes[u.sid] ? 'portal' : 'live')}
        peerSid={u.sid}
        onExpand={() => setExpandedSid(u.sid)}
      />
    );
  };

  const campusColors: Record<string, string> = {
    paete: 'bg-cyan-500',
    pagsanjan: 'bg-purple-500',
    control_room: 'bg-primary-500',
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col p-1.5 sm:p-3 md:p-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-3 md:mb-4 animate-fade-in-up">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-wrap">
            <h1 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide truncate">Control Room</h1>
            <span className="flex items-center gap-1 text-green-400 font-medium text-[10px] sm:text-xs">
              <Wifi size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">SYSTEM ONLINE</span>
            </span>
            {isAdmin && (
              <span className="text-[9px] sm:text-[10px] text-primary-400 bg-primary-500/10 border border-primary-500/20 px-1 sm:px-1.5 py-0.5 rounded-md font-semibold" data-demo="campus-badge">
                ADMIN
              </span>
            )}
            {isRecording && (
              <span className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1 sm:px-1.5 py-0.5 rounded-md font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="hidden sm:inline">REC</span> {formatRecordingTime(elapsedTime)}
              </span>
            )}
            {recordingUploading && (
              <span className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 sm:px-1.5 py-0.5 rounded-md font-semibold">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">UPLOADING</span>
              </span>
            )}
            {uploadError && (
              <span className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1 sm:px-1.5 py-0.5 rounded-md font-semibold" title={uploadError}>
                <span className="hidden sm:inline">UPLOAD FAILED</span>
              </span>
            )}
            <div className="hidden md:flex"><TalkStatusIndicator /></div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            <div className="relative" ref={onlinePanelRef}>
              <button
                onClick={() => setShowOnlinePanel(!showOnlinePanel)}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-gray-700"
                data-demo="online-count"
              >
                <Users size={12} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline text-gray-500">Online</span>
                <span className="min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center px-0.5 sm:px-1">{roomUsers.length}</span>
              </button>

              {showOnlinePanel && (
                <div className="absolute right-0 top-full mt-2 w-60 sm:w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Online ({roomUsers.length})</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-green-400 font-medium">LIVE</span>
                    </div>
                  </div>
                  {isEmergency && (
                    <div className="px-3 py-2 bg-red-500/15 border-b border-red-500/30 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                      <span className="text-[11px] text-red-300 font-medium">
                        Emergency — {emergencyTriggeredBy}
                      </span>
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto">
                    {sortUsersForDisplay(roomUsers).map((u) => {
                      const isMe = u.sid === mySid;
                      return (
                        <div
                          key={u.sid}
                          className={`flex items-center gap-2 sm:gap-3 px-3 py-2 transition-colors ${
                            isMe ? 'bg-primary-500/10 border-l-2 border-primary-500' : 'hover:bg-gray-700/50'
                          }`}
                        >
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${campusColors[u.campus] || 'bg-gray-600'} flex items-center justify-center text-[10px] sm:text-xs font-bold text-white flex-shrink-0`}>
                            {u.user?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white truncate">
                              {u.user}
                              {isMe && <span className="ml-1 text-[9px] text-primary-400 font-semibold">(You)</span>}
                            </p>
                            <p className="text-[9px] text-gray-600 uppercase truncate">{u.campus?.replace('_', ' ')} · {u.role}</p>
                          </div>
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex"><PortalStatusIndicator /></div>
            <div className="hidden md:flex"><MicTalkingIndicator /></div>
            <button
              onClick={() => { setShowChat(true); clearUnreadChat(); }}
              className="relative p-1 sm:p-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              data-demo="btn-chat"
            >
              <MessageSquare size={12} className="sm:w-3.5 sm:h-3.5" />
              {(unreadAllCount + unreadCampusCount) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 bg-blue-500 rounded-full text-[8px] sm:text-[10px] font-bold flex items-center justify-center px-0.5 sm:px-1 animate-badge-pulse">
                  {(unreadAllCount + unreadCampusCount) > 99 ? '99+' : (unreadAllCount + unreadCampusCount)}
                </span>
              )}
            </button>
            <div data-demo="btn-bell"><BulletinBoard /></div>
          </div>
        </header>

        {cameraError && (
          <div className="mb-1.5 sm:mb-3 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] sm:text-xs">
            <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span className="flex-1 min-w-0 truncate">{cameraError}</span>
            <button onClick={() => setCameraError(null)} className="p-0.5 rounded hover:bg-red-500/20 flex-shrink-0"><X size={10} className="sm:w-3 sm:h-3" /></button>
          </div>
        )}

        {/* Video Grid — GMeet-style campus columns (realtime) */}
        <div className="flex-1 mb-1.5 sm:mb-3 md:mb-4 min-h-0 animate-fade-in-up" data-demo="remote-area">
          {effectiveSharerSid ? (
            <div className="h-full flex flex-col gap-1.5 sm:gap-3">
              {(() => {
                const isLocalSharer = effectiveSharerSid === mySid;
                const sharer = isLocalSharer
                  ? { sid: mySid, user: user?.full_name || 'You', campus: myCampus || 'control_room', stream: localStream }
                  : roomUsers.find((u) => u.sid === effectiveSharerSid);
                if (sharer) {
                  return (
                    <div className="flex-1 relative min-h-0">
                      <VideoCard
                        stream={sharer.stream || null}
                        name={sharer.user}
                        campus={sharer.campus}
                        isLocal={isLocalSharer}
                        {...(!isLocalSharer ? getHighlight(sharer.campus) : {})}
                        isMuted={!isLocalSharer && (remoteAudioMuted[sharer.sid] || false)}
                        isVideoOff={!isLocalSharer && (remoteVideoOff[sharer.sid] || false)}
                        isPortalLive={!isLocalSharer && (remotePortalModes[sharer.sid] ?? false)}
                        portalStatus={!isLocalSharer ? (remoteMeetingScopes[sharer.sid] ? 'meeting' : (remotePortalModes[sharer.sid] ? 'portal' : 'live')) : null}
                        isScreenShare={true}
                        peerSid={isLocalSharer ? undefined : sharer.sid}
                      />
                      <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex items-center gap-1 text-[9px] sm:text-[11px] text-green-400 bg-green-500/15 border border-green-500/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg font-semibold backdrop-blur-sm">
                        <MonitorUp size={8} className="sm:w-3 sm:h-3" />
                        {isLocalSharer ? 'Presenting' : `${sharer.user}`}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {displayUsers.filter((u) => {
                if (effectiveSharerSid && u.sid === effectiveSharerSid) return false;
                if (effectiveSharerSid === mySid && u === selfUser) return false;
                return true;
              }).length > 0 && (
                <div className="flex gap-1.5 sm:gap-2 h-20 sm:h-24 md:h-32 flex-shrink-0 overflow-x-auto">
                  {displayUsers.filter((u) => {
                    if (effectiveSharerSid && u.sid === effectiveSharerSid) return false;
                    if (effectiveSharerSid === mySid && u === selfUser) return false;
                    return true;
                  }).map((u) => {
                    const isSelf = u === selfUser;
                    if (isSelf) {
                      return (
                        <div key={SELF_CARD_KEY} className="w-24 sm:w-32 md:w-40 flex-shrink-0">
                          <VideoCard
                            stream={localStream}
                            name={u.user}
                            campus={u.campus}
                            isLocal={true}
                            isSmall={true}
                            isMuted={isAudioMuted}
                            isVideoOff={isVideoOff}
                            peerSid={mySid}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={u.sid} className="w-24 sm:w-32 md:w-40 flex-shrink-0">
                        <VideoCard
                          stream={u.stream || null}
                          name={u.user}
                          campus={u.campus}
                          isSmall={true}
                          isMuted={remoteAudioMuted[u.sid] || false}
                          isVideoOff={remoteVideoOff[u.sid] || false}
                          isPortalLive={remotePortalModes[u.sid] ?? false}
                          portalStatus={remoteMeetingScopes[u.sid] ? 'meeting' : (remotePortalModes[u.sid] ? 'portal' : 'live')}
                          peerSid={u.sid}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : campusColumns.length > 0 ? (
            <div className="h-full flex flex-col sm:flex-row gap-1.5 sm:gap-3 overflow-y-auto sm:overflow-hidden">
              {campusColumns.map((col) => (
                <div key={col.campus} className="flex flex-col gap-1 sm:gap-1.5 sm:flex-1 sm:min-w-0 sm:min-h-0">
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <span className={`text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-md border ${col.badge}`}>
                      {col.label}
                    </span>
                    <span className="ml-1.5 text-[9px] text-gray-500 font-medium">{col.users.length}</span>
                  </div>
                  <div
                    className="grid gap-1.5 sm:gap-3 sm:flex-1 sm:min-h-0"
                    style={{ gridTemplateRows: `repeat(${col.users.length}, minmax(11rem, 1fr))` }}
                  >
                    {col.users.map((u) => renderParticipantCard(u))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800/40">
              <Users size={14} className="text-gray-600 mb-1.5" />
              <p className="text-gray-500 font-medium text-[11px]">Waiting for connections…</p>
              <p className="text-gray-600 text-[10px] mt-0.5 hidden sm:block">Other users will appear here when they join</p>
            </div>
          )}
        </div>

        {/* Controls + Local Feed — self card also lives in the campus grid above */}
        <div className="animate-fade-in-up">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800/60 p-1.5 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 md:gap-4">
            <div className="w-full sm:w-20 md:w-36 lg:w-48 flex-shrink-0" data-demo="local-video">
              <VideoCard
                isLocal
                isSmall
                stream={localStream}
                name={user?.full_name || 'You'}
                campus={myCampus || 'control_room'}
                isMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                peerSid={mySid}
              />
            </div>
            <div className="flex sm:flex-1 items-center gap-1 sm:gap-1.5 flex-wrap">
              {myCampus && myCampus !== 'control_room' && (
                <>
                  <span className={`text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg border ${myCampus === 'paete' ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' : 'text-purple-300 bg-purple-500/10 border-purple-500/30'}`} data-demo="campus-badge">
                    <span className="opacity-60 hidden sm:inline">Campus :</span> <span className="font-bold">{myCampus.toUpperCase()}</span>
                  </span>
                  <TalkButton
                    target={myCampus === 'paete' ? 'pagsanjan' : 'paete'}
                    isActive={activeTalkTarget !== null}
                    onClick={() => handleTalkTo(myCampus === 'paete' ? 'pagsanjan' : 'paete')}
                    disabled={portalMode || !!meetingScope}
                    compact
                  />
                </>
              )}
              {!myCampus || myCampus === 'control_room' ? (
                <>
                  <div className="flex flex-col items-center gap-0.5">
                    <TalkButton target="paete" isActive={activeTalkTarget === 'paete'} onClick={() => handleTalkTo('paete')} disabled={portalMode || !!meetingScope} compact />
                    <span className="text-[8px] sm:text-[9px] text-gray-500 font-medium">PAE</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <TalkButton target="pagsanjan" isActive={activeTalkTarget === 'pagsanjan'} onClick={() => handleTalkTo('pagsanjan')} disabled={portalMode || !!meetingScope} compact />
                    <span className="text-[8px] sm:text-[9px] text-gray-500 font-medium">PAG</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <TalkButton target="both" isActive={activeTalkTarget === 'both'} onClick={() => handleTalkTo('both')} disabled={portalMode || !!meetingScope} compact />
                    <span className="text-[8px] sm:text-[9px] text-gray-500 font-medium">BTH</span>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end">
              <MeetingToggle compact />
              <div data-demo="portal-toggle"><PortalToggle compact /></div>
              <VideoControls
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                onToggleAudio={() => {
                  if (portalMode) return;
                  setLocalMicActive(!localMicActive);
                }}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={() => { if (portalMode) return; if (isScreenSharing) stopScreenShare(); else shareScreen().catch(() => {}); }}
                isHandRaised={isHandRaised}
                onToggleHand={handleToggleHand}
                onReact={handleReact}
                audioDisabled={portalMode}
                videoDisabled={isAdmin && portalMode}
                screenShareDisabled={portalMode}
                handDisabled={portalMode}
                reactionDisabled={portalMode}
                isRecording={isRecording}
                recordingUploading={recordingUploading}
                recordingTime={isRecording ? formatRecordingTime(elapsedTime) : undefined}
                onToggleRecording={isAdmin ? (isRecording ? stopRecording : startRecording) : undefined}
                recordingDisabled={!isAdmin || portalMode}
              />
              <EmergencyButton onClick={() => setShowEmergencyConfirm(true)} onDismiss={() => { emit('emergency_dismiss'); }} disabled={portalMode} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showEmergencyConfirm}
        title="Emergency Broadcast?"
        message="This will immediately override all campus screens with an emergency alert. This action cannot be undone."
        confirmLabel="Emergency"
        cancelLabel="Cancel"
        variant="danger"
        icon="radio"
        onConfirm={() => {
          console.log('%c[ControlRoom] EMERGENCY CONFIRMED — emitting emergency_trigger', 'color: red; font-weight: bold;');
          const socketConnected = (window as any).__socketConnected;
          console.log('[ControlRoom] Socket connected:', socketConnected);
          emit('emergency_trigger', { message: 'Emergency from Control Room', mode: 'live' });
          console.log('%c[ControlRoom] emergency_trigger emitted', 'color: orange; font-weight: bold;');
          setShowEmergencyConfirm(false);
        }}
        onCancel={() => setShowEmergencyConfirm(false)}
      />

      <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />

      {!isEmergency && showWelcome && demoData && (
        <WelcomeToast
          name={demoData.name}
          campus={demoData.campus}
          role={demoData.role}
          onComplete={() => {
            setShowWelcome(false);
            const demoKey = `demo_completed_${demoData.userId}`;
            if (localStorage.getItem(demoKey)) {
              localStorage.removeItem('pending_live_demo');
            } else {
              setShowLiveDemo(true);
            }
          }}
        />
      )}

      {!isEmergency && showLiveDemo && demoData && (
        <LiveDemo
          isOpen={showLiveDemo}
          onClose={() => {
            setShowLiveDemo(false);
            localStorage.removeItem('pending_live_demo');
            localStorage.setItem(`demo_completed_${demoData.userId}`, 'true');
          }}
          userRole={demoData.role}
        />
      )}

      {/* Expanded card — one participant shown fullscreen */}
      {expandedSid && (() => {
        const isSelfExpanded = expandedSid === mySid || expandedSid === SELF_CARD_KEY;
        const expandedUser = isSelfExpanded
          ? selfUser
          : displayUsers.find((u) => u.sid === expandedSid) || roomUsers.find((u) => u.sid === expandedSid);
        if (!expandedUser) return null;
        const badgeCls = expandedUser.campus === 'paete'
          ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
          : expandedUser.campus === 'pagsanjan'
            ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
            : 'text-primary-400 bg-primary-500/10 border-primary-500/20';
        return (
          <div
            className="fixed inset-0 z-[105] flex items-center justify-center p-2 sm:p-5"
            onClick={() => setExpandedSid(null)}
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <div className="relative w-full h-full max-w-6xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeCls}`}>
                    {expandedUser.campus === 'control_room' ? 'CTRL' : expandedUser.campus.replace('_', ' ').toUpperCase().slice(0, 4)}
                  </span>
                  <span className="text-white text-xs sm:text-sm font-medium truncate">
                    {isSelfExpanded ? 'You' : expandedUser.user}
                  </span>
                  <span className="hidden sm:inline text-[10px] text-gray-500">Press ESC to close</span>
                </div>
                <button
                  onClick={() => setExpandedSid(null)}
                  aria-label="Close fullscreen"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <VideoCard
                  stream={isSelfExpanded ? localStream : expandedUser.stream || null}
                  name={expandedUser.user}
                  campus={expandedUser.campus}
                  isLocal={isSelfExpanded}
                  isExpanded
                  isMuted={isSelfExpanded ? isAudioMuted : remoteAudioMuted[expandedUser.sid] || false}
                  isVideoOff={isSelfExpanded ? isVideoOff : remoteVideoOff[expandedUser.sid] || false}
                  isPortalLive={!isSelfExpanded && (remotePortalModes[expandedUser.sid] ?? false)}
                  portalStatus={!isSelfExpanded ? (remoteMeetingScopes[expandedUser.sid] ? 'meeting' : (remotePortalModes[expandedUser.sid] ? 'portal' : 'live')) : null}
                  peerSid={isSelfExpanded ? mySid : expandedUser.sid}
                  {...(!isSelfExpanded ? getHighlight(expandedUser.campus) : {})}
                />
              </div>
            </div>
          </div>
        );
      })()}

      <ActivityToast />
      <NotificationToast />
      <TalkRequestModal />
    </DashboardLayout>
  );
}
