import { Mic, MicOff } from 'lucide-react';

interface TalkButtonProps {
  target: 'paete' | 'pagsanjan' | 'both';
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function TalkButton({ target, isActive, onClick, disabled, compact }: TalkButtonProps) {
  const labels = {
    paete: 'Paete',
    pagsanjan: 'Pagsanjan',
    both: 'Both',
  };

  const shortLabels = {
    paete: 'PAE',
    pagsanjan: 'PAG',
    both: 'BTH',
  };

  const activeStyles = {
    paete: 'bg-blue-500 border border-blue-400 text-white shadow-lg shadow-blue-500/30',
    pagsanjan: 'bg-purple-500 border border-purple-400 text-white shadow-lg shadow-purple-500/30',
    both: 'bg-orange-500 border border-orange-400 text-white shadow-lg shadow-orange-500/30',
  };

  const inactiveStyles = {
    paete: 'bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30',
    pagsanjan: 'bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30',
    both: 'bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30',
  };

  const activeIconColor = {
    paete: 'text-white',
    pagsanjan: 'text-white',
    both: 'text-white',
  };

  const inactiveIconColor = {
    paete: 'text-blue-400',
    pagsanjan: 'text-purple-400',
    both: 'text-orange-400',
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg transition-all duration-200 ${
          disabled
            ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
            : isActive
              ? activeStyles[target]
              : inactiveStyles[target]
        }`}
        title={disabled ? 'Disabled during Live Portal' : labels[target]}
      >
        {isActive ? (
          <Mic size={12} className={`sm:w-3.5 sm:h-3.5 ${activeIconColor[target]}`} />
        ) : (
          <MicOff size={12} className={`sm:w-3.5 sm:h-3.5 ${inactiveIconColor[target]}`} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        disabled
          ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
          : isActive
            ? activeStyles[target]
            : inactiveStyles[target]
      }`}
      title={disabled ? 'Disabled during Live Portal' : undefined}
    >
      {isActive ? (
        <Mic size={13} className={activeIconColor[target]} />
      ) : (
        <MicOff size={13} className={inactiveIconColor[target]} />
      )}
      <span className="hidden sm:inline">{labels[target]}</span>
      <span className="sm:hidden">{shortLabels[target]}</span>
    </button>
  );
}
