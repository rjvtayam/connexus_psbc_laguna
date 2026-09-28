import { Lock, Users, X } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useSessionStore } from '../../stores/sessionStore';

const campusLabel: Record<string, string> = {
  paete: 'PAE',
  pagsanjan: 'PAG',
};

export function MeetingInviteToast() {
  const { emit } = useSocket();
  const meetingInvite = useSessionStore((s) => s.meetingInvite);
  const meetingInviteDeclined = useSessionStore((s) => s.meetingInviteDeclined);
  const meetingScope = useSessionStore((s) => s.meetingScope);
  const setMeetingInviteDeclined = useSessionStore((s) => s.setMeetingInviteDeclined);

  if (!meetingInvite || meetingInvite.late || meetingInviteDeclined || meetingScope) return null;

  const handleAccept = () => {
    // Accepting implies going LIVE — the meeting requires portal off
    if (useSessionStore.getState().portalMode) {
      useSessionStore.getState().setPortalMode(false);
      emit('portal_mode_changed', { active: false, meeting: false });
    }
    emit('meeting_invite_response', { accept: true });
  };

  const handleDecline = () => {
    setMeetingInviteDeclined(true);
  };

  return (
    <div
      className="fixed top-16 right-4 z-[96] w-[300px] rounded-xl border border-amber-500/40 bg-gray-900/95 backdrop-blur-xl shadow-xl shadow-black/40 overflow-hidden animate-fade-in"
      data-demo="meeting-invite-toast"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <div className="p-3.5">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Lock size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Meeting Invite</p>
            <p className="text-xs text-gray-400 truncate">
              <span className="text-white font-medium">{meetingInvite.from_name}</span> opened a meeting in{' '}
              <span className="text-amber-300 font-semibold">{campusLabel[meetingInvite.campus]}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
          >
            <X size={13} />
            Later
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-gray-950 transition-all"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              boxShadow: '0 0 16px rgba(245,158,11,0.3)',
            }}
          >
            <Users size={13} />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
