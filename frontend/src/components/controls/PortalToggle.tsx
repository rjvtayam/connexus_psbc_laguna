import { Radio, Wifi } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useSocket } from '../../hooks/useSocket';

type PortalState = 'portal' | 'live';

interface PortalToggleProps {
  compact?: boolean;
}

export function PortalToggle({ compact = false }: PortalToggleProps) {
  const { portalMode, togglePortalMode } = useSessionStore();
  const { emit } = useSocket();

  const currentState: PortalState = portalMode ? 'portal' : 'live';

  const handleCycle = () => {
    if (currentState === 'portal') {
      togglePortalMode();
      emit('portal_mode_changed', { active: false, meeting: false });
    } else {
      togglePortalMode();
      emit('portal_mode_changed', { active: true, meeting: false });
    }
  };

  const stateConfig: Record<PortalState, { label: string; icon: React.ReactNode; styles: string; dot: string; title: string }> = {
    portal: {
      label: 'PORTAL',
      icon: <Radio size={compact ? 12 : 14} className="text-green-400" />,
      styles: compact
        ? 'bg-green-500/15 border border-green-500/40 text-green-400'
        : 'bg-green-500/15 border border-green-500/40 text-green-400 shadow-lg shadow-green-500/10',
      dot: 'bg-green-400',
      title: 'Portal Mode — Campus live feed. Click for LIVE',
    },
    live: {
      label: 'LIVE',
      icon: <Wifi size={compact ? 12 : 14} className="text-cyan-400 animate-pulse" />,
      styles: compact
        ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400'
        : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10',
      dot: 'bg-cyan-400 animate-pulse',
      title: 'LIVE — Ready for all. Click for PORTAL',
    },
  };

  const config = stateConfig[currentState];

  if (compact) {
    return (
      <button
        onClick={handleCycle}
        className={`flex items-center justify-center gap-1.5 w-7 h-7 sm:w-9 sm:h-9 rounded-lg text-xs font-semibold transition-all duration-200 ${config.styles}`}
        title={config.title}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} hidden sm:block`} />
      </button>
    );
  }

  return (
    <button
      onClick={handleCycle}
      className={`flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${config.styles}`}
      title={config.title}
    >
      {config.icon}
      <span>{config.label}</span>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
    </button>
  );
}
