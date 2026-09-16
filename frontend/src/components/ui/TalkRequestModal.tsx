import { Mic, MicOff } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useSessionStore } from '../../stores/sessionStore';

export function TalkRequestModal() {
  const { emit } = useSocket();
  const talkRequest = useSessionStore((s) => s.talkRequest);
  const clearTalkRequest = useSessionStore((s) => s.clearTalkRequest);

  if (!talkRequest) return null;

  const targetLabel = talkRequest.target_campus === 'both' ? 'Both Campuses' : talkRequest.target_campus?.toUpperCase();

  const handleAccept = () => {
    emit('talk_request_accept', { from_sid: talkRequest.from_sid });
    clearTalkRequest();
  };

  const handleReject = () => {
    emit('talk_request_reject', { from_sid: talkRequest.from_sid });
    clearTalkRequest();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fade-in" onClick={handleReject} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[90vw] max-w-sm">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(20,27,45,0.98) 0%, rgba(10,15,25,0.99) 100%)',
            border: '1.5px solid rgba(34,211,238,0.3)',
            boxShadow: '0 0 30px rgba(34,211,238,0.15), 0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Top neon line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)' }} />

          {/* Header */}
          <div className="p-5 pb-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Mic size={24} className="text-cyan-400" />
            </div>
            <h3 className="font-orbitron text-base font-bold text-white mb-1">Incoming Talk Request</h3>
            <p className="text-gray-400 text-xs">
              Someone wants to talk to <span className="text-cyan-400 font-semibold">{targetLabel}</span>
            </p>
          </div>

          {/* Requester info */}
          <div className="mx-5 p-3 rounded-xl bg-gray-800/50 border border-gray-700/40 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary-400">{talkRequest.from_name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{talkRequest.from_name}</p>
                <p className="text-gray-500 text-[11px] capitalize">{talkRequest.from_role} · {talkRequest.from_campus?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 px-5 pb-5">
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
            >
              <MicOff size={14} />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #059669, #10b981)',
                boxShadow: '0 0 20px rgba(16,185,129,0.3)',
              }}
            >
              <Mic size={14} />
              Accept
            </button>
          </div>

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-cyan-500/40 rounded-tl-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-cyan-500/40 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-cyan-500/20 rounded-bl-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-cyan-500/20 rounded-br-2xl pointer-events-none" />
        </div>
      </div>
    </>
  );
}
