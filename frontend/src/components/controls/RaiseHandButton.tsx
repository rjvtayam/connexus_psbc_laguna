import { Hand } from 'lucide-react';

interface RaiseHandButtonProps {
  isRaised: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function RaiseHandButton({ isRaised, onToggle, disabled }: RaiseHandButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg transition-all duration-200 ${
        disabled
          ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
          : isRaised
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 animate-badge-pulse'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
      }`}
      title={isRaised ? 'Lower hand' : 'Raise hand'}
      data-demo="btn-hand"
    >
      <Hand size={14} className={isRaised ? 'fill-amber-400' : ''} />
    </button>
  );
}
