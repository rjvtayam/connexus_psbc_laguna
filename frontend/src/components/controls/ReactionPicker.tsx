import { useState } from 'react';
import { Smile } from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '😮', '😢', '🔥'];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionPicker({ onReact, disabled }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg transition-all duration-200 ${
          disabled
            ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
            : isOpen
              ? 'bg-primary-500/20 border border-primary-500/40 text-primary-400'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
        }`}
        title="Send reaction"
        data-demo="btn-reaction"
      >
        <Smile size={13} className="sm:w-3.5 sm:h-3.5" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setIsOpen(false)} />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-1 bg-gray-800 border border-gray-600/60 rounded-2xl p-2 shadow-2xl z-[100] animate-slide-up">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-700 transition-all text-xl hover:scale-125 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
