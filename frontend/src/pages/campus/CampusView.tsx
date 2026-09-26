import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { VideoCard } from '../../components/video/VideoCard';
import { VideoControls } from '../../components/video/VideoControls';
import { PortalToggle } from '../../components/controls/PortalToggle';
import { MeetingToggle } from '../../components/controls/MeetingToggle';
import { TalkButton } from '../../components/controls/TalkButton';
import { EmergencyButton } from '../../components/controls/EmergencyButton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { BulletinBoard } from '../../components/announcements/BulletinBoard';
import { ActivityToast, pushActivity } from '../../components/ui/ActivityToast';
import { NotificationToast } from '../../components/ui/NotificationToast';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSocket } from '../../hooks/useSocket';
import { useSettingsSync } from '../../hooks/useSettingsSync';
import { usePeerStore } from '../../stores/peerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthStore } from '../../stores/authStore';
import { ROOMS } from '../../lib/constants';
import { RoomUser } from '../../types/session';
import { buildSelfUser, cardKey, partitionCampusColumns, sortUsersForDisplay, SELF_CARD_KEY } from '../../lib/campusLayout';
import { Users, Wifi, MessageSquare, MonitorUp, AlertTriangle, X } from 'lucide-react';
import { PortalStatusIndicator } from '../../components/indicators/PortalStatusIndicator';
import { MicTalkingIndicator } from '../../components/indicators/MicTalkingIndicator';
import { WelcomeToast } from '../../components/demo/WelcomeToast';
import { LiveDemo } from '../../components/demo/LiveDemo';
import { TalkRequestModal } from '../../components/ui/TalkRequestModal';

