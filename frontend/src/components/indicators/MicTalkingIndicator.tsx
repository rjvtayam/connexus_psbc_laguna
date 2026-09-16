import { Mic } from 'lucide-react';
import { usePeerStore } from '../../stores/peerStore';

export function MicTalkingIndicator() {
  const { localMicActive, talkTarget } = usePeerStore();
  const isTalking = localMicActive || talkTarget !== null;

  if (!isTalking) return null;

  const label = talkTarget === 'both'
    ? 'TALKING — ALL'
    : talkTarget === 'paete'
    ? 'TALKING — PAETE'
    : talkTarget === 'pagsanjan'
    ? 'TALKING — PAGSANJAN'
    : localMicActive
    ? 'MIC ACTIVE'
    : 'MIC ACTIVE';

  const color = talkTarget === 'paete'
    ? 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40 shadow-cyan-500/10'
    : talkTarget === 'pagsanjan'
    ? 'text-purple-400 bg-purple-500/15 border-purple-500/40 shadow-purple-500/10'
    : 'text-green-400 bg-green-500/15 border-green-500/40 shadow-green-500/10';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-lg animate-pulse ${color}`}>
      <Mic size={12} />
      <span>{label}</span>
      <span className="flex gap-0.5">
        <span className="w-0.5 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-0.5 h-3 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-0.5 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}
