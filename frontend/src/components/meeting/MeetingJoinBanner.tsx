import { Lock } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useSessionStore } from '../../stores/sessionStore';

const campusLabel: Record<string, string> = {
  paete: 'PAE',
  pagsanjan: 'PAG',
};

export function MeetingJoinBanner() {
  const { emit } = useSocket();
  const meetingInvite = useSessionStore((s) => s.meetingInvite);
  const meetingInviteDeclined = useSessionStore((s) => s.meetingInviteDeclined);
  const meetingScope = useSessionStore((s) => s.meetingScope);

  if (meetingScope || !meetingInvite || (!meetingInvite.late && !meetingInviteDeclined)) return null;

  const handleJoin = () => {
    if (useSessionStore.getState().portalMode) {
      useSessionStore.getState().setPortalMode(false);
      emit('portal_mode_changed', { active: false, meeting: false });
    }
    emit('meeting_invite_response', { accept: true });
  };

  return (
    <button
      onClick={handleJoin}
      className="w-full mb-1.5 sm:mb-3 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-semibold hover:bg-amber-500/25 transition-colors animate-fade-in"
      data-demo="meeting-join-banner"
    >
      <Lock size={12} className="flex-shrink-0" />
      <span>
        Meeting in <span className="text-amber-200">{campusLabel[meetingInvite!.campus]}</span> is LIVE — Tap to join
      </span>
    </button>
  );
}