export function CampusView() {
  const { campusName } = useParams<{ campusName: string }>();
  const roomId = ROOMS.MAIN;
  const { startLocalStream, toggleVideo, shareScreen, stopScreenShare } = useWebRTC(roomId);
  const { emit } = useSocket();
  useSettingsSync();
  const { localStream, isVideoOff, isScreenSharing, localMicActive, isAudioMuted } = usePeerStore();
  const { roomUsers, isEmergency, emergencyTriggeredBy, remotePortalModes, remoteMeetingScopes, remoteVideoOff, remoteAudioMuted, screenSharerSid, portalMode, meetingScope, unreadAllCount, unreadCampusCount, clearUnreadChat } = useSessionStore();
  const { user } = useAuthStore();
  const [showChat, setShowChat] = useState(false);
  const [activeTalkTarget, setActiveTalkTarget] = useState<'paete' | 'pagsanjan' | 'both' | null>(null);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const onlinePanelRef = useRef<HTMLDivElement>(null);
  const mySid = useSocket().socket?.id;
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
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLiveDemo, setShowLiveDemo] = useState(false);
  const [demoData, setDemoData] = useState<{ userId: string; name: string; campus: string; role: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
        console.error('[CampusView] Error in init:', err);
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
    if (!localStream) return;
    if (portalMode) {
      setTalkTarget(null);
      setLocalMicActive(false);
      localStream.getVideoTracks().forEach((track) => { track.enabled = false; });
      usePeerStore.setState({ isVideoOff: true });
      emit('mute_video', { video_off: true });
      emit('mute_audio', { muted: true });
      emit('talk_to', { target: null });
    }
  }, [portalMode, localStream, emit, setTalkTarget, setLocalMicActive]);

  useEffect(() => {
    const handleJoin = (e: Event) => {
      const { user, campus, role } = (e as CustomEvent).detail;
      if (role !== 'admin') {
        pushActivity({ type: 'join', user, campus, role });
      }
    };
    const handleLeave = (e: Event) => {
      const { user, campus, role } = (e as CustomEvent).detail;
      if (role !== 'admin') {
        pushActivity({ type: 'leave', user, campus, role });
      }
    };
    window.addEventListener('participant_joined', handleJoin);
    window.addEventListener('participant_left', handleLeave);
    return () => {
      window.removeEventListener('participant_joined', handleJoin);
      window.removeEventListener('participant_left', handleLeave);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (onlinePanelRef.current && !onlinePanelRef.current.contains(e.target as Node)) {
        setShowOnlinePanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleUsers = roomUsers.filter((u) => {
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
    campus: campusName || user?.campus,
    role: user?.role,
    stream: localStream,
  });

  const displayUsers: RoomUser[] = [...visibleUsers, selfUser];
  const campusColumns = partitionCampusColumns(displayUsers);

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
        isMuted={remoteAudioMuted[u.sid] || false}
        isVideoOff={remoteVideoOff[u.sid] || false}
        isPortalLive={remotePortalModes[u.sid] ?? false}
        portalStatus={remoteMeetingScopes[u.sid] ? 'meeting' : (remotePortalModes[u.sid] ? 'portal' : 'live')}
        peerSid={u.sid}
      />
    );
  };

  const campusLabel = campusName?.toUpperCase() || 'CAMPUS';
  const oppositeCampus = campusName === 'paete' ? 'pagsanjan' : 'paete';

  const handleTalkToggle = () => {
    setActiveTalkTarget((prev) => {
      const next = prev === oppositeCampus ? null : oppositeCampus;
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

  const [isHandRaised, setIsHandRaised] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col p-1.5 sm:p-3 md:p-4">
        <header className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-3 md:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-wrap">
            <h1 className="font-orbitron text-base sm:text-xl md:text-2xl font-bold text-white truncate">PSBC {campusLabel}</h1>
            <span className="flex items-center gap-1 text-green-400 font-medium text-[10px] sm:text-xs">
              <Wifi size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">SYSTEM ONLINE</span>
            </span>
            <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-md border ${campusName === 'paete' ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' : 'text-purple-300 bg-purple-500/10 border-purple-500/30'} truncate`}>
              {campusLabel} <span className="opacity-70 hidden sm:inline">{user?.role === 'principal' ? 'Principal' : user?.role === 'teacher' ? 'Teacher' : 'Staff'}</span>
            </span>
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
                    <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Online ({roomUsers.length})</p>
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
                      const campusColor = u.campus === 'paete' ? 'bg-cyan-500' : u.campus === 'pagsanjan' ? 'bg-purple-500' : 'bg-primary-500';
                      return (
                        <div
                          key={u.sid}
                          className={`flex items-center gap-2 sm:gap-3 px-3 py-2 transition-colors ${
                            isMe ? 'bg-primary-500/10 border-l-2 border-primary-500' : 'hover:bg-gray-700/50'
                          }`}
                        >
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${campusColor} flex items-center justify-center text-[10px] sm:text-xs font-bold text-white flex-shrink-0`}>
                            {u.user?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] sm:text-sm text-white truncate">
                              {u.user}
                              {isMe && <span className="ml-1 text-[9px] sm:text-[10px] text-primary-400 font-semibold">(You)</span>}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase truncate">{u.campus?.replace('_', ' ')} · {u.role}</p>
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
              className="relative p-1.5 sm:p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              data-demo="btn-chat"
            >
              <MessageSquare size={16} className="sm:w-5 sm:h-5" />
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

        <div className="flex-1 mb-1.5 sm:mb-3 md:mb-4 min-h-0" data-demo="remote-area">
          {effectiveSharerSid ? (
            <div className="h-full flex flex-col gap-1.5 sm:gap-3">
              {(() => {
                const isLocalSharer = effectiveSharerSid === mySid;
                const sharer = isLocalSharer
                  ? { sid: mySid, user: user?.full_name || 'You', campus: campusName || 'paete', stream: localStream }
                  : roomUsers.find((u) => u.sid === effectiveSharerSid);
                if (sharer) {
                  return (
                    <div className="flex-1 relative min-h-0">
                      <VideoCard
                        stream={sharer.stream || null}
                        name={sharer.user}
                        campus={sharer.campus}
                        isLocal={isLocalSharer}
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
              <Users size={24} className="text-gray-600 mb-1.5 sm:mb-2" />
              <p className="text-gray-500 font-medium text-xs sm:text-sm">Waiting for connections...</p>
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
                campus={campusName || user?.campus || 'paete'}
                isMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                peerSid={mySid}
              />
            </div>
            <div className="flex sm:flex-1 items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className={`text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg border ${campusName === 'paete' ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' : 'text-purple-300 bg-purple-500/10 border-purple-500/30'}`} data-demo="campus-badge">
                <span className="opacity-60 hidden sm:inline">Campus :</span> <span className="font-bold">{campusLabel}</span>
              </span>
              <div data-demo="portal-toggle"><PortalToggle compact /></div>
              <MeetingToggle compact />
              <div className="flex flex-col items-center gap-0.5">
                <TalkButton
                  target={oppositeCampus}
                  isActive={activeTalkTarget === oppositeCampus}
                  onClick={handleTalkToggle}
                  disabled={portalMode || !!meetingScope}
                  compact
                />
                <span className="text-[8px] sm:text-[9px] text-gray-500 font-medium">{oppositeCampus === 'paete' ? 'PAE' : 'PAG'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end">
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
                videoDisabled={portalMode}
                screenShareDisabled={portalMode}
                handDisabled={portalMode}
                reactionDisabled={portalMode}
              />
              {user?.role === 'principal' && (
                <EmergencyButton onClick={() => setShowEmergencyConfirm(true)} onDismiss={() => { emit('emergency_dismiss'); }} disabled={portalMode} />
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />

      <ConfirmModal
        isOpen={showEmergencyConfirm}
        title="Emergency Broadcast?"
        message="This will immediately override all campus screens with an emergency alert. This action cannot be undone."
        confirmLabel="Emergency"
        cancelLabel="Cancel"
        variant="danger"
        icon="radio"
        onConfirm={() => {
          const campusLabel = campusName?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Campus';
          const mode = portalMode ? 'portal' : 'live';
          emit('emergency_trigger', { message: `Emergency from ${campusLabel}`, mode });
          setShowEmergencyConfirm(false);
        }}
        onCancel={() => setShowEmergencyConfirm(false)}
      />

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

      <ActivityToast />
      <NotificationToast />
      <TalkRequestModal />
    </DashboardLayout>
  );
}
