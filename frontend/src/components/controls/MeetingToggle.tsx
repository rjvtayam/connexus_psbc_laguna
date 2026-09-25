import { useEffect, useRef, useState } from 'react';
import { Lock, Users, X } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';

const MEETING_ROLES = ['principal', 'teacher', 'staff'];
const MEETING_CAMPUSES = ['paete', 'pagsanjan'] as const;

const campusLabel: Record<string, string> = {
  paete: 'PAE',
  pagsanjan: 'PAG',
};

interface MeetingToggleProps {
  compact?: boolean;
}

export function MeetingToggle({ compact = false }: MeetingToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { portalMode, meetingScope, setMeetingScope } = useSessionStore();
  const user = useAuthStore((s) => s.user);
  const { emit } = useSocket();

  const role = user?.role;
  const myCampus = user?.campus;

  useEffect(() => {
    if (portalMode && meetingScope) {
      setMeetingScope(null);
      emit('meeting_changed', { active: false });
    }
  }, [portalMode, meetingScope, setMeetingScope, emit]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  if (!role || !MEETING_ROLES.includes(role) || !myCampus || !MEETING_CAMPUSES.includes(myCampus as any)) {
    return null;
  }

  const startMeeting = (campus: string) => {
    setOpen(false);
    if (campus === meetingScope) return;
    emit('meeting_changed', { active: true, campus });
  };

  const endMeeting = () => {
    emit('meeting_changed', { active: false });
  };

  const disabled = portalMode;

  if (meetingScope) {
    return (
      <div ref={containerRef} className="relative flex items-center" data-demo="meeting-toggle">
        <div
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 h-7 sm:h-9 rounded-lg text-[10px] sm:text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-400`}
          title={`Meeting with ${meetingScope === 'paete' ? 'Paete' : 'Pagsanjan'} campus`}
        >
          <Lock size={compact ? 12 : 13} />
          <span className="hidden sm:inline">MEETING · {campusLabel[meetingScope]}</span>
          <span className="sm:hidden">{campusLabel[meetingScope]}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <button
          onClick={endMeeting}
          className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 ml-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all duration-200"
          title="End meeting"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const options = MEETING_CAMPUSES.slice().sort((a, b) => {
    if (a === myCampus) return -1;
    if (b === myCampus) return 1;
    return 0;
  });

  return (
    <div ref={containerRef} className="relative" data-demo="meeting-toggle">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex items-center justify-center gap-1.5 px-2.5 h-7 sm:h-9 sm:px-3 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200 ${
          disabled
            ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
            : open
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
        }`}
        title={disabled ? 'Disabled during Live Portal' : 'Start a campus meeting'}
      >
        <Users size={compact ? 12 : 14} />
        <span>MEET</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-44 rounded-lg border border-gray-700/60 bg-gray-900/95 backdrop-blur-xl shadow-xl shadow-black/40 p-1.5 z-50">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Meet with campus
          </div>
          {options.map((campus) => (
            <button
              key={campus}
              onClick={() => startMeeting(campus)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium text-gray-200 hover:bg-amber-500/15 hover:text-amber-300 transition-colors duration-150"
            >
              <Lock size={12} className="text-amber-400" />
              Meet in {campus === 'paete' ? 'PAETE' : 'PAGSANJAN'}
              {campus === myCampus && (
                <span className="ml-auto text-[9px] uppercase text-gray-500">yours</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
