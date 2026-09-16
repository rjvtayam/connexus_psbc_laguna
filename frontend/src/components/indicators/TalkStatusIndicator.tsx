import { Mic, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';

export function TalkStatusIndicator() {
  const talkResponseStatus = useSessionStore((s) => s.talkResponseStatus);
  const talkResponderName = useSessionStore((s) => s.talkResponderName);

  if (talkResponseStatus === 'idle') return null;

  if (talkResponseStatus === 'pending') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10 animate-pulse">
        <Clock size={12} />
        <span>WAITING FOR RESPONSE</span>
      </div>
    );
  }

  if (talkResponseStatus === 'accepted') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-green-500/15 border border-green-500/40 text-green-400 shadow-lg shadow-green-500/10">
        <CheckCircle2 size={12} />
        <span>{talkResponderName} ACCEPTED</span>
      </div>
    );
  }

  if (talkResponseStatus === 'rejected') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500/15 border border-red-500/40 text-red-400 shadow-lg shadow-red-500/10">
        <XCircle size={12} />
        <span>{talkResponderName} DECLINED</span>
      </div>
    );
  }

  return null;
}
