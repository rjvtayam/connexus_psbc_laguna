import { Lock, Radio, Wifi } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';

export function PortalStatusIndicator() {
  const { portalMode, meetingScope } = useSessionStore();

  if (meetingScope) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10 transition-all duration-300">
        <Lock size={12} />
        <span>MEETING · {meetingScope === 'paete' ? 'PAE' : 'PAG'}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      </div>
    );
  }

  if (!portalMode) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10 transition-all duration-300">
        <Wifi size={12} className="animate-pulse" />
        <span>LIVE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-green-500/15 border border-green-500/40 text-green-400 shadow-lg shadow-green-500/10 transition-all duration-300">
      <Radio size={12} />
      <span>PORTAL</span>
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
    </div>
  );
}
